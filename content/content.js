(() => {
  // Prevent double-injection
  if (document.getElementById("img-overlay-ext-container")) return;

  let container = null;
  let state = {
    x: 100,
    y: 100,
    width: 300,
    height: 300,
    opacity: 1,
    locked: false,
    pinToolbar: false,
  };

  // ── Listen for messages ──
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "showOverlay") {
      createOverlay(message.dataUrl);
      sendResponse({ success: true });
    }
    if (message.action === "removeOverlay") {
      removeOverlay();
      sendResponse({ success: true });
    }
  });

  // ── Restore overlay if image exists in storage ──
  chrome.storage.local.get(["overlayImage", "overlayState", "overlayMode", "overlayTabId"], (data) => {
    if (!data.overlayImage) return;

    const mode = data.overlayMode || "current";

    if (mode === "all") {
      // Show on all tabs
      if (data.overlayState) Object.assign(state, data.overlayState);
      createOverlay(data.overlayImage);
    } else {
      // Only show on the specific tab — ask background for our tab ID
      chrome.runtime.sendMessage({ action: "getMyTabId" }, (response) => {
        if (response && response.tabId === data.overlayTabId) {
          if (data.overlayState) Object.assign(state, data.overlayState);
          createOverlay(data.overlayImage);
        }
      });
    }
  });

  // ── Create the overlay ──
  function createOverlay(dataUrl) {
    removeOverlay(); // clean up previous if any

    container = document.createElement("div");
    container.id = "img-overlay-ext-container";
    applyPosition();

    // Image
    const img = document.createElement("img");
    img.id = "img-overlay-ext-image";
    img.src = dataUrl;
    img.draggable = false;
    container.appendChild(img);

    // Resize handles
    ["nw", "ne", "sw", "se"].forEach((dir) => {
      const handle = document.createElement("div");
      handle.className = `io-resize-handle io-resize-handle-${dir}`;
      handle.dataset.dir = dir;
      handle.addEventListener("mousedown", onResizeStart);
      container.appendChild(handle);
    });

    // Toolbar
    const toolbar = createToolbar();
    container.appendChild(toolbar);

    // Drag — only from the image itself
    img.addEventListener("mousedown", onDragStart);

    // ── Toolbar visibility (JS-based with delay) ──
    let hideTimeout = null;

    function showToolbar() {
      clearTimeout(hideTimeout);
      toolbar.classList.add("io-visible");
    }

    function hideToolbar() {
      hideTimeout = setTimeout(() => {
        toolbar.classList.remove("io-visible");
      }, 300);
    }

    container.addEventListener("mouseenter", showToolbar);
    container.addEventListener("mouseleave", hideToolbar);
    toolbar.addEventListener("mouseenter", showToolbar);
    toolbar.addEventListener("mouseleave", hideToolbar);

    document.documentElement.appendChild(container);
  }

  // ── Toolbar ──
  function createToolbar() {
    const tb = document.createElement("div");
    tb.id = "img-overlay-ext-toolbar";

    // Opacity
    const opLabel = el("span", "io-toolbar-label", "Op");
    const opSlider = document.createElement("input");
    opSlider.type = "range";
    opSlider.className = "io-slider";
    opSlider.min = "0";
    opSlider.max = "100";
    opSlider.value = String(Math.round(state.opacity * 100));
    opSlider.addEventListener("input", (e) => {
      state.opacity = parseInt(e.target.value) / 100;
      container.style.opacity = state.opacity;
      saveState();
    });

    // Dividers
    const div1 = el("div", "io-divider");
    const div2 = el("div", "io-divider");

    // Pin button
    const pinBtn = document.createElement("button");
    pinBtn.id = "img-overlay-ext-pin";
    pinBtn.title = "Pin toolbar";
    pinBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.89A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.89A2 2 0 005 15.24V17z"/></svg>`;
    if (state.pinToolbar) {
      pinBtn.classList.add("io-active");
      tb.classList.add("io-pinned");
    }
    pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.pinToolbar = !state.pinToolbar;
      pinBtn.classList.toggle("io-active", state.pinToolbar);
      tb.classList.toggle("io-pinned", state.pinToolbar);
      saveState();
    });

    // Lock button
    const lockBtn = document.createElement("button");
    lockBtn.id = "img-overlay-ext-lock";
    lockBtn.title = "Lock position";
    lockBtn.innerHTML = state.locked
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>`;
    if (state.locked) lockBtn.classList.add("io-active");
    lockBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.locked = !state.locked;
      lockBtn.classList.toggle("io-active", state.locked);
      lockBtn.innerHTML = state.locked
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>`;
      lockBtn.title = state.locked ? "Unlock position" : "Lock position";
      saveState();
    });

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.id = "img-overlay-ext-close";
    closeBtn.title = "Remove overlay";
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.storage.local.remove(["overlayImage", "overlayState"]);
      removeOverlay();
    });

    tb.append(opLabel, opSlider, div1, pinBtn, lockBtn, div2, closeBtn);
    return tb;
  }

  // ── Drag ──
  function onDragStart(e) {
    if (state.locked) return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = state.x;
    const origY = state.y;

    function onMove(e) {
      state.x = origX + (e.clientX - startX);
      state.y = origY + (e.clientY - startY);
      applyPosition();
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", onUp, true);
      saveState();
    }

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup", onUp, true);
  }

  // ── Resize ──
  function onResizeStart(e) {
    if (state.locked) return;
    e.preventDefault();
    e.stopPropagation();

    const dir = e.target.dataset.dir;
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = state.width;
    const origH = state.height;
    const origX = state.x;
    const origY = state.y;
    const aspect = origW / origH;

    function onMove(e) {
      let dx = e.clientX - startX;
      let dy = e.clientY - startY;

      let newW = origW;
      let newH = origH;
      let newX = origX;
      let newY = origY;

      if (dir === "se") {
        newW = Math.max(30, origW + dx);
        newH = Math.round(newW / aspect);
      } else if (dir === "sw") {
        newW = Math.max(30, origW - dx);
        newH = Math.round(newW / aspect);
        newX = origX + (origW - newW);
      } else if (dir === "ne") {
        newW = Math.max(30, origW + dx);
        newH = Math.round(newW / aspect);
        newY = origY + (origH - newH);
      } else if (dir === "nw") {
        newW = Math.max(30, origW - dx);
        newH = Math.round(newW / aspect);
        newX = origX + (origW - newW);
        newY = origY + (origH - newH);
      }

      state.width = newW;
      state.height = newH;
      state.x = newX;
      state.y = newY;
      applyPosition();

      // sync size slider
      const szSlider = document.getElementById('img-overlay-ext-sz-slider');
      if (szSlider) szSlider.value = String(newW);
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", onUp, true);
      saveState();
    }

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup", onUp, true);
  }

  // ── Helpers ──
  function applyPosition() {
    if (!container) return;
    container.style.cssText = `
      left: ${state.x}px !important;
      top: ${state.y}px !important;
      width: ${state.width}px !important;
      height: ${state.height}px !important;
      opacity: ${state.opacity} !important;
    `;
  }

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text) e.textContent = text;
    return e;
  }

  function saveState() {
    chrome.storage.local.set({ overlayState: state });
  }

  function removeOverlay() {
    if (container) {
      container.remove();
      container = null;
    }
  }
})();
