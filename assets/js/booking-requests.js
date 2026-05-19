(function () {
  "use strict";

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function value(form, name) {
    const field = qs('[name="' + name + '"]', form);
    return field ? field.value.trim() : "";
  }

  function show(form, text, state) {
    const box = qs("[data-form-feedback]", form) || qs("#booking-message");
    if (!box) return;
    box.hidden = false;
    box.textContent = text;
    box.dataset.state = state || "info";
  }

  function client() {
    return window.djHubSupabase || null;
  }

  function configured() {
    return Boolean(window.djHubSupabaseConfig && window.djHubSupabaseConfig.isConfigured && client());
  }

  async function resolveSelectedArtist(form) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("dj");
    if (!id) return null;

    const hidden = qs("#selected-dj-input", form);
    if (hidden) hidden.value = id;

    if (window.djHubArtists && window.djHubArtists.getApprovedArtistById) {
      return window.djHubArtists.getApprovedArtistById(id);
    }

    return null;
  }

  async function renderSelectedArtist(form) {
    const box = qs("#selected-dj-box");
    if (!box || !form) return null;

    const artist = await resolveSelectedArtist(form);
    if (!artist) return null;

    box.hidden = false;
    box.innerHTML = '<strong>DJ demandé :</strong> ' + artist.name + ' · ' + artist.city;
    return artist;
  }

  function buildPayload(form, artistId) {
    return {
      artist_profile_id: artistId || null,
      client_name: value(form, "client_name"),
      client_email: value(form, "client_email"),
      client_phone: value(form, "client_phone"),
      requester_type: value(form, "requester_type"),
      city: value(form, "city"),
      event_date: value(form, "event_date"),
      start_time: value(form, "start_time") || null,
      duration: value(form, "duration"),
      event_type: value(form, "event_type"),
      venue_type: value(form, "venue_type"),
      guests: value(form, "guests") ? Number(value(form, "guests")) : null,
      music_style: value(form, "music_style"),
      budget: value(form, "budget"),
      sound_system: value(form, "sound_system"),
      lights_needed: value(form, "lights_needed"),
      material_needed: value(form, "material_needed"),
      message: value(form, "message"),
      status: "new"
    };
  }

  async function saveBookingRequest(form, artistId) {
    if (!configured()) return { skipped: true };

    const { error } = await client()
      .from("booking_requests")
      .insert(buildPayload(form, artistId));

    if (error) throw error;
    return { saved: true };
  }

  function isPlaceholderAction(action) {
    return !action || action.indexOf("TON_FORM") !== -1;
  }

  async function initBookingForm() {
    const form = qs("#client-request-form");
    if (!form) return;

    const artist = await renderSelectedArtist(form);
    const artistId = artist ? artist.id : new URLSearchParams(window.location.search).get("dj");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      show(form, "Envoi de votre demande...", "info");

      try {
        await saveBookingRequest(form, artistId);
      } catch (error) {
        console.warn("[DJ-hub] Demande non enregistrée dans Supabase.", error.message);
      }

      const action = form.getAttribute("action") || "";
      if (isPlaceholderAction(action)) {
        show(form, "Demande prête. Remplacez le lien Formspree pour recevoir les emails, et configurez Supabase pour enregistrer en base.", "success");
        return;
      }

      form.submit();
    });
  }

  window.djHubBookingRequests = {
    saveBookingRequest: saveBookingRequest
  };

  document.addEventListener("DOMContentLoaded", initBookingForm);
})();
