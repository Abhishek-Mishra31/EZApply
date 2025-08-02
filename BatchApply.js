(function () {
  "use strict";

  console.log("LinkedIn Batch Apply Extension loaded. Version: 6.0 (Job Navigation Only)");

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const config = {
    delayBetweenJobs: 300, 
    maxRetries: 2,
    jobCardSelector: '.job-card-container, li.jobs-search-results__list-item, li.scaffold-layout__list-item, li[data-occludable-job-id]',
    jobTitleSelector: '.job-card-container__link',
    jobDetailsPanel: '.jobs-search__right-rail, .jobs-search__job-details--wrapper',
    jobDetailsContent: '.jobs-details__main-content, .job-view-layout.jobs-details',
    easyApplyButtonSelector: [
      '#jobs-apply-button-id',
      'button[data-job-id]',
      'button[aria-label*="Easy Apply"]',
      'button[data-easy-apply="true"]',
      '.jobs-apply-button--top-card button',
      'button.jobs-apply-button',
      'button[data-tracking-control-name*="apply"]'
    ].join(','),
    applicationModalSelector: [
      '.jobs-easy-apply-modal',
      '.jobs-easy-apply-content',
      '.jobs-apply-form',
      '.jobs-dialog',
      '.artdeco-modal',
      '.jobs-application-form',
      '.jobs-unified-top-card__content--two-pane'
    ].join(','),
    appliedIndicator: [
      '.artdeco-inline-feedback__message',
      '[aria-label*="Applied"]',
      '.job-card-container__footer-item--applied'
    ].join(',')
  };

  window.__LINKEDIN_AUTO_APPLY_RUNNING = false;

  let currentJobIndex = 0;
  let successfulApplications = 0;
  let failedApplications = 0;
  let jobCards = [];
  let stopProcessing = false;
  let isProcessing = false;

  function getStatusBanner() {
    let banner = document.getElementById('batch-apply-status');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'batch-apply-status';
      Object.assign(banner.style, {
        position: 'fixed', bottom: '20px', right: '20px', zIndex: 2147483647,
        padding: '8px 12px', background: '#0a66c2', color: 'white',
        borderRadius: '4px', fontSize: '12px', fontFamily: 'sans-serif',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)', pointerEvents: 'none',
      });
      banner.textContent = 'LinkedIn Batch Apply: ready';
      document.body.appendChild(banner);
    }
    return banner;
  }

  function updateBanner(text, error = false) {
    const banner = getStatusBanner();
    banner.style.background = error ? '#b3261e' : '#0a66c2';
    banner.textContent = text;
  }

  const log = (message, isError = false) => {
    const timestamp = new Date().toISOString().substr(11, 8);
    const logMessage = `[${timestamp}] ${message}`;
    console.log(`%c${logMessage}`, isError ? 'color: red' : 'color: blue');
  };

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
      log(`Waiting for element: ${selector}`);
      const startTime = Date.now();
      
      const element = document.querySelector(selector);
      if (element) {
        log(`Found element: ${selector}`);
        return resolve(element);
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          log(`Found element via observer: ${selector}`);
          resolve(element);
        } else if (Date.now() - startTime >= timeout) {
          observer.disconnect();
          log(`Timeout waiting for element: ${selector}`, true);
          resolve(null);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      if (timeout) {
        setTimeout(() => {
          observer.disconnect();
          if (!document.querySelector(selector)) {
            log(`Timeout waiting for element: ${selector}`, true);
            resolve(null);
          }
        }, timeout);
      }
    });
  }

  function findJobCards() {
    const cards = Array.from(document.querySelectorAll(config.jobCardSelector));
    const validCards = [];
    
    for (const card of cards) {
      const appliedFeedback = card.querySelector('.artdeco-inline-feedback__message');
      const alreadyAppliedText = appliedFeedback?.textContent?.toLowerCase().includes('applied');
      if (card.getAttribute('data-job-is-applied') === 'true' || alreadyAppliedText) {
        log('Skipping already applied job');
        continue;
      }

      const clickableElement = card.querySelector(config.jobTitleSelector) || card;
      
      validCards.push({
        card: card,
        clickable: clickableElement,
        title: clickableElement?.textContent?.trim() || 'Untitled Position'
      });
    }
    
    log(`Found ${validCards.length} job cards to process`);
    return validCards;
  }

  async function openJobCard(jobCard, index) {
    if (!jobCard || !document.body.contains(jobCard)) {
      log('Job card is no longer in the DOM');
      return false;
    }

    log(`Opening job card ${index + 1}...`);
    
    try {
      jobCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(300);
      
      jobCard.click();
      await delay(2000);
      
      return true;
    } catch (error) {
      log(`Error opening job card: ${error.message}`, true);
      return false;
    }
  }

  async function processJobApplication(jobData, index) {
    try {
      const { card, clickable, title } = jobData;
      log(`===== Processing job ${index + 1}: ${title} =====`);
      
      log('Scrolling job card into view...');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(300);
      
      log('Clicking job card to open details...');
      clickable.click();
      
      log('Waiting for job details to load...');
      const jobDetails = await waitForElement(
        `${config.jobDetailsPanel} ${config.jobDetailsContent}`,
        10000
      );
      
      if (!jobDetails) {
        log('Job details did not load in the expected selector; proceeding anyway.');
      } else {
        log('Waiting for job details to fully load...');
        await delay(1500);
      }
      
      const alreadyApplied = document.querySelector('.artdeco-inline-feedback__message, [aria-label*="Applied"], .jobs-apply-button[disabled]');
      if (alreadyApplied) {
        log('Job is already applied according to details panel. Skipping...');
        updateBanner('Already applied / skipped');
        return false;
      }

      const easyApplyPresent = document.querySelector('#jobs-apply-button-id, .jobs-apply-button--top-card button, button.jobs-apply-button, button[aria-label*="Easy Apply"]');
      if (!easyApplyPresent) {
        log('Easy Apply button not present in details; skipping job.');
        updateBanner('No Easy Apply button / skipped');
        return false;
      }

      log('Job details loaded, notifying Content.js to handle the application...');
      
      log('Sending message to Content.js to process job application...');
      
      const applicationComplete = await new Promise((resolve) => {
        let messageHandled = false;
        
        const handleMessage = (message, sender, sendResponse) => {
          if (message.action === 'applicationComplete' && !messageHandled) {
            messageHandled = true;
            chrome.runtime.onMessage.removeListener(handleMessage);
            log(`Content.js completed application with status: ${message.success ? 'success' : 'failure'}`);
            if (message.success) {
              updateBanner('Applied ✔');
            } else {
              updateBanner('Skipped');
            }
            resolve(message.success);
          }
          return true;
        };
    
        chrome.runtime.onMessage.addListener(handleMessage);
        
        try {
          chrome.runtime.sendMessage({ action: 'processJobApplication' });
        } catch (error) {
          log(`Error sending message to Content.js: ${error.message}`, true);
          if (!messageHandled) {
            messageHandled = true;
            chrome.runtime.onMessage.removeListener(handleMessage);
            resolve(false);
          }
        }
        
        setTimeout(() => {
          if (!messageHandled) {
            messageHandled = true;
            chrome.runtime.onMessage.removeListener(handleMessage);
            log('Timeout waiting for Content.js to complete application', true);
            resolve(false);
          }
        }, 60000);
      });
      
      return applicationComplete;
      
    } catch (error) {
      log(`Error processing job: ${error.message}`, true);
      console.error('Job processing error:', error);
      return false;
    } finally {
      await closeAllModals();
      await delay(300);
    }
  }

  // Inject Content.js
  async function injectContentScript() {
    return new Promise((resolve) => {
      if (document.querySelector('script[src*="Content.js"]')) {
        log('Content.js already injected');
        return resolve(true);
      }
      
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('Content.js');
      script.onload = () => {
        log('Content.js injected successfully');
        resolve(true);
      };
      script.onerror = (error) => {
        log(`Failed to inject Content.js: ${error}`, true);
        resolve(false);
      };
      
      (document.head || document.documentElement).appendChild(script);
    });
  }

  async function submitApplication() {
    log('Delegating application submission to Content.js...');
  
    return true;
  }

  // Close all modals
  async function closeAllModals() {
    log('Closing all modals...');
    
    const closeButtons = [
      'button[aria-label="Dismiss"]',
      'button[aria-label="Close"]',
      'button[data-test-modal-close-btn]',
      'button.artdeco-modal__dismiss',
      'button.artdeco-toast__dismiss'
    ];
    
    for (const selector of closeButtons) {
      const buttons = document.querySelectorAll(selector);
      for (const button of buttons) {
        try {
          if (button.offsetParent !== null) {
            log(`Clicking close button: ${selector}`);
            button.click();
            await delay(300);
          }
        } catch (e) {
          log(`Error clicking close button: ${e.message}`, true);
        }
      }
    }
    
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, which: 27, bubbles: true }));
    await delay(300);
  }

  async function applyIfEasyApplyVisible() {
    const easyApplyBtn = document.querySelector(
      [
        '#jobs-apply-button-id',
        '.jobs-apply-button--top-card button',
        'button.jobs-apply-button',
        'button[aria-label*="Easy Apply"]'
      ].join(',')
    );
    if (easyApplyBtn) {
      log('Easy Apply button already visible in right panel. Triggering Content.js immediately...');
      const success = await new Promise((resolve) => {
        let handled = false;
        const listener = (msg) => {
          if (msg.action === 'applicationComplete' && !handled) {
            handled = true;
            chrome.runtime.onMessage.removeListener(listener);
            resolve(msg.success);
          }
        };
        chrome.runtime.onMessage.addListener(listener);
        chrome.runtime.sendMessage({ action: 'processJobApplication' });
        setTimeout(() => {
          if (!handled) {
            chrome.runtime.onMessage.removeListener(listener);
            resolve(false);
          }
        }, 300000);
      });
      if (success) {
        log('Successfully applied to the currently open job panel.');
      } else {
        log('Failed to apply to the currently open job panel.', true);
      }
    }
  }

  async function processAllJobs() {
    if (isProcessing) {
      log('Batch processing already in progress; ignoring duplicate call.');
      return;
    }
    isProcessing = true;
    log('Starting processAllJobs function');

    await applyIfEasyApplyVisible();
    log('Starting processAllJobs function');
    
    stopProcessing = false;
    successfulApplications = 0;
    failedApplications = 0;
    let errorOccurred = null;

    try {
      log('Finding job cards...');
      updateBanner('Searching jobs…');
      const jobCards = findJobCards();
      log(`Found ${jobCards.length} job cards`);
      
      if (jobCards.length === 0) {
        log('No job cards found; attempting to scroll to load more...');
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await delay(1200);
        const refreshed = findJobCards();
        if (refreshed.length === 0) {
          log('Still no new job cards. Finishing.');
          return false;
        }
        jobCards.push(...refreshed);
      }
      
      log(`Found ${jobCards.length} jobs. Starting batch process...`);
      
      for (let i = 0; i < jobCards.length; i++) {
        updateBanner(`Applying (${i + 1}/${jobCards.length})`);
        if (stopProcessing) {
          log("Batch processing stopped by user");
          break;
        }

        const jobCard = jobCards[i];
        log(`Processing job ${i + 1} of ${jobCards.length}...`);
        
        try {
          if (!jobCard || !jobCard.clickable) {
            log(` Invalid job card at index ${i}`, true);
            failedApplications++;
            continue;
          }
          
          const success = await processJobApplication(jobCard, i);
          
          if (success) {
            log(` Successfully processed job ${i + 1} of ${jobCards.length}`);
            successfulApplications++;
          } else {
            updateBanner('Already applied / skipped');
            log(` Could not process job ${i + 1} of ${jobCards.length} (may not have Easy Apply)`, true);
            failedApplications++;
          }
        } catch (error) {
          failedApplications++;
          log(` Error processing job ${i + 1}: ${error.message}`, true);
          console.error('Job processing error:', error);
        }
        
        if (i < jobCards.length - 1) {
          log(`Waiting ${config.delayBetweenJobs}ms before next job...`);
          updateBanner('Searching jobs…');
           await delay(config.delayBetweenJobs);
        }
      }

      const completionMessage = `Batch processing completed. Success: ${successfulApplications}, Failed: ${failedApplications}`;
      log(completionMessage);
      
      if (successfulApplications > 0) {
        alert(completionMessage);
      } else if (failedApplications > 0) {
        alert('Failed to apply to all jobs. Please check the console for details.');
      }
      
    } catch (error) {
      errorOccurred = error;
      log(`❌ Critical error in batch processing: ${error.message}`, true);
      console.error('Batch processing error:', error);
      return false;
    } finally {
      log('Cleaning up batch process...');
      window.__LINKEDIN_AUTO_APPLY_RUNNING = false;
      isProcessing = false;
      
      if (errorOccurred) {
        log('Batch processing stopped due to an error', true);
        log('Batch processing stopped due to an error', true);
        throw errorOccurred;
      }
    }
  }

  // Initialize the extension
  async function init() {
    try {
      log('Initializing LinkedIn Batch Apply extension...');
      
      // Check if we're on a LinkedIn jobs page
      if (!window.location.href.includes('linkedin.com/jobs/')) {
        log('This extension only works on LinkedIn Jobs pages.', true);
        return;
      }
      
      window.__LINKEDIN_AUTO_APPLY_RUNNING = false;
      isProcessing = false;
      
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "startBatchApply") {
          log(`Received startBatchApply message. Current processing state: ${isProcessing}`);
          
          if (isProcessing) {
            const msg = "Batch process is already running";
            log(msg, true);
            sendResponse({ success: false, message: msg });
            return true;
          }
          
          log("Starting batch process from popup...");
          window.__LINKEDIN_AUTO_APPLY_RUNNING = true;
          
          const startProcess = async () => {
            try {
              log('=== STARTING BATCH PROCESS ===');
              
              log('Waiting for Content.js to initialize...');
              await delay(3000);
              
              log('About to call processAllJobs...');
              await processAllJobs();
              
              log('=== BATCH PROCESS COMPLETED ===');
              
              sendResponse({ 
                success: true, 
                message: `Completed: ${successfulApplications} successful, ${failedApplications} failed` 
              });
            } catch (error) {
              log(`Error in batch process: ${error.message}`, true);
              sendResponse({ 
                success: false, 
                message: error.message || 'Unknown error occurred' 
              });
            } finally {
              isProcessing = false;
              window.__LINKEDIN_AUTO_APPLY_RUNNING = false;
            }
          };
          
          startProcess();
          
          return true;
        }
        
        if (request.action === "stopBatchApply") {
          log("Stopping batch process...");
          stopProcessing = true;
          sendResponse({ success: true, message: "Stopping batch process..." });
          return true;
        }
      });
      
      log("Batch Apply extension ready. Use the extension popup to start.");
      
    } catch (error) {
      log(`Initialization error: ${error.message}`, true);
      console.error('Initialization error:', error);
      window.__LINKEDIN_AUTO_APPLY_RUNNING = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
