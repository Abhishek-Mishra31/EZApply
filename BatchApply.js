
(function () {
  "use strict";

  console.log("LinkedIn Batch Apply Extension loaded. Version: 7.0 (Job Limit & Multi-page)");
  
  // Maximum number of jobs to apply to in total
  const MAX_JOBS = 20;
  let totalApplications = 0;
  let currentPage = 1;

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
  let totalProcessed = 0;
  let jobLinks = [];
  let jobCards = [];
  let stopProcessing = false;
  let isProcessing = false;

  function getStatusBanner() {
    let banner = document.getElementById('batch-apply-status');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'batch-apply-status';
      Object.assign(banner.style, {
        position: 'fixed', 
        bottom: '20px', 
        right: '20px', 
        zIndex: '2147483647',
        padding: '10px 15px', 
        background: '#0a66c2', 
        color: 'white',
        borderRadius: '4px', 
        fontSize: '14px', 
        fontWeight: '500',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)', 
        pointerEvents: 'none',
        opacity: '0.95',
        transition: 'all 0.3s ease',
        maxWidth: '300px',
        textAlign: 'center',
        lineHeight: '1.4'
      });
      
      if (window.getComputedStyle(document.body).position === 'static') {
        document.body.style.position = 'relative';
      }
      
      document.body.appendChild(banner);
      
      setTimeout(() => {
        banner.style.opacity = '1';
      }, 100);
    }
    return banner;
  }

  function updateBanner(text, error = false, showCount = true) {
    const banner = getStatusBanner();
    
    banner.style.display = 'block';
    banner.style.opacity = '0.95';
    banner.style.background = error ? '#b3261e' : '#0a66c2';
    
    let statusText = `✅ Applied: ${successfulApplications}/${MAX_JOBS}`;
    
    // Add page info if available
    if (currentPage > 1) {
      statusText += `\n📄 Page: ${currentPage}`;
    }
    
    // Add the status text if provided
    if (text && text !== 'Applying to jobs') {
      statusText = `🔄 ${text}\n${statusText}`;
    }
    
    banner.textContent = statusText;
    banner.style.zIndex = '2147483647';
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
      
      // Wait for Content.js to complete the application
      const applicationComplete = await new Promise((resolve) => {
        let messageHandled = false;
        
        const handleMessage = (message, sender, sendResponse) => {
          if (message.action === 'applicationComplete' && !messageHandled) {
            messageHandled = true;
            chrome.runtime.onMessage.removeListener(handleMessage);
            
            const success = message.success === true;
            log(`Content.js completed application with status: ${success ? 'success' : 'failure'}`);
            
            if (success) {
              successfulApplications++;
              updateBanner(`Applied ${successfulApplications}/${jobLinks.length} ✔`);
              resolve(true);
            } else {
              updateBanner(`Applied ${successfulApplications}/${jobLinks.length} - Skipped`);
              resolve(false);
            }
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
            log('Timeout waiting for Content.js response');
            resolve(false);
          }
        }, 30000);
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
    
    // Check for save/discard modal specifically
    const saveDiscardModal = document.querySelector('[data-test-modal-id="save-application-modal"]');
    if (saveDiscardModal) {
      const discardBtn = saveDiscardModal.querySelector('button[data-test-dialog-secondary-btn]');
      if (discardBtn && discardBtn.offsetParent !== null) {
        log('Found save/discard modal - clicking discard');
        discardBtn.click();
        await delay(1000);
        return;
      }
    }
    
    // Generic close buttons
    const closeSelectors = [
      'button[aria-label="Dismiss"]',
      'button[aria-label="Close"]',
      'button[data-test-modal-close-btn]',
      'button.artdeco-modal__dismiss',
      'button.artdeco-toast__dismiss',
      'button[data-test-dialog-primary-btn]'
    ];
    
    for (const selector of closeSelectors) {
      const buttons = document.querySelectorAll(selector);
      for (const button of buttons) {
        try {
          if (button.offsetParent !== null && button.textContent.toLowerCase().includes('close')) {
            log(`Clicking close button: ${selector}`);
            button.click();
            await delay(500);
            break;
          }
        } catch (e) {
          log(`Error clicking close button: ${e.message}`, true);
        }
      }
    }
    
    // Fallback to escape key
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

  async function goToNextPage() {
    try {
      log('Attempting to navigate to next page...');
      currentPage++;
      // Try multiple selectors for the Next button
      const nextButtonSelectors = [
        'button[aria-label="View next page"]', // Main selector from the HTML
        'button.jobs-search-pagination__button--next', // Next button class
        'button[aria-label^="Next"]', // Fallback for other LinkedIn versions
        'button[aria-label^="next" i]' // Case-insensitive fallback
      ];
      
      for (const selector of nextButtonSelectors) {
        const nextButton = document.querySelector(selector);
        if (nextButton && !nextButton.disabled) {
          log(`Found next page button with selector: ${selector}`);
          updateBanner(`Moving to page ${currentPage}...`, false, true);
          nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await delay(1000); // Slightly longer delay for better reliability
          nextButton.click();
          await delay(4000); // Wait for page to load
          return true;
        }
      }
      
      log('No enabled next page button found', true);
      return false;
    } catch (error) {
      log(`Error navigating to next page: ${error.message}`, true);
      return false;
    }
  }

  async function processAllJobs(pageNumber = 1) {
    // Limit to 3 pages max
    // No page limit - continue until MAX_JOBS reached
    
    if (isProcessing) {
      log('Batch processing already in progress; ignoring duplicate call.');
      return;
    }
    
    if (totalApplications >= MAX_JOBS) {
      log(`Reached maximum job application limit of ${MAX_JOBS}. Stopping.`);
      updateBanner(`Reached ${MAX_JOBS} job limit`);
      return;
    }
    
    // Allow unlimited pages - only stop when MAX_JOBS reached
    
    isProcessing = true;
    log(`Starting processAllJobs function - Page ${pageNumber}`);
    updateBanner(`Page ${pageNumber} - Finding jobs...`);
    
    // Scroll to load job cards
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await delay(1500);
    
    stopProcessing = false;
    let jobsProcessedOnPage = 0;
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
      
      const remainingJobs = MAX_JOBS - totalApplications;
      const jobsToProcess = Math.min(jobCards.length, remainingJobs);
      
      log(`Found ${jobCards.length} jobs. Processing ${jobsToProcess} jobs (${totalApplications}/${MAX_JOBS} applied so far)...`);
      updateBanner(`Page ${pageNumber} - Starting...`);
      
      // Decide how many job cards we will ATTEMPT on this page (includes skips)
      const jobsBeforePageChange = 4 + Math.floor(Math.random() * 2); // 4-5 jobs
      let currentIndex = 0;
      let jobsAttemptedOnPage = 0;
      
      log(`Will attempt ${jobsBeforePageChange} job cards on page ${pageNumber} before moving to next page`);
      
      while (currentIndex < jobsToProcess && 
             totalApplications < MAX_JOBS && 
             !stopProcessing) {
        if (currentIndex >= 0 && currentIndex < jobCards.length) {
          jobsAttemptedOnPage++;
          jobsProcessedOnPage++;
          updateBanner(`Applying (${totalApplications + 1}/${MAX_JOBS})`, false, true);
          
          const jobCard = jobCards[currentIndex];
          log(`Processing job ${currentIndex + 1} of ${jobCards.length} (${totalApplications + 1}/${MAX_JOBS} total applications)...`);
          
          try {
            if (!jobCard || !jobCard.clickable) {
              log(`Invalid job card at index ${currentIndex}`, true);
              failedApplications++;
              currentIndex++;
              continue;
            }
            
            const success = await processJobApplication(jobCard, currentIndex);
            
            if (success) {
              totalApplications++;
              successfulApplications++;
              log(`Successfully processed job ${totalApplications} of ${MAX_JOBS}`);
              
              // Update the banner with the new count
              updateBanner(`Applied to ${successfulApplications} jobs`, false, true);
              
              if (totalApplications >= MAX_JOBS) {
                log(`Reached maximum job application limit of ${MAX_JOBS}.`);
                updateBanner(`All done! Applied to ${successfulApplications} jobs`, false, true);
                stopProcessing = true;
                isProcessing = false;
                return;
              }
            } else {
              updateBanner('Already applied / skipped');
              log(`Could not process job ${currentIndex + 1} of ${jobCards.length} (may not have Easy Apply)`, true);
              failedApplications++;
            }
          } catch (error) {
            failedApplications++;
            log(`Error processing job ${currentIndex + 1}: ${error.message}`, true);
            log(error.stack, true);
            errorOccurred = error;
            currentIndex++;
            continue;
          }
          
          await delay(1000);
          currentIndex++;

          // Decide if we should move to next page AFTER attempting the job
          if (jobsAttemptedOnPage >= jobsBeforePageChange && !stopProcessing) {
            log(`Attempted ${jobsAttemptedOnPage} jobs on page ${pageNumber}. Deciding whether to move on.`);
            
            log(`Moving to page ${pageNumber + 1}...`);
            await closeAllModals();
            await delay(1000);
            
            const success = await goToNextPage();
            if (success) {
              await delay(3000);
              isProcessing = false;
              await processAllJobs(pageNumber + 1);
              return;
            } else {
              log('No more pages available');
              updateBanner('No more pages', false, true);
              stopProcessing = true;
              break;
            }
          }
        } else {
          // If we've gone through all jobs on this page but haven't reached our per-page limit,
          // try to go to next page
          if (jobsProcessedOnPage === 0) {
            log('No jobs processed on this page, trying next page...');
            const hasNextPage = await goToNextPage();
            if (hasNextPage) {
              await delay(3000);
              isProcessing = false;
              await processAllJobs(pageNumber + 1);
              return;
            } else {
              log('No more jobs or pages available');
              updateBanner('No more jobs available', false, true);
              break;
            }
          }
        }
      }
      
      log('===== BATCH APPLY COMPLETED =====');
      log(`Total processed: ${jobCards.length}`);
      log(`Successfully applied: ${successfulApplications}`);
      log(`Skipped: ${jobCards.length - successfulApplications}`);
      
      updateBanner(`Batch complete: ${successfulApplications}/${jobCards.length} applied`);
      
      isProcessing = false;
      
      // Show final alert with accurate status
      const statusMessage = successfulApplications > 0 
        ? `Batch apply completed!\n\nSuccessfully applied to ${successfulApplications} out of ${jobLinks.length} jobs.`
        : `Batch apply completed!\n\nNo jobs were applied to.`;
        
      alert(statusMessage);
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
      
      // Initialize banner immediately
      const banner = getStatusBanner();
      updateBanner('Extension loaded');
      
      // Check if we're on a LinkedIn jobs page
      if (!window.location.href.includes('linkedin.com/jobs/')) {
        const msg = 'This extension only works on LinkedIn Jobs pages.';
        updateBanner(msg, true);
        log(msg, true);
        return;
      }
      
      window.__LINKEDIN_AUTO_APPLY_RUNNING = false;
      isProcessing = false;
      
      // Message listener for background script communication
      function handleMessage(request, sender, sendResponse) {
        if (request.action === 'startBatchApply') {
          if (window.__LINKEDIN_AUTO_APPLY_RUNNING) {
            log('Batch apply is already running');
            sendResponse({ status: 'already_running' });
            return true;
          }
          
          log('Starting batch apply from message');
          window.__LINKEDIN_AUTO_APPLY_RUNNING = true;
          
          // Start processing jobs
          processAllJobs()
            .then(() => {
              log('=== BATCH PROCESS COMPLETED ===');
              sendResponse({ success: true, message: 'Batch process completed' });
            })
            .catch(error => {
              const errorMsg = `Error in batch process: ${error.message}`;
              log(errorMsg, true);
              console.error('Batch process error:', error);
              sendResponse({ success: false, message: errorMsg });
            })
            .finally(() => {
              window.__LINKEDIN_AUTO_APPLY_RUNNING = false;
            });
            
          return true; // Keep the message channel open for async response
        } 
        
        if (request.action === 'stopBatchApply') {
          log('Received stopBatchApply message');
          stopProcessing = true;
          window.__LINKEDIN_AUTO_APPLY_RUNNING = false;
          sendResponse({ success: true, message: 'Stopping batch process' });
          return true;
        } 
        
        if (request.action === 'status') {
          sendResponse({
            isRunning: window.__LINKEDIN_AUTO_APPLY_RUNNING || false,
            totalApplied: totalApplications,
            currentPage: currentPage
          });
          return true;
        }
        
        // For unknown actions, don't keep the channel open
        return false;
      }
      
      // Add the message listener
      chrome.runtime.onMessage.addListener(handleMessage);
      
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
