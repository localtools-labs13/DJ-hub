(function () {
  "use strict";

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char];
    });
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

  function statusLabel(status) {
    return {
      available: "Disponible",
      option: "Option",
      busy: "Occupé"
    }[status] || "Disponible";
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateInputValue(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-");
  }

  function displayDateValue(dateOrIso) {
    const date = typeof dateOrIso === "string" ? new Date(dateOrIso + "T12:00:00") : dateOrIso;
    if (!date || Number.isNaN(date.getTime())) return "";
    return [
      pad(date.getDate()),
      pad(date.getMonth() + 1),
      date.getFullYear()
    ].join("/");
  }

  function parseDateValue(value) {
    const raw = String(value || "").trim();
    let match;
    let year;
    let month;
    let day;

    match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else {
      match = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
      if (!match) return "";
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
      if (year < 100) year += 2000;
    }

    const date = new Date(year, month - 1, day);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return "";
    }

    return dateInputValue(date);
  }

  function addDays(dateValue, days) {
    const date = new Date(dateValue + "T12:00:00");
    date.setDate(date.getDate() + days);
    return dateInputValue(date);
  }

  function formatDateTime(date) {
    if (!date) return "Date à confirmer";
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short"
    }) + " · " + date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function updateSelectedDateCard(dateValue) {
    const card = qs("#selected-date-card");
    if (!card || !dateValue) return;
    const date = new Date(dateValue + "T12:00:00");
    card.innerHTML = [
      "<span>Date choisie</span>",
      "<strong>" + date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) + "</strong>"
    ].join("");
  }

  let activePreset = "evening";

  const presets = {
    evening: { start: "20:00", end: "02:00", endOffset: 1 },
    apero: { start: "18:00", end: "22:00", endOffset: 0 },
    afternoon: { start: "14:00", end: "18:00", endOffset: 0 },
    day: { start: "10:00", end: "18:00", endOffset: 0 }
  };

  function selectedStartDate() {
    const field = qs("#availability-start-date");
    return field && field.value ? parseDateValue(field.value) || dateInputValue(new Date()) : dateInputValue(new Date());
  }

  function applyPreset(name) {
    activePreset = presets[name] ? name : "evening";
    const preset = presets[activePreset];
    const dateValue = selectedStartDate();
    qs("#availability-start-date").value = displayDateValue(dateValue);
    qs("#availability-end-date").value = displayDateValue(addDays(dateValue, preset.endOffset));
    qs("#availability-start-time").value = preset.start;
    qs("#availability-end-time").value = preset.end;
    updateSelectedDateCard(dateValue);
    Array.prototype.slice.call(document.querySelectorAll("[data-preset]")).forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.preset === activePreset);
    });
  }

  function setStatus(status) {
    const select = qs("#availability-status");
    if (select) select.value = status || "available";
    Array.prototype.slice.call(document.querySelectorAll("[data-status]")).forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.status === (status || "available"));
    });
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
    const dateValue = dateStr.slice(0, 10);
    if (startDate) startDate.value = displayDateValue(dateValue);
    if (endDate) endDate.value = displayDateValue(dateValue);
    if (startTime && !startTime.value) applyPreset(activePreset);
    else applyPreset(activePreset);
  }

  function fillFormFromEvent(info) {
    const row = info.event.extendedProps || {};
    const start = info.event.start;
    const end = info.event.end || info.event.start;
    qs("#availability-id").value = info.event.id;
    qs("#availability-start-date").value = displayDateValue(start);
    qs("#availability-start-time").value = start.toTimeString().slice(0, 5);
    qs("#availability-end-date").value = displayDateValue(end);
    qs("#availability-end-time").value = end.toTimeString().slice(0, 5);
    setStatus(row.status || "available");
    qs("#availability-note").value = row.note || "";
    updateSelectedDateCard(dateInputValue(start));
    const del = qs("#availability-delete");
    if (del) del.hidden = false;
  }

  function renderUpcoming(calendar) {
    const root = qs("#availability-upcoming-list");
    if (!root || !calendar) return;
    const now = new Date();
    const events = calendar.getEvents()
      .filter(function (event) { return event.start && event.start >= now; })
      .sort(function (a, b) { return a.start - b.start; })
      .slice(0, 8);

    if (!events.length) {
      root.innerHTML = '<div class="empty-mini">Aucun créneau à venir. Cliquez sur une date pour commencer.</div>';
      return;
    }

    root.innerHTML = events.map(function (event) {
      const status = event.extendedProps && event.extendedProps.status || "available";
      return [
        '<article class="availability-item">',
        '<div><strong>' + formatDateTime(event.start) + '</strong><span class="status-pill status-' + status.replace(/_/g, "-") + '">' + statusLabel(status) + '</span></div>',
        '<p>Fin : ' + formatDateTime(event.end || event.start) + '</p>',
        event.extendedProps && event.extendedProps.note ? '<small>' + esc(event.extendedProps.note) + '</small>' : '',
        '</article>'
      ].join("");
    }).join("");
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

    setDateInputs(dateInputValue(new Date()));
    setStatus("available");

    const loadedEvents = await loadEvents(profile.id);
    const calendar = new window.FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      locale: "fr",
      height: "auto",
      firstDay: 1,
      selectable: true,
      buttonText: {
        today: "Aujourd’hui",
        month: "Mois",
        week: "Semaine",
        day: "Jour"
      },
      eventTimeFormat: {
        hour: "2-digit",
        minute: "2-digit",
        meridiem: false
      },
      selectMirror: true,
      events: loadedEvents,
      select: function (info) {
        setDateInputs(info.startStr);
        qs("#availability-id").value = "";
        const del = qs("#availability-delete");
        if (del) del.hidden = true;
        show("Date sélectionnée. Choisissez un format puis enregistrez.", "info");
      },
      dateClick: function (info) {
        setDateInputs(info.dateStr);
        qs("#availability-id").value = "";
        const del = qs("#availability-delete");
        if (del) del.hidden = true;
        show("Date sélectionnée. Choisissez un format puis enregistrez.", "info");
      },
      eventClick: function (info) {
        fillFormFromEvent(info);
        show("Créneau chargé. Modifiez le formulaire puis enregistrez, ou supprimez-le.", "info");
      }
    });

    calendar.render();
    renderUpcoming(calendar);

    Array.prototype.slice.call(document.querySelectorAll("[data-preset]")).forEach(function (button) {
      button.addEventListener("click", function () {
        applyPreset(button.dataset.preset);
      });
    });

    Array.prototype.slice.call(document.querySelectorAll("[data-status]")).forEach(function (button) {
      button.addEventListener("click", function () {
        setStatus(button.dataset.status);
      });
    });

    const startDateInput = qs("#availability-start-date");
    if (startDateInput) {
      startDateInput.addEventListener("change", function () {
        const parsed = parseDateValue(startDateInput.value);
        if (!parsed) {
          show("Date invalide. Utilisez le format jj/mm/aaaa, par exemple 19/05/2026.", "error");
          return;
        }
        startDateInput.value = displayDateValue(parsed);
        applyPreset(activePreset);
      });
    }

    const endDateInput = qs("#availability-end-date");
    if (endDateInput) {
      endDateInput.addEventListener("change", function () {
        const parsed = parseDateValue(endDateInput.value);
        if (!parsed) {
          show("Date de fin invalide. Utilisez le format jj/mm/aaaa, par exemple 20/05/2026.", "error");
          return;
        }
        endDateInput.value = displayDateValue(parsed);
      });
    }

    const statusSelect = qs("#availability-status");
    if (statusSelect) {
      statusSelect.addEventListener("change", function () {
        setStatus(statusSelect.value);
      });
    }

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
        qs("#availability-id").value = "";
        qs("#availability-note").value = "";
        deleteButton.hidden = true;
        renderUpcoming(calendar);
        show("Disponibilité supprimée.", "success");
      });
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const startIso = parseDateValue(qs("#availability-start-date").value);
      const endIso = parseDateValue(qs("#availability-end-date").value);

      if (!startIso || !endIso) {
        show("Date invalide. Utilisez le format jj/mm/aaaa, par exemple 19/05/2026.", "error");
        return;
      }

      qs("#availability-start-date").value = displayDateValue(startIso);
      qs("#availability-end-date").value = displayDateValue(endIso);

      const start = startIso + "T" + qs("#availability-start-time").value;
      const end = endIso + "T" + qs("#availability-end-time").value;
      const startDate = new Date(start);
      const endDate = new Date(end);

      if (!qs("#availability-start-date").value || !qs("#availability-end-date").value || !qs("#availability-start-time").value || !qs("#availability-end-time").value) {
        show("Choisissez une date et des horaires avant d’enregistrer.", "error");
        return;
      }

      if (endDate <= startDate) {
        show("L’heure de fin doit être après l’heure de début. Pour une soirée qui finit après minuit, la date de fin doit être le lendemain.", "error");
        return;
      }

      const payload = {
        artist_profile_id: profile.id,
        user_id: user.id,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
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
      qs("#availability-id").value = "";
      qs("#availability-note").value = "";
      if (deleteButton) deleteButton.hidden = true;
      renderUpcoming(calendar);
      show("Disponibilité enregistrée.", "success");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
