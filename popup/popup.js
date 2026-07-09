const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const previewImage = document.getElementById("previewImage");
const fileName = document.getElementById("fileName");
const removeBtn = document.getElementById("removeBtn");
const applyBtn = document.getElementById("applyBtn");
const activeOverlay = document.getElementById("activeOverlay");
const removeOverlayBtn = document.getElementById("removeOverlayBtn");

let selectedDataUrl = null;

// ── Check if overlay is already active ──
chrome.storage.local.get("overlayImage", (data) => {
  if (data.overlayImage) {
    selectedDataUrl = data.overlayImage;
    showPreview(data.overlayImage, "Current overlay");
    applyBtn.classList.add("hidden");
    activeOverlay.classList.remove("hidden");
  }
});

// ── Drop Zone ──
dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    handleFile(file);
  }
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// ── File Handling ──
function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedDataUrl = e.target.result;
    showPreview(selectedDataUrl, file.name);
    applyBtn.classList.remove("hidden");
    activeOverlay.classList.add("hidden");
  };
  reader.readAsDataURL(file);
}

function showPreview(dataUrl, name) {
  previewImage.src = dataUrl;
  fileName.textContent = name;
  preview.classList.remove("hidden");
  dropZone.classList.add("hidden");
}

function resetUI() {
  selectedDataUrl = null;
  preview.classList.add("hidden");
  applyBtn.classList.add("hidden");
  activeOverlay.classList.add("hidden");
  dropZone.classList.remove("hidden");
  fileInput.value = "";
}

// ── Remove preview ──
removeBtn.addEventListener("click", () => {
  resetUI();
});

// ── Apply Overlay ──
applyBtn.addEventListener("click", () => {
  if (!selectedDataUrl) return;

  applyBtn.disabled = true;
  applyBtn.textContent = "Applying…";

  chrome.runtime.sendMessage(
    { action: "setOverlayImage", dataUrl: selectedDataUrl },
    () => {
      applyBtn.disabled = false;
      applyBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        Apply Overlay
      `;
      applyBtn.classList.add("hidden");
      activeOverlay.classList.remove("hidden");
    }
  );
});

// ── Remove Overlay ──
removeOverlayBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "removeOverlayImage" }, () => {
    resetUI();
  });
});
