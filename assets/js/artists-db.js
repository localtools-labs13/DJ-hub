(function () {
  "use strict";

  function client() {
    return window.djHubSupabase || null;
  }

  function configured() {
    return Boolean(window.djHubSupabaseConfig && window.djHubSupabaseConfig.isConfigured && client());
  }

  function normalizeArtist(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      name: row.artist_name || "DJ",
      slug: row.slug || "",
      city: row.city || "",
      styles: Array.isArray(row.styles) ? row.styles : [],
      priceFrom: row.price_from || 0,
      material: Boolean(row.material),
      bio: row.bio || "",
      experience: row.experience || "",
      zones: Array.isArray(row.zones) ? row.zones : [],
      eventTypes: Array.isArray(row.event_types) ? row.event_types : [],
      instagram: row.instagram || "",
      soundcloud: row.soundcloud || "",
      mixcloud: row.mixcloud || "",
      youtube: row.youtube || "",
      website: row.website || "",
      image: row.status === "approved" ? row.public_image_url || "" : "",
      photoCredit: row.photo_credit || "",
      photoNote: row.photo_note || "",
      status: row.status || "pending",
      available: "Disponibilités à confirmer",
      publicAvailability: [],
      hasPresskit: false
    };
  }

  function localArtists() {
    return (Array.isArray(window.ARTISTS) ? window.ARTISTS : []).map(function (artist) {
      return Object.assign({ status: "approved" }, artist);
    });
  }

  async function availableArtistIdsForDate(dateValue) {
    if (!configured() || !dateValue) return null;

    const start = new Date(dateValue + "T00:00:00");
    const end = new Date(dateValue + "T23:59:59");
    const { data, error } = await client()
      .from("artist_availability")
      .select("artist_profile_id")
      .in("status", ["available", "option"])
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString());

    if (error) {
      console.warn("[DJ-hub] Disponibilités non chargées.", error.message);
      return null;
    }

    return Array.from(new Set((data || []).map(function (row) { return row.artist_profile_id; })));
  }

  async function loadApprovedArtists(filters) {
    filters = filters || {};

    if (!configured()) return localArtists();

    let query = client()
      .from("artist_profiles")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (filters.city) query = query.ilike("city", "%" + filters.city + "%");
    if (filters.budget) query = query.lte("price_from", Number(filters.budget));

    const { data, error } = await query;
    if (error) {
      console.warn("[DJ-hub] Chargement des artistes impossible.", error.message);
      return localArtists();
    }

    let artists = (data || []).map(normalizeArtist).filter(Boolean);

    if (filters.date) {
      const ids = await availableArtistIdsForDate(filters.date);
      if (Array.isArray(ids)) {
        artists = artists.filter(function (artist) { return ids.indexOf(artist.id) !== -1; });
      }
    }

    return artists;
  }

  async function getApprovedArtistById(id) {
    if (!id) return null;
    if (!configured()) {
      return localArtists().find(function (artist) { return artist.id === id || artist.slug === id; }) || null;
    }

    const { data, error } = await client()
      .from("artist_profiles")
      .select("*")
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle();

    if (error) {
      console.warn("[DJ-hub] Profil artiste non chargé.", error.message);
      return null;
    }

    const artist = normalizeArtist(data);
    if (!artist) return null;

    const availability = await client()
      .from("artist_availability")
      .select("start_at,end_at,status")
      .eq("artist_profile_id", id)
      .in("status", ["available", "option"])
      .order("start_at", { ascending: true })
      .limit(6);

    if (!availability.error) {
      artist.publicAvailability = availability.data || [];
      if (artist.publicAvailability.length) {
        artist.available = artist.publicAvailability.length + " créneau(x) public(s) disponible(s) ou en option";
      }
    }

    const presskit = await client()
      .from("artist_presskits")
      .select("id")
      .eq("artist_profile_id", id)
      .limit(1);
    artist.hasPresskit = !presskit.error && Array.isArray(presskit.data) && presskit.data.length > 0;

    return artist;
  }

  window.djHubArtists = {
    isConfigured: configured,
    normalizeArtist: normalizeArtist,
    loadApprovedArtists: loadApprovedArtists,
    getApprovedArtistById: getApprovedArtistById
  };
})();
