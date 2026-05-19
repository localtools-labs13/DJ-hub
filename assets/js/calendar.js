(function () {
  "use strict";

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function client() {
    return window.djHubSupabase || null;
  }

  function show(text, state) {
    const box = qs("#calendar-message");
    if (!box) return;
    box.hidden = false;
    box.textContent = text;
    box.dataset.state = state || "info";
  }

  function statusColor(status) {
    return {
      available: "#55f2bb",
      option: "#18d8ff",
      busy: "#e946ff"
    }[status] || "#8b5cf6";
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

  async function loadEvents(profileId) {
    const { data, error } = await client()
      .from("artist_availability")
      .select("*")
      .eq("artist_profile_id", profileId)
      .order("start_at", { ascending: true });

    if (error) throw error;
    return (data || []).map(function (row) {
      return {
        id: row.id,
        title: row.status === "available" ? "Disponible" : row.status === "option" ? "Option" : "Occupé",
        start: row.start_at,
        end: row.end_at,
        backgroundColor: statusColor(row.status),
        borderColor: statusColor(row.status),
        textColor: "#03040a",
        extendedProps: row
      };
    });
  }

  function setDateInputs(dateStr) {
    if (!dateStr) return;
    const startDate = qs("#availability-start-date");
    const endDate = qs("#availability-end-date");
    const startTime = qs("#availability-start-time");
    const endTime = qs("#availability-end-time");
    if (startDate) startDate.value = dateStr.slice(0, 10);
    if (endDate) endDate.value = dateStr.slice(0, 10);
    if (startTime && !startTime.value) startTime.value = "20:00";
    if (endTime && !endTime.value) endTime.value = "23:59";
  }

  function fillFormFromEvent(info) {
    const row = info.event.extendedProps || {};
    const start = info.event.start;
    const end = info.event.end || info.event.start;
    qs("#availability-id").value = info.event.id;
    qs("#availability-start-date").value = start.toISOString().slice(0, 10);
    qs("#availability-start-time").value = start.toTimeString().slice(0, 5);
    qs("#availability-end-date").value = end.toISOString().slice(0, 10);
    qs("#availability-end-time").value = end.toTimeString().slice(0, 5);
    qs("#availability-status").value = row.status || "available";
    qs("#availability-note").value = row.note || "";
    const del = qs("#availability-delete");
    if (del) del.hidden = false;
  }

  async function init() {
    const calendarEl = qs("#artist-calendar");
    const form = qs("#availability-form");
    if (!calendarEl || !form) return;

    if (!window.djHubSupabaseConfig || !window.djHubSupabaseConfig.isConfigured || !client()) {
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
        show("Votre profil doit être validé avant que vos disponibilités soient visibles publiquement. Vous pouvez déjà les préparer ici.", "warning");
      }
    } catch (error) {
      show(error.message || "Impossible de charger votre profil.", "error");
      return;
    }

    if (!window.FullCalendar) {
      show("FullCalendar n’est pas chargé. Vérifiez le CDN dans la page.", "error");
      return;
    }

    const calendar = new window.FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      locale: "fr",
      height: "auto",
      firstDay: 1,
      selectable: true,
      events: await loadEvents(profile.id),
      dateClick: function (info) {
        setDateInputs(info.dateStr);
        qs("#availability-id").value = "";
        const del = qs("#availability-delete");
        if (del) del.hidden = true;
      },
      eventClick: function (info) {
        fillFormFromEvent(info);
        show("Créneau chargé. Modifiez le formulaire puis enregistrez, ou supprimez-le.", "info");
      }
    });

    calendar.render();

    const deleteButton = qs("#availability-delete");
    if (deleteButton) {
      deleteButton.addEventListener("click", async function () {
        const id = qs("#availability-id").value;
        if (!id || !confirm("Supprimer cette disponibilité ?")) return;
        const { error } = await client().from("artist_availability").delete().eq("id", id);
        if (error) {
          show(error.message, "error");
          return;
        }
        const event = calendar.getEventById(id);
        if (event) event.remove();
        form.reset();
        qs("#availability-id").value = "";
        deleteButton.hidden = true;
        show("Disponibilité supprimée.", "success");
      });
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const start = qs("#availability-start-date").value + "T" + qs("#availability-start-time").value;
      const end = qs("#availability-end-date").value + "T" + qs("#availability-end-time").value;

      const payload = {
        artist_profile_id: profile.id,
        user_id: user.id,
        start_at: new Date(start).toISOString(),
        end_at: new Date(end).toISOString(),
        status: qs("#availability-status").value,
        note: qs("#availability-note").value.trim()
      };

      const currentId = qs("#availability-id").value;
      const request = currentId
        ? client().from("artist_availability").update(payload).eq("id", currentId).select().single()
        : client().from("artist_availability").insert(payload).select().single();

      const { data, error } = await request;

      if (error) {
        show(error.message, "error");
        return;
      }

      if (currentId) {
        const existingEvent = calendar.getEventById(currentId);
        if (existingEvent) existingEvent.remove();
      }

      calendar.addEvent({
        id: data.id,
        title: data.status === "available" ? "Disponible" : data.status === "option" ? "Option" : "Occupé",
        start: data.start_at,
        end: data.end_at,
        backgroundColor: statusColor(data.status),
        borderColor: statusColor(data.status),
        textColor: "#03040a",
        extendedProps: data
      });
      form.reset();
      qs("#availability-id").value = "";
      if (deleteButton) deleteButton.hidden = true;
      show("Disponibilité enregistrée.", "success");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
