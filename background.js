// Background script for handling message passing between BatchApply.js and Content.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processJobApplication") {
    // Forward the message to all content scripts in the same tab (including Content.js)
    if (sender.tab && sender.tab.id !== undefined) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "processJobApplication",
      });
    }
    // No async response needed
    return;
  }

  if (request.action === "executeContentScript") {
    // Execute the content script in the active tab
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

// Function to be executed in the content script context
function getContentScriptFunctions() {
  const result = {};

  // Check if processApplication exists
  if (typeof processApplication === "function") {
    result.processApplication = processApplication;
  }

  // Check if answerQuestionsOnPage exists
  if (typeof answerQuestionsOnPage === "function") {
    result.answerQuestionsOnPage = answerQuestionsOnPage;
  }

  // Include userData if it exists
  if (typeof userData !== "undefined") {
    result.userData = userData;
  }

  return result;
}
