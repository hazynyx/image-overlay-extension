// Listen for messages from popup to forward image data to content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === "setOverlayImage") {
    const mode = message.mode || "current";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabId = tabs[0] ? tabs[0].id : null;

      // Store image, mode, and the originating tab ID
      chrome.storage.local.set({
        overlayImage: message.dataUrl,
        overlayMode: mode,
        overlayTabId: activeTabId
      }, () => {
        if (mode === "all") {
          // Send to ALL tabs
          chrome.tabs.query({}, (allTabs) => {
            allTabs.forEach((tab) => {
              chrome.tabs.sendMessage(tab.id, {
                action: "showOverlay",
                dataUrl: message.dataUrl
              }).catch(() => {});
            });
            sendResponse({ success: true });
          });
        } else {
          // Send only to the active tab
          if (activeTabId) {
            chrome.tabs.sendMessage(activeTabId, {
              action: "showOverlay",
              dataUrl: message.dataUrl
            }).catch(() => {});
          }
          sendResponse({ success: true });
        }
      });
    });
    return true;
  }

  if (message.action === "setOverlayMode") {
    const mode = message.mode;
    chrome.storage.local.get(["overlayImage", "overlayTabId"], (data) => {
      if (!data.overlayImage) {
        sendResponse({ success: false });
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTabId = tabs[0] ? tabs[0].id : data.overlayTabId;

        chrome.storage.local.set({ overlayMode: mode, overlayTabId: activeTabId }, () => {
          if (mode === "all") {
            // Show on ALL tabs
            chrome.tabs.query({}, (allTabs) => {
              allTabs.forEach((tab) => {
                chrome.tabs.sendMessage(tab.id, {
                  action: "showOverlay",
                  dataUrl: data.overlayImage
                }).catch(() => {});
              });
              sendResponse({ success: true });
            });
          } else {
            // Remove from all tabs except the active one
            chrome.tabs.query({}, (allTabs) => {
              allTabs.forEach((tab) => {
                if (tab.id !== activeTabId) {
                  chrome.tabs.sendMessage(tab.id, { action: "removeOverlay" }).catch(() => {});
                }
              });
              sendResponse({ success: true });
            });
          }
        });
      });
    });
    return true;
  }

  if (message.action === "removeOverlayImage") {
    chrome.storage.local.get("overlayMode", (data) => {
      const mode = data.overlayMode || "current";

      chrome.storage.local.remove(["overlayImage", "overlayState", "overlayMode", "overlayTabId"], () => {
        if (mode === "all") {
          // Remove from ALL tabs
          chrome.tabs.query({}, (allTabs) => {
            allTabs.forEach((tab) => {
              chrome.tabs.sendMessage(tab.id, { action: "removeOverlay" }).catch(() => {});
            });
            sendResponse({ success: true });
          });
        } else {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, { action: "removeOverlay" }).catch(() => {});
            }
            sendResponse({ success: true });
          });
        }
      });
    });
    return true;
  }

  // Content script asks for its own tab ID
  if (message.action === "getMyTabId") {
    sendResponse({ tabId: sender.tab ? sender.tab.id : null });
    return false;
  }
});
