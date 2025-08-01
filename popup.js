document.addEventListener('DOMContentLoaded', () => {
  const applyBtn = document.getElementById('apply-btn');
  const statusDiv = document.getElementById('status');

  applyBtn.addEventListener('click', () => {
    statusDiv.textContent = 'Starting application...';
    applyBtn.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id && activeTab.url && activeTab.url.includes('linkedin.com/jobs')) {
        console.log(`Injecting script into tab: ${activeTab.id}`);
        statusDiv.textContent = 'Injecting script...';

        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['Content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Script injection failed:', chrome.runtime.lastError.message);
            statusDiv.textContent = 'Error: Injection failed.';
            applyBtn.disabled = false;
            return;
          }
          console.log('Script injected. Sending message.');
          statusDiv.textContent = 'Applying...';

          chrome.tabs.sendMessage(activeTab.id, { action: 'startApply' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Message failed:', chrome.runtime.lastError.message);
              statusDiv.textContent = 'Error: No response.';
            } else {
              console.log('Response:', response);
              statusDiv.textContent = response?.status || 'Process finished.';
            }
            applyBtn.disabled = false;
          });
        });
      } else {
        console.log('Not a valid LinkedIn job page.');
        statusDiv.textContent = 'Error: Not a valid LinkedIn job page.';
        applyBtn.disabled = false;
      }
    });
  });
});
