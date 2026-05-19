(function () {
  "use strict";

  const BUCKET = "artist-photos";
  const MAX_BYTES = 5 * 1024 * 1024;
  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

  let pendingPublicUrl = "";

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function client() {
    return window.djHubSupabase || null;
  }

  function configured() {
    return Boolean(window.djHubSupabaseConfig && window.djHubSupabaseConfig.isConfigured && client());
  }

  function showPhotoUploadStatus(message, type) {
    const box = qs("#photo-upload-message") || qs("#profile-message");
    if (!box) return;
    box.hidden = false;
    box.textContent = message;
    box.dataset.state = type || "info";
  }

  function extensionFromFile(file) {
    const ext = String(file && file.name ? file.name.split(".").pop() : "").toLowerCase();
    if (ACCEPTED_EXTENSIONS.indexOf(ext) !== -1) return ext;
    if (file && file.type === "image/png") return "png";
    if (file && file.type === "image/webp") return "webp";
    return "jpg";
  }

  function validateImageFile(file) {
    if (!file) {
      return { valid: false, message: "Choisissez une image JPG, PNG ou WebP." };
    }

    const ext = extensionFromFile(file);
    if (ACCEPTED_TYPES.indexOf(file.type) === -1 || ACCEPTED_EXTENSIONS.indexOf(ext) === -1) {
      return { valid: false, message: "Format non accepté. Ajoutez une image JPG, PNG ou WebP." };
    }

    if (file.size > MAX_BYTES) {
      return { valid: false, message: "Image trop lourde. Taille maximale : 5 Mo." };
    }

    return { valid: true, extension: ext };
  }

  function renderPhotoPreview(source) {
    const wrapper = qs("#photo-preview");
    const img = qs("#artist-photo-preview");
    if (!wrapper || !img || !source) return;
    wrapper.hidden = false;
    img.hidden = false;

    if (source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else {
      img.src = source;
    }
  }

  async function uploadArtistPhoto(file, userId) {
    if (!configured()) {
      throw new Error("Upload photo indisponible pour le moment. Vous pouvez ajouter un lien photo ou presskit.");
    }

    const validation = validateImageFile(file);
    if (!validation.valid) throw new Error(validation.message);

    const user = userId ? { id: userId } : await window.getCurrentUser();
    if (!user || !user.id) {
      window.location.href = "connexion.html";
      throw new Error("Connectez-vous pour importer une photo.");
    }

    const path = user.id + "/profile-photo-" + Date.now() + "." + validation.extension;
    const { error: uploadError } = await client()
      .storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      throw new Error("Upload photo indisponible pour le moment. Vous pouvez ajouter un lien photo ou presskit.");
    }

    const { data } = client().storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = data && data.publicUrl ? data.publicUrl : "";
    if (!publicUrl) {
      throw new Error("Photo envoyée, mais l’URL publique n’a pas pu être générée.");
    }

    pendingPublicUrl = publicUrl;
    const hidden = qs('[name="public_image_url"]');
    if (hidden) hidden.value = publicUrl;

    return publicUrl;
  }

  async function updateArtistProfilePhoto(publicUrl) {
    if (!configured()) return null;

    const user = await window.getCurrentUser();
    if (!user) {
      window.location.href = "connexion.html";
      return null;
    }

    const { data: profile, error: loadError } = await client()
      .from("artist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (loadError) throw loadError;
    if (!profile) return null;

    const { error: updateError } = await client()
      .from("artist_profiles")
      .update({ public_image_url: publicUrl, status: "pending" })
      .eq("id", profile.id);

    if (updateError) throw updateError;
    return profile.id;
  }

  function selectedFile() {
    const input = qs("#artist-photo-file");
    return input && input.files ? input.files[0] : null;
  }

  function initArtistPhotoUpload() {
    const input = qs("#artist-photo-file");
    const button = qs("#upload-artist-photo");
    if (!input) return;

    input.addEventListener("change", function () {
      const file = selectedFile();
      const validation = validateImageFile(file);
      if (!validation.valid) {
        showPhotoUploadStatus(validation.message, "error");
        return;
      }

      renderPhotoPreview(file);
      showPhotoUploadStatus("Aperçu prêt. Cliquez sur « Importer la photo » pour l’envoyer.", "info");
    });

    if (button) {
      button.addEventListener("click", async function () {
        const file = selectedFile();
        const validation = validateImageFile(file);
        if (!validation.valid) {
          showPhotoUploadStatus(validation.message, "error");
          return;
        }

        try {
          showPhotoUploadStatus("Upload de la photo...", "info");
          const publicUrl = await uploadArtistPhoto(file);
          await updateArtistProfilePhoto(publicUrl);
          renderPhotoPreview(publicUrl);
          showPhotoUploadStatus("Photo importée. Votre profil repasse en validation avant publication.", "success");
        } catch (error) {
          showPhotoUploadStatus(error.message || "Upload photo indisponible pour le moment. Vous pouvez ajouter un lien photo ou presskit.", "warning");
        }
      });
    }
  }

  window.djHubPhotoUpload = {
    initArtistPhotoUpload: initArtistPhotoUpload,
    validateImageFile: validateImageFile,
    renderPhotoPreview: renderPhotoPreview,
    uploadArtistPhoto: uploadArtistPhoto,
    updateArtistProfilePhoto: updateArtistProfilePhoto,
    showPhotoUploadStatus: showPhotoUploadStatus,
    getPendingPublicUrl: function () { return pendingPublicUrl; }
  };

  window.initArtistPhotoUpload = initArtistPhotoUpload;
  window.validateImageFile = validateImageFile;
  window.renderPhotoPreview = renderPhotoPreview;
  window.uploadArtistPhoto = uploadArtistPhoto;
  window.updateArtistProfilePhoto = updateArtistProfilePhoto;
  window.showPhotoUploadStatus = showPhotoUploadStatus;

  document.addEventListener("DOMContentLoaded", initArtistPhotoUpload);
})();
