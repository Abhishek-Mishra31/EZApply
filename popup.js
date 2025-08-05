document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const batchApplyBtn = document.getElementById('batch-apply-btn');

  batchApplyBtn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];

    // 1. Must be on LinkedIn Jobs page
    if (!tab || !tab.url || !tab.url.startsWith('https://www.linkedin.com/jobs')) {
      statusDiv.textContent = 'Please open a LinkedIn jobs page first.';
      statusDiv.style.color = 'red';
      return;
    }

    // 2. Extension icon is only enabled when URL contains 'easy-apply'
    //    (handled by background script), so we can safely enable the button
    batchApplyBtn.disabled = false;

    batchApplyBtn.addEventListener('click', async () => {
      statusDiv.textContent = 'Starting batch apply to all jobs...';
      statusDiv.style.color = 'inherit';

      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['Content.js'] });
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['BatchApply.js'] });

        await new Promise(r => setTimeout(r, 500));

        const resp = await chrome.tabs.sendMessage(tab.id, { action: 'startBatchApply' });
        if (resp && resp.success) {
          statusDiv.textContent = 'Batch apply started successfully!';
          setTimeout(() => window.close(), 1000);
        } else {
          throw new Error('Failed to start batch apply.');
        }
      } catch (error) {
        console.error(error);
        statusDiv.textContent = `Error: ${error.message}. Please refresh the page and try again.`;
        statusDiv.style.color = 'red';
      }
    });
  });
});
