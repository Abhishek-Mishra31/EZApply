document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const batchApplyBtn = document.getElementById('batch-apply-btn');
  const applyBtn = document.getElementById('apply-btn');
  
  batchApplyBtn.disabled = true;
  applyBtn.disabled = true;
  
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    
    if (!tab || !tab.url || !tab.url.includes('linkedin.com/jobs')) {
      statusDiv.textContent = 'Please open a LinkedIn jobs page first.';
      statusDiv.style.color = 'red';
      return;
    }
    
    batchApplyBtn.disabled = false;
    applyBtn.disabled = false;
    
    batchApplyBtn.addEventListener('click', async () => {
      statusDiv.textContent = 'Starting batch apply to all jobs...';
      statusDiv.style.color = 'inherit';
      
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['Content.js']
        });
        
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['BatchApply.js']
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const response = await chrome.tabs.sendMessage(tab.id, { 
          action: 'startBatchApply' 
        }).catch(error => {
          console.error('Message sending failed, retrying...', error);
          return new Promise(resolve => {
            setTimeout(async () => {
              try {
                const retryResponse = await chrome.tabs.sendMessage(tab.id, { 
                  action: 'startBatchApply' 
                });
                resolve(retryResponse);
              } catch (retryError) {
                console.error('Retry failed:', retryError);
                resolve(null);
              }
            }, 1000);
          });
        });
        
        if (response && response.success) {
          statusDiv.textContent = 'Batch apply started successfully!';
          setTimeout(() => window.close(), 1000);
        } else {
          throw new Error('Failed to start batch apply. Please try again.');
        }
      } catch (error) {
        console.error('Error:', error);
        statusDiv.textContent = `Error: ${error.message}. Please refresh the page and try again.`;
        statusDiv.style.color = 'red';
      }
    });
    
    applyBtn.addEventListener('click', async () => {
      statusDiv.textContent = 'Starting single job application...';
      statusDiv.style.color = 'inherit';
      
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['Content.js']
        });
        
        await chrome.tabs.sendMessage(tab.id, { action: 'startApply' });
        
        setTimeout(() => window.close(), 500);
      } catch (error) {
        console.error('Error:', error);
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.style.color = 'red';
      }
    });
  });
});
