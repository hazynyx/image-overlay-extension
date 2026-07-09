// Listen for messages from popup to forward image data to content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "setOverlayImage") {
    // Store the image in chrome.storage.local
    chrome.storage.local.set({ overlayImage: message.dataUrl }, () => {
      // Send message to the active tab's content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "showOverlay",
            dataUrl: message.dataUrl
          }, (response) => {
            sendResponse({ success: true });
          });
        }
      });
    });
    return true; // keep channel open for async sendResponse
  }

  if (message.action === "removeOverlayImage") {
    chrome.storage.local.remove("overlayImage", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "removeOverlay" });
        }
      });
      sendResponse({ success: true });
    });
    return true;
  }
});
