interface MessageRequest {
  action: string;
}

interface MessageResponse {
  success?: boolean;
  error?: any;
  [key: string]: any;
}

interface ContentScriptResult {
  processApplication?: () => void;
  answerQuestionsOnPage?: () => void;
  userData?: any;
}

chrome.runtime.onMessage.addListener((
  request: MessageRequest,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
) => {
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
        target: { tabId: sender.tab!.id! },
        func: getContentScriptFunctions,
      })
      .then((results: chrome.scripting.InjectionResult<ContentScriptResult>[]) => {
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
        return true;
      })
      .catch((error: Error) => {
        console.error("Error executing content script:", error);
        sendResponse({ success: false, error: error.message });
        return false;
      });
    return true;
  }
  
  return false;
});

function getContentScriptFunctions(): ContentScriptResult {
  const result: ContentScriptResult = {};

  // Check for functions in the global scope of the content script
  const globalScope = (window as any);
  
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

const JOBS_URL_PREFIX: string = "https://www.linkedin.com/jobs/";



function updateActionState(tab: chrome.tabs.Tab): void {
  if (!tab || !tab.id || !tab.url) return;

  const hasEasyApply: boolean = tab.url.toLowerCase().includes('easy-apply');
  if (!hasEasyApply) {
    chrome.action.disable(tab.id);
    return;
  }
  chrome.action.enable(tab.id);
}

chrome.tabs.onUpdated.addListener((
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab
) => {
  if (changeInfo.status === "complete") {
    updateActionState(tab);
  }
});

chrome.tabs.onActivated.addListener((
  activeInfo: chrome.tabs.TabActiveInfo
) => {
  chrome.tabs.get(activeInfo.tabId, (tab: chrome.tabs.Tab) => updateActionState(tab));
});
