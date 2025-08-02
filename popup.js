document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const batchApplyBtn = document.getElementById('batch-apply-btn');
  const applyBtn = document.getElementById('apply-btn');
  
  // Disable buttons initially
  batchApplyBtn.disabled = true;
  applyBtn.disabled = true;
  
  // Check if we're on a LinkedIn jobs page
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    
    if (!tab || !tab.url || !tab.url.includes('linkedin.com/jobs')) {
      statusDiv.textContent = 'Please open a LinkedIn jobs page first.';
      statusDiv.style.color = 'red';
      return;
    }
    
    // Enable buttons if on a LinkedIn jobs page
    batchApplyBtn.disabled = false;
    applyBtn.disabled = false;
    
    // Handle Batch Apply button click
    batchApplyBtn.addEventListener('click', async () => {
      statusDiv.textContent = 'Starting batch apply to all jobs...';
      statusDiv.style.color = 'inherit';
      
      try {
        // First, inject Content.js if not already injected
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['Content.js']
        });
        
        // Then inject BatchApply.js
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['BatchApply.js']
        });
        
        // Wait a moment for the scripts to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Send message to start batch apply
        const response = await chrome.tabs.sendMessage(tab.id, { 
          action: 'startBatchApply' 
        }).catch(error => {
          console.error('Message sending failed, retrying...', error);
          // Try one more time after a delay
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
    
    // Handle single job apply button click
    applyBtn.addEventListener('click', async () => {
      statusDiv.textContent = 'Starting single job application...';
      statusDiv.style.color = 'inherit';
      
      try {
        // Inject Content.js for single job application
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['Content.js']
        });
        
        // Send message to start single job apply
        await chrome.tabs.sendMessage(tab.id, { action: 'startApply' });
        
        // Close popup after a short delay
        setTimeout(() => window.close(), 500);
      } catch (error) {
        console.error('Error:', error);
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.style.color = 'red';
      }
    });
  });
});
