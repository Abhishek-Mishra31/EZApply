(function () {
  console.log(
    "LinkedIn Auto Apply Extension content script loaded. Version: 4.0 (Data-Driven)"
  );

  let isApplying = false;
  const log = (message) => console.log(`[LinkedIn Auto Apply] ${message}`);
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function simulateUserInput(element, value) {
    log(`Simulating input for ${element.tagName} with value "${value}"`);
    
    // Get the container element to check for question context
    const container = element.closest('.fb-dash-form-element') || 
                     element.closest('.artdeco-text-input') || 
                     element.closest('.artdeco-form-element') ||
                     document;
    
    const questionText = container.textContent.trim().toLowerCase();
    const errorElement = container.nextElementSibling?.querySelector('.artdeco-inline-feedback--error');
    const errorMessage = errorElement?.textContent?.trim().toLowerCase() || '';
    
    element.focus();

    // Check if this is a numeric input field
    const isNumericInput = element.type === 'number' || 
                          element.getAttribute('type') === 'number' ||
                          element.id?.includes('numeric') ||
                          errorMessage.includes('enter a whole number') ||
                          errorMessage.includes('enter a decimal number') ||
                          questionText.includes('years of experience') ||
                          questionText.includes('notice period') ||
                          questionText.includes('ctc') ||
                          questionText.includes('salary');

    if (isNumericInput) {
      let numericValue = value || '3'; // Default value
      
      // Determine if we need an integer or decimal
      const requiresInteger = errorMessage.includes('whole number') || 
                            questionText.includes('years of experience') ||
                            questionText.includes('notice period in days');
      
      const requiresDecimal = errorMessage.includes('decimal number') ||
                            questionText.includes('ctc') ||
                            questionText.includes('salary') ||
                            questionText.includes('expected compensation');

      // Process the numeric value
      if (requiresInteger) {
        // For years of experience or notice period in days
        const intValue = Math.min(99, Math.max(0, parseInt(numericValue, 10) || 3));
        numericValue = intValue.toString();
        log(`Setting integer value (0-99): ${numericValue}`);
      } 
      else if (requiresDecimal) {
        // For CTC, salary, or other decimal fields
        const floatValue = Math.max(0.1, parseFloat(numericValue) || 3.0);
        numericValue = floatValue.toFixed(1); // Format to 1 decimal place
        log(`Setting decimal value: ${numericValue}`);
      }
      
      // Special handling for specific fields
      if (questionText.includes('notice period')) {
        // For notice period, use a reasonable default (30 days)
        numericValue = '30';
      } 
      else if (questionText.includes('ctc') || questionText.includes('expected compensation')) {
        // For CTC fields, use the provided value or a reasonable default
        numericValue = value ? value.toString() : '500000';
      }
      
      // Set the value and trigger events
      element.value = numericValue;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      
      await delay(300);
      return;
    }

    if (element.tagName === "SELECT") {
      let option = null;
      const valueStr = String(value).toLowerCase();
      const options = Array.from(element.options);
      
      // Check for Yes/No questions first
      const isYesNoQuestion = questionText.includes('are you') || 
                            questionText.includes('do you') ||
                            questionText.includes('have you') ||
                            questionText.includes('is this') ||
                            questionText.includes('okay for');
      
      // Special handling for contract and hourly rate questions
      const isContractQuestion = questionText.includes('contract') || 
                               questionText.includes('6 months') || 
                               questionText.includes('temporary');
      const isHourlyRateQuestion = questionText.includes('hourly rate') || 
                                 questionText.includes('$10');
      
      // Try exact match first
      option = options.find(opt => 
        opt.textContent.trim().toLowerCase() === valueStr ||
        opt.value.toLowerCase() === valueStr
      );
      
      // If no exact match, try partial match
      if (!option) {
        option = options.find(opt => 
          opt.textContent.trim().toLowerCase().includes(valueStr) ||
          (opt.value && opt.value.toLowerCase().includes(valueStr))
        );
      }
      
      // Special handling for contract questions (default to Yes)
      if (!option && isContractQuestion) {
        log('Contract question detected, defaulting to Yes');
        option = options.find(opt => 
          opt.textContent.trim().toLowerCase() === 'yes' ||
          opt.value.toLowerCase() === 'yes' ||
          opt.textContent.trim().toLowerCase().startsWith('yes')
        ) || options[1]; // Fallback to first non-default option
      }
      
      // Special handling for hourly rate questions (default to Yes if acceptable)
      if (!option && isHourlyRateQuestion) {
        log('Hourly rate question detected, defaulting to Yes');
        option = options.find(opt => 
          opt.textContent.trim().toLowerCase() === 'yes' ||
          opt.value.toLowerCase() === 'yes' ||
          opt.textContent.trim().toLowerCase().startsWith('yes')
        ) || options[1]; // Fallback to first non-default option
        
        if (!option && options.length > 0) {
          // If we still don't have an option, try to find any option that might be a positive response
          option = options.find(opt => 
            !opt.textContent.trim().toLowerCase().includes('no') && 
            !opt.value.toLowerCase().includes('no')
          ) || options[options.length - 1]; // Fallback to last option
        }
      }
      
      // If still no match and it's a Yes/No question, try to find Yes/No options
      if (!option && isYesNoQuestion) {
        const yesOption = options.find(opt => 
          opt.textContent.trim().toLowerCase() === 'yes' ||
          opt.value.toLowerCase() === 'yes'
        );
        
        const noOption = options.find(opt => 
          opt.textContent.trim().toLowerCase() === 'no' ||
          opt.value.toLowerCase() === 'no'
        );
        
        // Default to Yes for most questions, unless it's a negative question
        const isNegativeQuestion = questionText.includes('not') || 
                                 questionText.includes('disability') ||
                                 questionText.includes('criminal');
        
        option = isNegativeQuestion ? noOption || yesOption : yesOption || noOption;
      }

      if (option) {
        log(`Found option for "${value}": "${option.textContent.trim()}". Applying selection.`);
        await delay(Math.random() * 300 + 200);
        
        // Set the value directly first
        element.value = option.value;
        
        // Then dispatch events to ensure React picks up the change
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('click', { bubbles: true }));
        
        // Also try setting the selected property directly
        option.selected = true;
        
        // Additional events to ensure the UI updates
        await delay(200);
        element.focus();
        element.dispatchEvent(new Event('focus', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        
        await delay(Math.random() * 500 + 300);
      } else {
        const availableOptions = options
          .map(opt => `"${opt.textContent.trim()}" (value: ${opt.value})`)
          .join(', ');
        log(`Could not find an option for "${value}". Available options: ${availableOptions}`);
        
        // As a fallback, try to select the first non-default option
        if (options.length > 1) {
          const nonDefaultOption = options[1]; // Usually the first non-default option
          log(`Falling back to option: "${nonDefaultOption.textContent.trim()}"`);
          element.value = nonDefaultOption.value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          nonDefaultOption.selected = true;
        }
      }
    } 
    // Handle text/number inputs
    else {
      const isNumericInput = element.type === 'number' || 
                           (element.type === 'text' && 
                            (element.getAttribute('inputmode') === 'numeric' ||
                             /\d+\s*(year|yr|yrs|month|mo|mos|day|dy|dys)/i.test(questionText)));
      
      // Special handling for experience questions that expect a decimal number
      const isExperienceQuestion = questionText.includes('exp') || 
                                 questionText.includes('experience') ||
                                 questionText.includes('year of experience');
      
      let finalValue = value;
      
      // Format numeric inputs properly
      if (isNumericInput) {
        // For experience questions, ensure we have a decimal if needed
        if (isExperienceQuestion) {
          // If value is a whole number or invalid, add .0 to make it a decimal
          if ((String(value).indexOf('.') === -1 || isNaN(value)) && value !== '') {
            const numValue = parseFloat(value) || 3.0; // Default to 3.0 if invalid
            finalValue = Math.min(Math.max(0.1, numValue), 50).toFixed(1);
            log(`Formatted experience value to decimal: ${finalValue}`);
          } else {
            // Ensure it's a valid decimal between 0.1 and 50.0
            const numValue = parseFloat(value);
            finalValue = Math.min(Math.max(0.1, numValue), 50).toFixed(1);
          }
        }
        
        // Ensure the value is within the expected range
        const numValue = parseFloat(finalValue);
        if (!isNaN(numValue)) {
          // For years of experience, cap at a reasonable number
          if (isExperienceQuestion) {
            finalValue = Math.min(Math.max(0.1, numValue), 50).toFixed(1);
            log(`Normalized experience value to: ${finalValue}`);
          } 
          // For other numeric inputs, ensure they're positive
          else if (numValue < 0) {
            finalValue = '0';
          }
        } else if (isExperienceQuestion) {
          // Default value if all else fails
          finalValue = '3.0';
        }
      }
      
      // Simulate typing for text inputs
      if (element.type === 'text' || element.type === 'number' || element.tagName === 'TEXTAREA') {
        await delay(Math.random() * 300 + 200);
        element.focus();
        await delay(100);
        
        // Clear the field first
        element.value = '';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Type the value character by character for text inputs
        if (element.type === 'text' || element.tagName === 'TEXTAREA') {
          for (let i = 0; i < finalValue.length; i++) {
            element.value += finalValue[i];
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(Math.random() * 50 + 30);
          }
        } else {
          // For number inputs, set the value directly
          element.value = finalValue;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Trigger change and blur events
        element.dispatchEvent(new Event('change', { bubbles: true }));
        await delay(200);
        element.blur();
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        await delay(300);
      } else {
        // For other input types, just set the value directly
        element.value = finalValue;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    // Add a small delay before moving to the next field
    await delay(Math.random() * 200 + 100);
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startApply") {
      if (isApplying) {
        log("Application already in progress.");
        sendResponse({ status: "already_applying" });
        return true;
      }
      isApplying = true;
      log("Received startApply message. Beginning process.");

      processApplication().finally(() => {
        isApplying = false;
        log("Application process has concluded.");
      });

      sendResponse({ status: "started" });
      return true;
    }

    // Handle messages from BatchApply.js
    if (request.action === "processJobApplication") {
      if (isApplying) {
        log("Application already in progress.");
        chrome.runtime.sendMessage({
          action: "applicationComplete",
          success: false,
          error: "Already applying",
        });
        return true;
      }

      isApplying = true;
      log("Starting job application process from BatchApply.js...");

      // Immediately acknowledge the message so the sender's port can close without errors
      sendResponse({ status: "started" });

      processApplication()
        .then(() => {
          isApplying = false;
          log("Application completed successfully");
          chrome.runtime.sendMessage({
            action: "applicationComplete",
            success: true,
          });
        })
        .catch((error) => {
          isApplying = false;
          log(`Application failed: ${error.message}`);
          chrome.runtime.sendMessage({
            action: "applicationComplete",
            success: false,
            error: error.message,
          });
        });

      return true;
    }
  });

  async function processApplication() {
    log("Starting application process...");
    try {
      log("Loading user data...");
      const userData = await fetch(chrome.runtime.getURL("data.json")).then(
        (res) => res.json()
      );
      log("User data loaded successfully.");

      const easyApplyButton =
        document.querySelector(".jobs-apply-button--top-card button") ||
        document.querySelector("#jobs-apply-button-id") ||
        document.querySelector(".jobs-apply-button");
      if (easyApplyButton) {
        easyApplyButton.click();
        await delay(2000);
      } else {
        throw new Error("Easy Apply button not found on the page.");
      }

      let maxAttempts = 10;
      let attemptCount = 0;
      let lastQuestionCount = -1;

      while (attemptCount < maxAttempts) {
        attemptCount++;
        log(`Processing attempt ${attemptCount}/${maxAttempts}`);

        const currentQuestions = document.querySelectorAll(
          ".fb-dash-form-element"
        );
        if (currentQuestions.length === lastQuestionCount && attemptCount > 1) {
          log(
            "Loop detected: question count has not changed. Forcing button search.",
            true
          );
          break;
        }
        lastQuestionCount = currentQuestions.length;

        await answerQuestionsOnPage(userData);

        await delay(1000);

        // Check for Next button first
        const nextButton = document.querySelector(
          'button[aria-label="Continue to next step"], button[aria-label="Next"]'
        );

        // Check for Review button
        const reviewButton = document.querySelector(
          'button[aria-label="Review your application"], button[data-live-test-easy-apply-review-button]'
        );

        if (nextButton && !nextButton.disabled) {
          log('Clicking "Next" button...');
          nextButton.click();
          await delay(4000);
          attemptCount = 0;
        } else if (reviewButton && !reviewButton.disabled) {
          log('Found "Review" button. Moving to review step.');
          break;
        } else {
          log(
            "No actionable buttons found. Checking if all questions are answered..."
          );

          // Check if we're on a success/confirmation page or if no questions found multiple times
          const successIndicators = document.querySelectorAll(
            '[data-test="success-message"], .artdeco-inline-feedback--success, [aria-label="Done"], .jobs-apply-confirmation, .jobs-apply-success'
          );

          const questionElements = document.querySelectorAll(
            ".fb-dash-form-element"
          );

          if (
            successIndicators.length > 0 ||
            (questionElements.length === 0 && attemptCount > 2)
          ) {
            log(
              "Application appears to be successfully submitted or completed. Exiting process."
            );
            chrome.runtime.sendMessage({
              action: "updateStatus",
              message: "Application submitted successfully!",
            });
            chrome.runtime.sendMessage({
              action: "applicationComplete",
              success: true,
            });
            return;
          }

          const unansweredFields = document.querySelectorAll(
            'input[aria-required="true"]:not([value]), select[aria-required="true"]:not([value]), input[type="radio"][aria-required="true"]:not(:checked)'
          );

          if (unansweredFields.length === 0) {
            log(
              "All required fields appear to be filled. Looking for any available button..."
            );
            break;
          } else {
            log(
              `Found ${unansweredFields.length} unanswered required fields. Continuing...`
            );
          }
        }
      }

      if (attemptCount >= maxAttempts) {
        log("Maximum attempts reached. Proceeding to review step...");
      }

      const reviewButton = document.querySelector(
        'button[aria-label="Review your application"]'
      );
      if (reviewButton) {
        log('Clicking "Review" button...');
        reviewButton.click();
        await delay(2000);
      }

      const submitButton = document.querySelector(
        'button[aria-label="Submit application"]'
      );
      if (submitButton) {
        log("Final review page. Answering any remaining questions.");
        await answerQuestionsOnPage(userData);
        await delay(1000);

        log("Submitting application...");
        submitButton.click();

        // Wait for submission to complete
        log("Waiting for submission to complete...");
        await delay(3000);

        // Check for success indicators
        const successIndicators = [
          "div[data-test-application-success]",
          ".artdeco-inline-feedback--success",
          "div[data-test-success-message]",
          'h1:contains("Application submitted")',
          'h1:contains("Application sent")',
          'div:contains("Your application has been submitted")',
        ];

        let success = false;
        for (const selector of successIndicators) {
          if (document.querySelector(selector)) {
            success = true;
            log("Success indicator found: " + selector);
            break;
          }
        }

        if (success) {
          log("SUCCESS: Application submitted successfully!");
          chrome.runtime.sendMessage({
            action: "updateStatus",
            message: "Application submitted successfully!",
          });

          // Close the success modal
          await closeSuccessModal();
        } else {
          log("WARNING: Could not confirm submission success");
        }
      } else {
        log(
          "Could not find the final submit button. Manual review may be required."
        );
        chrome.runtime.sendMessage({
          action: "updateStatus",
          message: "Could not find submit button.",
        });
      }
    } catch (error) {
      log(`ERROR: ${error.message}`);
      chrome.runtime.sendMessage({
        action: "updateStatus",
        message: `Error: ${error.message}`,
      });
    }
  }

  const keywordMapping = {
    pronoun: "personalInfo.pronouns",
    "country of residence": "personalInfo.countryOfResidence",
    "full name": "personalInfo.fullName",
    email: "personalInfo.email",
    phone: "personalInfo.phone",
    location: "personalInfo.location",

    "authorized to work": "legalAndWorkAuth.authorizedToWorkIn",
    visa: "legalAndWorkAuth.visaType",
    sponsorship: "legalAndWorkAuth.needSponsorship",

    gpa: "education.gpa",
    "graduation date": "education.graduationDate",
    student: "education.currentlyEnrolled",
    internship: "extraAndOptional.lookingForInternship",

    salary: "jobPreferences.expectedCTC",
    "expected ctc": "jobPreferences.expectedCTC",
    ectc: "jobPreferences.salaryExpectation",
    "expected ctc": "jobPreferences.expectedCTC",
    "expected compensation": "jobPreferences.expectedCTC",
    "current salary": "jobPreferences.currentSalary",
    "current ctc": "jobPreferences.currentSalary",
    "current annual compensation": "jobPreferences.currentSalary",
    "current ctc in inr": "jobPreferences.currentSalary",
    "current annual compensation in inr": "jobPreferences.currentSalary",
    "expected salary": "jobPreferences.expectedCTC",
    "expected ctc": "jobPreferences.expectedCTC",
    "expected annual compensation": "jobPreferences.expectedCTC",
    "expected ctc in inr": "jobPreferences.expectedCTC",
    "expected annual compensation in inr": "jobPreferences.expectedCTC",
    "total years of professional experience": "jobPreferences.totalITExperience",
    "total additional months of experience": "jobPreferences.totalMonthsExperience",
    "current ctc": "jobPreferences.currentSalary",
    remote: "extraAndOptional.openToRemoteWork",
    bachelor: "educationAndInternships.hasBachelorsDegree",
    degree: "educationAndInternships.hasBachelorsDegree",

    resume: "documentsAndLinks.resumeURL",
    "cover letter": "documentsAndLinks.coverLetter",
    portfolio: "documentsAndLinks.portfolioURL",
    website: "documentsAndLinks.personalWebsite",
    github: "assessmentsAndSkills.githubURL",
    leetcode: "assessmentsAndSkills.leetcodeURL",

    strength: "behavioralAndMotivation.strengths",
    weakness: "behavioralAndMotivation.weaknesses",

    "start date": "availability.startDate",
    "start immediately": "availability.startDate",
    "notice period": "jobPreferences.servingNoticePeriod",
    "serving notice period": "jobPreferences.servingNoticePeriod",
    "are you serving a notice period": "jobPreferences.servingNoticePeriod",
    "are you currently serving a notice period":
      "jobPreferences.servingNoticePeriod",
    "already working": "jobPreferences.currentlyWorking",
    "currently working": "jobPreferences.currentlyWorking",
    "are you currently working": "jobPreferences.currentlyWorking",
    "immediate joiner": "jobPreferences.immediateJoiner",
    "immediate to 1 week joiner": "jobPreferences.immediateJoiner",
    "how soon": "jobPreferences.noticePeriod",
    "how soon can you join": "jobPreferences.noticePeriod",
    "resigned": "jobPreferences.resigned",
    "last working date": "jobPreferences.lastWorkingDateConfirmed",
    "start within 5 days": "jobPreferences.immediateJoiner",
    "1 week joiner": "jobPreferences.immediateJoiner",
    "hybrid setting": "jobPreferences.hybridWork",
    "hybrid work": "jobPreferences.hybridWork",
    "working in a hybrid": "jobPreferences.hybridWork",
    "comfortable working in hybrid": "jobPreferences.hybridWork",
    hybrid: "jobPreferences.hybridWork",
    "commuting to this job's location": "jobPreferences.commuteToLocation",
    "commute to location": "jobPreferences.commuteToLocation",
    "commuting to job's location": "jobPreferences.commuteToLocation",
    "comfortable commuting": "jobPreferences.commuteToLocation",
    
    "c#": "jobPreferences.skillRatings.C#",
    "next.js": "jobPreferences.skillRatings.Next.js",

    "docker": "jobPreferences.technologies.docker",
    "kubernetes": "jobPreferences.technologies.kubernetes",
    "container": "jobPreferences.technologies.docker",
    "containerization": "jobPreferences.technologies.docker",
    "orchestration": "jobPreferences.technologies.kubernetes",
    "aws": "jobPreferences.technologies.aws",
    "cloud": "jobPreferences.technologies.aws",
    "frontend": "jobPreferences.technologies.react",
    "redux": "jobPreferences.technologies.redux",
    "toolkit": "jobPreferences.technologies.redux",
    "tailwind": "jobPreferences.technologies.tailwind",
    "figma": "jobPreferences.technologies.figma",
    "figma handoff": "jobPreferences.technologies.figma",
    "postgresql": "jobPreferences.technologies.postgresql",
    "redis": "jobPreferences.technologies.redis",
    "vercel": "jobPreferences.technologies.vercel",
    "git": "jobPreferences.technologies.git",
    "cicd": "jobPreferences.technologies.cicd",
    "react": "jobPreferences.technologies.react",
    "node": "jobPreferences.technologies.node",
    "python": "jobPreferences.technologies.python",
    "java": "jobPreferences.technologies.java",
    commuting: "jobPreferences.commuteToLocation",
    "bachelor's degree": "educationQuestions.bachelorsDegree",
    "bachelor degree": "educationQuestions.bachelorsDegree",
    "us clients": "jobPreferences.immediateJoiner",
    "join in 7 days": "jobPreferences.immediateJoiner",
    "start this job immediately": "jobPreferences.immediateJoiner",
    "start job immediately": "jobPreferences.immediateJoiner",
    "start immediately": "jobPreferences.immediateJoiner",
    "start the job by office immediately": "jobPreferences.immediateJoiner",
    "start within 2 weeks": "jobPreferences.immediateJoiner",
    "within 2 weeks from offer": "jobPreferences.immediateJoiner",
    "within 2 weeks": "jobPreferences.immediateJoiner",
    "good communication": "jobPreferences.immediateJoiner",
    "well versed working": "jobPreferences.immediateJoiner",
    relocate: "extraAndOptional.willingToRelocate",
    travel: "extraAndOptional.willingToTravel",

    license: "extraAndOptional.driversLicense",
    passport: "extraAndOptional.passportAvailability",
    accommodation: "extraAndOptional.requireAccommodations",
    contract: "extraAndOptional.openToContract",
    mentoring: "extraAndOptional.wantsMentoring",

    experience: "workExperiences",
    exp: "workExperiences",
    "unpaid 6-month": "extraAndOptional.unpaidInternshipComfort",
    "unpaid internship": "extraAndOptional.unpaidInternshipComfort",
    "6-month internship": "extraAndOptional.unpaidInternshipComfort",
    "comfortable with an unpaid": "extraAndOptional.unpaidInternshipComfort",
    "comfortable with unpaid": "extraAndOptional.unpaidInternshipComfort",
    "comfortable with a 6-month unpaid":
      "extraAndOptional.unpaidInternshipComfort",
    "rate your": "extraAndOptional.skillRatings",
    "scale of 1 to 10": "extraAndOptional.skillRatings",
  };

  function getAnswerFromPath(userData, path) {
    if (!path) return null;
    const value = path
      .split(".")
      .reduce((o, k) => (o && o[k] !== "undefined" ? o[k] : null), userData);
    if (Array.isArray(value)) return value.join(", ");
    return value;
  }

  async function closeSuccessModal() {
    log("Attempting to close success modal...");

    const closeButtonSelectors = [
      'button[aria-label="Done"]',
      "button[data-test-modal-close-btn]",
      "button[data-test-close]",
      'button[aria-label*="Close"]',
      ".artdeco-modal__dismiss",
      'button[data-control-name*="close"]',
      "button[data-test-modal-close]",
      'button[aria-label*="Dismiss"]',
      "button[data-test-dialog-primary-btn]",
      'button[data-control-name="save_application_btn"]',
      "button.artdeco-button--primary",
      "button.artdeco-button--secondary",
    ];

    for (const selector of closeButtonSelectors) {
      try {
        const buttons = Array.from(document.querySelectorAll(selector));
        const visibleButton = buttons.find(
          (btn) =>
            btn.offsetParent !== null &&
            !btn.disabled &&
            (btn.offsetWidth > 0 || btn.offsetHeight > 0)
        );

        if (visibleButton) {
          log(`Clicking close button: ${selector}`);
          visibleButton.click();
          await delay(1000);
          return true;
        }
      } catch (e) {
        log(`Error with selector ${selector}: ${e.message}`);
      }
    }

    try {
      const overlays = [
        ".artdeco-modal-overlay",
        ".artdeco-modal__overlay",
        ".scaffold-layout__backdrop",
        ".jobs-easy-apply-modal__backdrop",
      ];

      for (const overlay of overlays) {
        const overlayEl = document.querySelector(overlay);
        if (overlayEl) {
          log(`Clicking overlay: ${overlay}`);
          overlayEl.click();
          await delay(1000);
          return true;
        }
      }
    } catch (e) {
      log(`Error clicking overlay: ${e.message}`);
    }

    log("Could not find a way to close the success modal");
    return false;
  }

  function calculateTotalExperience(workExperiences) {
    let totalMonths = 0;
    const now = new Date();
    workExperiences.forEach((exp) => {
      const startDate = new Date(exp.startDate);
      const endDate =
        exp.endDate.toLowerCase() === "present" ? now : new Date(exp.endDate);
      let months =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 -
        startDate.getMonth() +
        endDate.getMonth();
      totalMonths += months > 0 ? months : 0;
    });
    return Math.round(totalMonths / 12);
  }

  async function answerQuestionsOnPage(userData) {
    log("Starting to answer questions on the current page...");
    const questionElements = document.querySelectorAll(".fb-dash-form-element");
    log(`Found ${questionElements.length} potential question elements.`);

    for (let i = 0; i < questionElements.length; i++) {
      const questionContainer = questionElements[i];

      let questionText = "";

      // Method 1: Check for fieldset with legend (radio buttons)
      const fieldset = questionContainer.querySelector("fieldset");
      if (fieldset) {
        const legend = fieldset.querySelector("legend");
        if (legend) {
          const legendSpan = legend.querySelector('span[aria-hidden="true"]');
          if (legendSpan) {
            questionText = legendSpan.innerText.trim().toLowerCase();
          }
        }
      }

      // Method 2: Check for regular label (text inputs, dropdowns)
      if (!questionText) {
        const label = questionContainer.querySelector("label");
        if (label) {
          // First try to find the question text in a span with specific class
          let questionSpan = label.querySelector('span[aria-hidden="true"]') || 
                           label.querySelector('.fb-dash-form-element__label-title') ||
                           label;
          
          questionText = questionSpan.innerText.trim().toLowerCase();
          
          // If we still don't have text, try to find any visible text in the container
          if (!questionText) {
            questionText = questionContainer.innerText.trim().toLowerCase();
          }
        }
      }
      
      // Clean up the question text
      if (questionText) {
        questionText = questionText
          .replace(/\s+/g, ' ') // Replace multiple spaces with one
          .replace(/[^a-z0-9\s]/g, '') // Remove special characters
          .trim();
      }

      if (!questionText) continue;

      log(`Processing question: "${questionText}"`);

      let answer = null;
      let dataPath = null;

      const sortedKeywords = Object.keys(keywordMapping).sort(
        (a, b) => b.length - a.length
      );
      for (const keyword of sortedKeywords) {
        if (questionText.includes(keyword)) {
          dataPath = keywordMapping[keyword];
          log(`Keyword "${keyword}" matched. Data path is "${dataPath}".`);

          break;
        }
      }

      if (!dataPath) continue;

      if (dataPath === "workExperiences" || 
          (questionText.includes('exp') && 
           (questionText.includes('java') || 
            questionText.includes('angular') || 
            questionText.includes('javascript')))) {
            
        // Check if this is a Yes/No experience question vs numeric years question
        const isYesNoQuestion =
          questionText.includes("do you have experience") ||
          questionText.includes("have you worked") ||
          questionText.includes("have experience in") ||
          questionText.includes("is it described");
          
        // If it's a technology experience question, make sure we return a numeric value
        if (!isYesNoQuestion && 
            (questionText.includes('java') || 
             questionText.includes('angular') || 
             questionText.includes('javascript'))) {
          answer = '3.0'; // Default to 3 years experience
          log(`Setting default experience for technology question: ${answer}`);
        }

        // Check if dropdown has Yes/No options
        const selectElement = questionContainer.querySelector("select");
        const hasYesNoOptions =
          selectElement &&
          Array.from(selectElement.options).some(
            (opt) =>
              opt.textContent.trim().toLowerCase() === "yes" ||
              opt.textContent.trim().toLowerCase() === "no"
          );

        if (isYesNoQuestion || hasYesNoOptions) {
          // This is a Yes/No experience question, not a numeric one
          let skillPart =
            questionText.split(" in ")[1] || questionText.split(" with ")[1];
          if (skillPart) {
            skillPart = skillPart.replace("?", "").trim();
            const mentionedSkills = skillPart.split(
              /\s*\/\s*|\s+or\s+|\s*,\s+|\s*,\s*/
            );
            let foundSkill = false;
            const userSkills = Object.keys(userData.skills).sort(
              (a, b) => b.length - a.length
            );

            for (const s of mentionedSkills) {
              const cleanSkill = s.trim().toLowerCase();
              const matchingUserSkill = userSkills.find((userSkill) =>
                userSkill.toLowerCase().includes(cleanSkill)
              );
              if (matchingUserSkill) {
                const exp = parseInt(userData.skills[matchingUserSkill], 10);
                if (exp > 0) foundSkill = true;
                break;
              }
            }
            answer = foundSkill ? "Yes" : "No";
            log(`Converted experience question to Yes/No: "${answer}"`);
          } else {
            answer = "Yes";
          }
        } else {
          let skillPart =
            questionText.split(" on ")[1] ||
            questionText.split(" in ")[1] ||
            questionText.split(" with ")[1];
          if (skillPart) {
            skillPart = skillPart.replace("?", "").trim();
            const mentionedSkills = skillPart.split(
              /\s*\/\s*|\s+or\s+|\s*,\s+/
            );
            let maxExp = 0;
            let foundSkill = false;
            const userSkills = Object.keys(userData.skills).sort(
              (a, b) => b.length - a.length
            );

            for (const s of mentionedSkills) {
              const cleanSkill = s.trim().toLowerCase();
              const matchingUserSkill = userSkills.find((userSkill) =>
                userSkill.toLowerCase().includes(cleanSkill)
              );
              if (matchingUserSkill) {
                const exp = parseInt(userData.skills[matchingUserSkill], 10);
                if (exp > maxExp) maxExp = exp;
                foundSkill = true;
              }
            }
            answer = foundSkill
              ? String(maxExp)
              : calculateTotalExperience(userData.workExperiences);
          } else {
            answer = calculateTotalExperience(userData.workExperiences);
          }
        }
      } else if (dataPath === "extraAndOptional.skillRatings") {
        const skillKeys = Object.keys(
          userData.extraAndOptional.skillRatings
        ).sort((a, b) => b.length - a.length);
        const foundSkillKey = skillKeys.find((skillKey) =>
          questionText.includes(skillKey.toLowerCase())
        );
        if (foundSkillKey) {
          answer = userData.extraAndOptional.skillRatings[foundSkillKey];
        }
      } else {
        answer = getAnswerFromPath(userData, dataPath);
      }

      if (
        questionText.includes("bachelor") ||
        questionText.includes("degree")
      ) {
        const hasBachelor = userData.education?.some((edu) =>
          edu.degree?.toLowerCase().includes("bachelor")
        );
        answer = hasBachelor ? "Yes" : "No";
        log(`Derived answer for degree question: "${answer}"`);
      }

      if (
        dataPath === "availability.startDate" &&
        answer?.toString().toLowerCase() === "asap"
      ) {
        answer = "Yes";
        log(`Converted 'ASAP' to 'Yes' for start date question.`);
      }

      if (dataPath === "extraAndOptional.unpaidInternshipComfort") {
        if (typeof answer === "boolean") {
          answer = answer ? "Yes" : "No";
          log(`Converted boolean to "${answer}" for internship question.`);
        } else if (typeof answer === "string") {
          answer = answer.toLowerCase() === "yes" ? "Yes" : "No";
          log(`Normalized string to "${answer}" for internship question.`);
        }
      }

      // Handle boolean conversion and Yes/No dropdown fallback logic
      if (typeof answer === "boolean") {
        answer = answer ? "Yes" : "No";
        log(`Converted boolean answer to "${answer}" for dropdown.`);
      }

      // If no specific answer found but it's a Yes/No type question, provide intelligent defaults
      if (answer === null || answer === undefined) {
        const isPersonalInfoQuestion =
          questionText.includes("email") ||
          questionText.includes("phone") ||
          questionText.includes("country") ||
          questionText.includes("address") ||
          questionText.includes("name") ||
          questionText.includes("location");

        if (!isPersonalInfoQuestion) {
          const selectElement = questionContainer.querySelector("select");
          if (selectElement) {
            const options = Array.from(selectElement.options).map((opt) =>
              opt.textContent.trim().toLowerCase()
            );
            const hasYesNo = options.includes("yes") && options.includes("no");

            if (hasYesNo) {
              let defaultAnswer = null;

              if (
                questionText.includes("authorized") ||
                questionText.includes("eligible") ||
                questionText.includes("legally") ||
                questionText.includes("work permit") ||
                questionText.includes("visa") ||
                questionText.includes("citizen")
              ) {
                defaultAnswer = "Yes";
                log(
                  `Using default "Yes" for work authorization question: "${questionText}"`
                );
              }
              // Comfort/willingness questions - typically "Yes"
              else if (
                questionText.includes("comfortable") ||
                questionText.includes("willing") ||
                questionText.includes("able to") ||
                questionText.includes("can you") ||
                questionText.includes("would you") ||
                questionText.includes("do you have")
              ) {
                defaultAnswer = "Yes";
                log(
                  `Using default "Yes" for comfort/willingness question: "${questionText}"`
                );
              }
              // Disability, criminal, or negative questions - typically "No"
              else if (
                questionText.includes("disability") ||
                questionText.includes("criminal") ||
                questionText.includes("convicted") ||
                questionText.includes("felony") ||
                questionText.includes("violation") ||
                questionText.includes("drug test")
              ) {
                defaultAnswer = "No";
                log(
                  `Using default "No" for negative/legal question: "${questionText}"`
                );
              } else {
                defaultAnswer = "Yes";
                log(
                  `Using default "Yes" for general Yes/No question: "${questionText}"`
                );
              }

              answer = defaultAnswer;
            }
          }
        }
      }

      if (answer === null || answer === undefined) {
        log(`No answer found for question: "${questionText}"`);

        continue;
      }

      log(`Found answer for "${questionText}": "${answer}"`);

      try {
        // First check for radio buttons
        const radioButtons = questionContainer.querySelectorAll(
          'input[type="radio"]'
        );
        if (radioButtons.length > 0) {
          log(`Found ${radioButtons.length} radio buttons for question`);
          const radioToSelect = Array.from(radioButtons).find((radio) => {
            let labelText = "";
            // Method 1: Check label text next to radio button
            const label = radio.nextElementSibling;
            if (label && label.textContent) {
              labelText = label.textContent
                .replace(/<!---->/g, "")
                .trim()
                .toLowerCase();
            }

            // Method 2: Check radio button value attribute
            if (!labelText && radio.value) {
              labelText = radio.value.trim().toLowerCase();
            }

            // Method 3: Check data attributes
            if (
              !labelText &&
              radio.getAttribute("data-test-text-selectable-option__input")
            ) {
              labelText = radio
                .getAttribute("data-test-text-selectable-option__input")
                .trim()
                .toLowerCase();
            }

            // Normalize the answer text
            const answerText = String(answer).trim().toLowerCase();
            
            // Special handling for Yes/No answers
            if ((answerText === 'yes' || answerText === 'no') && labelText) {
              // Check for variations of Yes/No (y/n, yeah/nope, etc.)
              const normalizedLabel = labelText.replace(/[^a-z]/g, '');
              if (answerText === 'yes' && (normalizedLabel.startsWith('y') || normalizedLabel === 'yeah' || normalizedLabel === 'yep')) {
                log(`Matched "${labelText}" as "Yes"`);
                return true;
              }
              if (answerText === 'no' && (normalizedLabel.startsWith('n') || normalizedLabel === 'nope' || normalizedLabel === 'nah')) {
                log(`Matched "${labelText}" as "No"`);
                return true;
              }
            }
            
            // Check for direct match (case-insensitive)
            const isMatch = labelText.toLowerCase() === answerText.toLowerCase();
            log(`Comparing radio option "${labelText}" with answer "${answerText}": ${isMatch ? 'MATCH' : 'no match'}`);
            
            return isMatch;
          });

          if (radioToSelect && !radioToSelect.checked) {
            log(`Clicking radio button with value: ${radioToSelect.value}`);
            await delay(Math.random() * 400 + 200);
            radioToSelect.click();
            await delay(Math.random() * 600 + 400);
          } else {
            log(`No matching radio button found for answer: "${answer}"`);
            const availableOptions = Array.from(radioButtons)
              .map((radio) => {
                return (
                  radio.value ||
                  radio.getAttribute(
                    "data-test-text-selectable-option__input"
                  ) ||
                  "unknown"
                );
              })
              .join(", ");
            log(`Available radio options: ${availableOptions}`);
          }
        }
        // Then check for dropdowns/select elements
        else {
          const selectElement = questionContainer.querySelector("select");
          if (selectElement) {
            log(`Found dropdown for question`);
            await simulateUserInput(selectElement, answer);
          } else {
            const inputElement = questionContainer.querySelector(
              'input:not([type="radio"]), textarea'
            );
            if (inputElement) {
              log(`Simulating input for found element...`);
              await simulateUserInput(inputElement, answer);
            } else {
              log(
                `Could not find any input field for question: "${questionText}"`
              );
            }
          }
        }
      } catch (error) {
        log(`Error processing question "${questionText}": ${error.message}`);
      }
    }

    await delay(200);
    log("Finished answering questions on this page.");
  }
})();
