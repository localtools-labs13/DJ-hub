(function () {
  "use strict";

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function client() {
    return window.djHubSupabase || null;
  }

  function configured() {
    return Boolean(window.djHubSupabaseConfig && window.djHubSupabaseConfig.isConfigured && client());
  }

  function show(text, state) {
    const box = qs("#calendar-message");
    if (!box) return;
    box.hidden = false;
    box.textContent = text;
    box.dataset.state = state || "info";
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateKey(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-");
  }

  function addDays(dateValue, days) {
    const date = new Date(dateValue + "T12:00:00");
    date.setDate(date.getDate() + days);
    return dateKey(date);
  }

  function dayStartIso(dateValue) {
    return new Date(dateValue + "T00:00:00").toISOString();
  }

  function dayEndIso(dateValue) {
    return new Date(addDays(dateValue, 1) + "T00:00:00").toISOString();
  }

  function eventTitle() {
    return "Disponible";
  }

  function availableEvent(row) {
    const start = new Date(row.start_at);
    const startKey = dateKey(start);
    return {
      id: row.id,
      title: eventTitle(),
      start: startKey,
      end: addDays(startKey, 1),
      allDay: true,
      display: "block",
      backgroundColor: "#55f2bb",
      borderColor: "#55f2bb",
      textColor: "#03040a",
      classNames: ["availability-day-event"],
      extendedProps: {
        status: "available",
        row: row
      }
    };
  }

  async function ownProfile(userId) {
    const { data, error } = await client()
      .from("artist_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function profileById(id) {
    const { data, error } = await client()
      .from("artist_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function loadAvailability(profileId) {
    const { data, error } = await client()
      .from("artist_availability")
      .select("*")
      .eq("artist_profile_id", profileId)
      .eq("status", "available")
      .order("start_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  function findEventByDay(calendar, dateValue) {
    return calendar.getEvents().find(function (event) {
      return dateKey(event.start) === dateValue;
    }) || null;
  }

  function updateCount(calendar) {
    const target = qs("#availability-count");
    if (!target || !calendar) return;
    const count = calendar.getEvents().length;
    target.textContent = count + " jour" + (count > 1 ? "s" : "") + " disponible" + (count > 1 ? "s" : "");
  }

  async function markAvailable(calendar, profile, user, dateValue) {
    const { data, error } = await client()
      .from("artist_availability")
      .insert({
        artist_profile_id: profile.id,
        user_id: user.id,
        start_at: dayStartIso(dateValue),
        end_at: dayEndIso(dateValue),
        status: "available",
        note: "Disponibilité journée complète"
      })
      .select()
      .single();

    if (error) throw error;

    calendar.addEvent(availableEvent(data));
    updateCount(calendar);
    show("Jour marqué disponible.", "success");
  }

  async function unmarkAvailable(calendar, event) {
    const { error } = await client()
      .from("artist_availability")
      .delete()
      .eq("id", event.id);

    if (error) throw error;

    event.remove();
    updateCount(calendar);
    show("Disponibilité retirée.", "success");
  }

  async function toggleDay(calendar, profile, user, dateValue) {
    const existing = findEventByDay(calendar, dateValue);
    if (existing) {
      await unmarkAvailable(calendar, existing);
      return;
    }

    await markAvailable(calendar, profile, user, dateValue);
  }

  async function init() {
    const calendarEl = qs("#artist-calendar");
    if (!calendarEl) return;

    if (!configured()) {
      show("Supabase n’est pas encore configuré. Le calendrier sera actif après connexion du projet.", "warning");
      return;
    }

    const roleProfile = await window.requireRole("artist", "connexion.html");
    if (!roleProfile) return;

    const user = await window.getCurrentUser();
    let profile;

    try {
      const adminTarget = roleProfile.role === "admin" ? new URLSearchParams(window.location.search).get("artist") : "";
      profile = adminTarget ? await profileById(adminTarget) : await ownProfile(user.id);
      if (!profile) {
        show("Complétez d’abord votre questionnaire artiste pour préparer vos disponibilités.", "warning");
        return;
      }
      if (profile.status !== "approved") {
        show("Votre profil doit être validé avant que vos disponibilités soient visibles publiquement. Vous pouvez déjà préparer vos jours disponibles.", "warning");
      }
    } catch (error) {
      show(error.message || "Impossible de charger votre profil.", "error");
      return;
    }

    if (!window.FullCalendar) {
      show("FullCalendar n’est pas chargé. Vérifiez le CDN dans la page.", "error");
      return;
    }

    let rows = [];
    try {
      rows = await loadAvailability(profile.id);
    } catch (error) {
      show(error.message || "Impossible de charger vos disponibilités.", "error");
      return;
    }

    const calendar = new window.FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      locale: "fr",
      height: "auto",
      firstDay: 1,
      selectable: false,
      fixedWeekCount: false,
      dayMaxEvents: 3,
      buttonText: {
        today: "Aujourd’hui",
        month: "Mois",
        week: "Semaine",
        day: "Jour"
      },
      events: rows.map(availableEvent),
      dateClick: async function (info) {
        try {
          await toggleDay(calendar, profile, user, info.dateStr);
        } catch (error) {
          show(error.message || "Impossible de modifier cette disponibilité.", "error");
        }
      },
      eventClick: async function (info) {
        info.jsEvent.preventDefault();
        try {
          await unmarkAvailable(calendar, info.event);
        } catch (error) {
          show(error.message || "Impossible de retirer cette disponibilité.", "error");
        }
      }
    });

    calendar.render();
    updateCount(calendar);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
