
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processJobApplication") {
    if (sender.tab && sender.tab.id !== undefined) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "processJobApplication",
      });
    }
    return;
  }

  if (request.action === "executeContentScript") {
    chrome.scripting
      .executeScript({
        target: { tabId: sender.tab.id },
        function: getContentScriptFunctions,
      })
      .then((results) => {
        if (chrome.runtime.lastError || !results || results.length === 0) {
          console.error(
            "Failed to execute content script:",
            chrome.runtime.lastError
          );
          sendResponse({ success: false, error: chrome.runtime.lastError });
        } else {
          sendResponse({
            success: true,
            ...results[0].result,
          });
        }
      })
      .catch((error) => {
        console.error("Error executing content script:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

function getContentScriptFunctions() {
  const result = {};

  if (typeof processApplication === "function") {
    result.processApplication = processApplication;
  }

  if (typeof answerQuestionsOnPage === "function") {
    result.answerQuestionsOnPage = answerQuestionsOnPage;
  }

  if (typeof userData !== "undefined") {
    result.userData = userData;
  }

  return result;
}

const JOBS_URL_PREFIX = "https://www.linkedin.com/jobs/";

function updateActionState(tab) {
  if (!tab || !tab.id || !tab.url) return;

  const hasEasyApply = tab.url.toLowerCase().includes('easy-apply');
  if (!hasEasyApply) {
    chrome.action.disable(tab.id);
    return;
  }
  chrome.action.enable(tab.id);
}


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    updateActionState(tab);
  }
});


chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => updateActionState(tab));
});
