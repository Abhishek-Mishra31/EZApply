(function () {
  "use strict";

  console.log("LinkedIn Batch Apply Extension loaded. Version: 6.0 (Job Navigation Only)");

  // Simple delay function
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Configuration
  const config = {
    delayBetweenJobs: 3000, // 3 seconds between job applications
    maxRetries: 2, // Maximum number of retries for a single job
    jobCardSelector: '.job-card-container', // Updated to match LinkedIn's job card container
    jobTitleSelector: '.job-card-container__link', // Selector for job title links
    jobDetailsPanel: '.jobs-search__right-rail', // The right panel that shows job details
    jobDetailsContent: '.jobs-details__main-content', // Main content area of job details
    easyApplyButtonSelector: [
      '#jobs-apply-button-id', // Specific ID for the Easy Apply button
      'button[data-job-id]', // Generic selector for job apply buttons
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

  // Prevent multiple instances
  window.__LINKEDIN_AUTO_APPLY_RUNNING = false;

  // State
  let currentJobIndex = 0;
  let successfulApplications = 0;
  let failedApplications = 0;
  let jobCards = [];
  let stopProcessing = false;
  let isProcessing = false;

  // Simple logging function that also updates the console
  const log = (message, isError = false) => {
    const timestamp = new Date().toISOString().substr(11, 8);
    const logMessage = `[${timestamp}] ${message}`;
    console.log(`%c${logMessage}`, isError ? "color: red" : "color: blue");
  };

  // Wait for an element to appear on the page
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
      log(`Waiting for element: ${selector}`);
      const startTime = Date.now();
      
      // Check immediately
      const element = document.querySelector(selector);
      if (element) {
        log(`Found element: ${selector}`);
        return resolve(element);
      }
      
      // Set up a mutation observer to watch for DOM changes
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
      
      // Start observing the document with the configured parameters
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Set a timeout as a fallback
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

  // Find all job cards on the page
  function findJobCards() {
    const cards = Array.from(document.querySelectorAll(config.jobCardSelector));
    const validCards = [];
    
    for (const card of cards) {
      // Skip if already applied (look for any applied indicators)
      const isApplied = card.matches(config.appliedIndicator) || 
                       card.querySelector(config.appliedIndicator);
      
      if (isApplied) {
        log('Skipping already applied job');
        continue;
      }
      
      // Find the clickable element within the job card (usually the title)
      const clickableElement = card.querySelector(config.jobTitleSelector) || card;
      
      // Store both the card and its clickable element
      validCards.push({
        card: card,
        clickable: clickableElement,
        title: clickableElement?.textContent?.trim() || 'Untitled Position'
      });
    }
    
    log(`Found ${validCards.length} job cards to process`);
    return validCards;
  }

  // Scroll and click a job card to open it
  async function openJobCard(jobCard, index) {
    if (!jobCard || !document.body.contains(jobCard)) {
      log('Job card is no longer in the DOM');
      return false;
    }

    log(`Opening job card ${index + 1}...`);
    
    try {
      // Scroll the job card into view
      jobCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(1000);
      
      // Click the job card to open it
      jobCard.click();
      await delay(2000);
      
      return true;
    } catch (error) {
      log(`Error opening job card: ${error.message}`, true);
      return false;
    }
  }

  // Process a single job application by delegating to Content.js
  async function processJobApplication(jobData, index) {
    try {
      const { card, clickable, title } = jobData;
      log(`===== Processing job ${index + 1}: ${title} =====`);
      
      // Scroll the job card into view
      log('Scrolling job card into view...');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(1000);
      
      // Click the job card to open the details in the right panel
      log('Clicking job card to open details...');
      clickable.click();
      
      // Wait for the job details to load in the right panel
      log('Waiting for job details to load...');
      const jobDetails = await waitForElement(
        `${config.jobDetailsPanel} ${config.jobDetailsContent}`,
        10000 // 10 second timeout
      );
      
      if (!jobDetails) {
        log('Job details did not load in the right panel', true);
        return false;
      }
      
      // Wait a bit more for any lazy-loaded content
      log('Waiting for job details to fully load...');
      await delay(3000);
      
      // Let Content.js handle everything related to Easy Apply button and application
      log('Job details loaded, notifying Content.js to handle the application...');
      
      // Send a message to Content.js to handle the application
      log('Sending message to Content.js to process job application...');
      
      const applicationComplete = await new Promise((resolve) => {
        let messageHandled = false;
        
        const handleMessage = (message, sender, sendResponse) => {
          if (message.action === 'applicationComplete' && !messageHandled) {
            messageHandled = true;
            chrome.runtime.onMessage.removeListener(handleMessage);
            log(`Content.js completed application with status: ${message.success ? 'success' : 'failure'}`);
            resolve(message.success);
          }
          return true;
        };
        
        // Set up message listener for Content.js response
        chrome.runtime.onMessage.addListener(handleMessage);
        
        // Send message to Content.js to start processing the job
        try {
          chrome.runtime.sendMessage(
            { action: 'processJobApplication' },
            (response) => {
              if (chrome.runtime.lastError) {
                log(`Chrome runtime error: ${chrome.runtime.lastError.message}`, true);
                if (!messageHandled) {
                  messageHandled = true;
                  chrome.runtime.onMessage.removeListener(handleMessage);
                  resolve(false);
                }
              } else {
                log('Message sent to Content.js successfully');
              }
            }
          );
        } catch (error) {
          log(`Error sending message to Content.js: ${error.message}`, true);
          if (!messageHandled) {
            messageHandled = true;
            chrome.runtime.onMessage.removeListener(handleMessage);
            resolve(false);
          }
        }
        
        // Set a timeout in case Content.js doesn't respond
        setTimeout(() => {
          if (!messageHandled) {
            messageHandled = true;
            chrome.runtime.onMessage.removeListener(handleMessage);
            log('Timeout waiting for Content.js to complete application', true);
            resolve(false);
          }
        }, 300000); // 5 minute timeout for the entire application process
      });
      
      return applicationComplete;
      
    } catch (error) {
      log(`Error processing job: ${error.message}`, true);
      console.error('Job processing error:', error);
      return false;
    } finally {
      // Ensure we close any open modals before moving to the next job
      await closeAllModals();
      await delay(1000); // Brief pause between jobs
    }
  }

  // Inject Content.js
  async function injectContentScript() {
    return new Promise((resolve) => {
      // Check if Content.js is already injected
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

  // Application submission is now handled by Content.js
  // This function is kept for compatibility but will delegate to Content.js
  async function submitApplication() {
    log('Delegating application submission to Content.js...');
    // Content.js will handle the entire submission process
    return true;
  }

  // Close all modals
  async function closeAllModals() {
    log('Closing all modals...');
    
    // Try different close buttons
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
          if (button.offsetParent !== null) { // Only click visible buttons
            log(`Clicking close button: ${selector}`);
            button.click();
            await delay(1000);
          }
        } catch (e) {
          log(`Error clicking close button: ${e.message}`, true);
        }
      }
    }
    
    // Press Escape as a last resort
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, which: 27, bubbles: true }));
    await delay(1000);
  }

  // Process all jobs one by one
  async function processAllJobs() {
    log('Starting processAllJobs function');
    
    // Reset state at the start (isProcessing is already set by the caller)
    stopProcessing = false;
    successfulApplications = 0;
    failedApplications = 0;
    let errorOccurred = null;

    try {
      log('Finding job cards...');
      const jobCards = findJobCards();
      log(`Found ${jobCards.length} job cards`);
      
      if (jobCards.length === 0) {
        log('No job cards found on this page.');
        return false;
      }
      
      log(`Found ${jobCards.length} jobs. Starting batch process...`);
      
      for (let i = 0; i < jobCards.length; i++) {
        if (stopProcessing) {
          log("Batch processing stopped by user");
          break;
        }

        const jobCard = jobCards[i];
        log(`Processing job ${i + 1} of ${jobCards.length}...`);
        
        try {
          // Make sure we have a valid job card object with a clickable element
          if (!jobCard || !jobCard.clickable) {
            log(`⚠️ Invalid job card at index ${i}`, true);
            failedApplications++;
            continue;
          }
          
          // Process the job application (will handle scrolling and clicking)
          const success = await processJobApplication(jobCard, i);
          
          if (success) {
            log(`✅ Successfully processed job ${i + 1} of ${jobCards.length}`);
            successfulApplications++;
          } else {
            log(`⚠️ Could not process job ${i + 1} of ${jobCards.length} (may not have Easy Apply)`, true);
            failedApplications++;
          }
        } catch (error) {
          failedApplications++;
          log(`❌ Error processing job ${i + 1}: ${error.message}`, true);
          console.error('Job processing error:', error);
        }
        
        // Add delay between jobs if there are more to process
        if (i < jobCards.length - 1) {
          log(`Waiting ${config.delayBetweenJobs}ms before next job...`);
          await delay(config.delayBetweenJobs);
        }
      }

      const completionMessage = `Batch processing completed. Success: ${successfulApplications}, Failed: ${failedApplications}`;
      log(completionMessage);
      
      // Only show success alert if we had at least one successful application
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
      // Reset flags when done or on error
      log('Cleaning up batch process...');
      window.__LINKEDIN_AUTO_APPLY_RUNNING = false;
      isProcessing = false;
      
      if (errorOccurred) {
        log('Batch processing stopped due to an error', true);
        log('Batch processing stopped due to an error', true);
        throw errorOccurred; // Re-throw to ensure the caller knows about the error
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
      
      // Reset running state on initialization
      window.__LINKEDIN_AUTO_APPLY_RUNNING = false;
      isProcessing = false;
      
      // Listen for messages from the popup
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
          isProcessing = true;
          window.__LINKEDIN_AUTO_APPLY_RUNNING = true;
          
          // Start the batch process in a way that won't block the message channel
          const startProcess = async () => {
            try {
              log('=== STARTING BATCH PROCESS ===');
              
              // Content.js is already loaded via manifest.json, just wait for it to initialize
              log('Waiting for Content.js to initialize...');
              await delay(3000);
              
              log('About to call processAllJobs...');
              // Start processing jobs
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
          
          // Start the process without awaiting it to keep the message channel open
          startProcess();
          
          // Return true to indicate we'll send a response asynchronously
          return true;
        }
        
        // Add a stop command to handle any cleanup if needed
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

  // Start the extension when the page is fully loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // DOMContentLoaded has already fired, initialize immediately
    init();
  }
})();
