"use strict";
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "processJobApplication") {
        if (sender.tab && sender.tab.id !== undefined) {
            chrome.tabs.sendMessage(sender.tab.id, {
                action: "processJobApplication",
            });
        }
        return false;
    }
    if (request.action === "executeContentScript") {
        chrome.scripting
            .executeScript({
            target: { tabId: sender.tab.id },
            func: getContentScriptFunctions,
        })
            .then((results) => {
            if (chrome.runtime.lastError || !results || results.length === 0) {
                console.error("Failed to execute content script:", chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError });
            }
            else {
                sendResponse(Object.assign({ success: true }, results[0].result));
            }
            return true;
        })
            .catch((error) => {
            console.error("Error executing content script:", error);
            sendResponse({ success: false, error: error.message });
            return false;
        });
        return true;
    }
    return false;
});
function getContentScriptFunctions() {
    const result = {};
    // Check for functions in the global scope of the content script
    const globalScope = window;
    if (typeof globalScope.processApplication === "function") {
        result.processApplication = globalScope.processApplication;
    }
    if (typeof globalScope.answerQuestionsOnPage === "function") {
        result.answerQuestionsOnPage = globalScope.answerQuestionsOnPage;
    }
    if (typeof globalScope.userData !== "undefined") {
        result.userData = globalScope.userData;
    }
    return result;
}
const JOBS_URL_PREFIX = "https://www.linkedin.com/jobs/";
function updateActionState(tab) {
    if (!tab || !tab.id || !tab.url)
        return;
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
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => updateActionState(tab));
});
//# sourceMappingURL=background.js.map