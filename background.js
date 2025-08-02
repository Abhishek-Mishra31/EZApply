// Background script for handling message passing between BatchApply.js and Content.js

// Listen for messages from the content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeContentScript') {
    // Execute the content script in the active tab
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      function: getContentScriptFunctions
    })
    .then((results) => {
      if (chrome.runtime.lastError || !results || results.length === 0) {
        console.error('Failed to execute content script:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        // Return the functions from the content script
        sendResponse({ 
          success: true,
          ...results[0].result
        });
      }
    })
    .catch(error => {
      console.error('Error executing content script:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

// Function to be executed in the content script context
function getContentScriptFunctions() {
  // This function runs in the context of the content script
  const result = {};
  
  // Check if processApplication exists
  if (typeof processApplication === 'function') {
    result.processApplication = processApplication;
  }
  
  // Check if answerQuestionsOnPage exists
  if (typeof answerQuestionsOnPage === 'function') {
    result.answerQuestionsOnPage = answerQuestionsOnPage;
  }
  
  // Include userData if it exists
  if (typeof userData !== 'undefined') {
    result.userData = userData;
  }
  
  return result;
}
