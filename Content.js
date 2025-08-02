(function () {
  console.log(
    "LinkedIn Auto Apply Extension content script loaded. Version: 4.0 (Data-Driven)"
  );

  let isApplying = false;
  const log = (message) => console.log(`[LinkedIn Auto Apply] ${message}`);
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function simulateUserInput(element, value) {
    log(`Simulating input for ${element.tagName} with value "${value}"`);
    element.focus();

    if (element.tagName === "SELECT") {
      let option = null;
      const valueStr = String(value).toLowerCase();

      // First try exact match
      option = Array.from(element.options).find((opt) =>
        opt.textContent.trim().toLowerCase().includes(valueStr)
      );

      // If no match and it's a number (likely notice period), try different formats
      if (!option && !isNaN(value)) {
        const numValue = parseInt(value);

        // Try common notice period formats
        const patterns = [
          `${numValue} days`,
          `${numValue} day`,
          `${numValue}-day`,
          `${numValue}days`,
          numValue === 30 ? "1 month" : null,
          numValue === 60 ? "2 months" : null,
          numValue === 90 ? "3 months" : null,
          numValue === 0 ? "immediate" : null,
          numValue === 0 ? "immediately" : null,
          numValue <= 7 ? "within a week" : null,
          numValue <= 7 ? "1 week" : null,
        ].filter(Boolean);

        for (const pattern of patterns) {
          option = Array.from(element.options).find((opt) =>
            opt.textContent.trim().toLowerCase().includes(pattern.toLowerCase())
          );
          if (option) {
            log(`Found option using pattern "${pattern}" for value "${value}"`);
            break;
          }
        }
      }

      if (option) {
        log(
          `Found option for "${value}": "${option.textContent.trim()}". Applying selection.`
        );
        await delay(Math.random() * 300 + 200);
        element.selectedIndex = option.index;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          "value"
        ).set;
        nativeInputValueSetter.call(element, option.value);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        await delay(Math.random() * 700 + 500);
        element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      } else {
        const availableOptions = Array.from(element.options)
          .map((opt) => opt.textContent.trim())
          .join('", "');
        log(
          `Could not find an option for "${value}". Available options: "${availableOptions}"`
        );
      }
    } else {
      const prototype = Object.getPrototypeOf(element);
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        prototype,
        "value"
      ).set;
      async function simulateInput(element, value) {
        // Add random delay to simulate human typing
        await delay(Math.random() * 500 + 300);

        element.focus();
        await delay(100);

        // Simulate gradual typing for text inputs
        if (element.type === "text" || element.type === "number") {
          let finalValue = value;
          if (element.type === "number" && element.hasAttribute("required")) {
            const numValue = parseInt(value, 10);
            if (!isNaN(numValue) && numValue >= 0 && numValue <= 99) {
              finalValue = numValue.toString();
            } else {
              finalValue = "0";
            }
            log(`Normalized numeric value from "${value}" to "${finalValue}"`);
          }

          element.value = "";
          element.dispatchEvent(new Event("input", { bubbles: true }));
          for (let i = 0; i < finalValue.length; i++) {
            element.value += finalValue[i];
            element.dispatchEvent(new Event("input", { bubbles: true }));
            await delay(Math.random() * 100 + 50);
          }
          // Ensure React-controlled input picks up the final value
          const prototypeSetter = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(element),
            "value"
          )?.set;
          if (prototypeSetter) {
            prototypeSetter.call(element, finalValue);
            element.dispatchEvent(new Event("input", { bubbles: true }));
          }
        } else {
          element.value = value;
          element.dispatchEvent(new Event("input", { bubbles: true }));
        }

        await delay(100);
        element.dispatchEvent(new Event("change", { bubbles: true }));
        await delay(200);
        element.blur();
        await delay(300);
      }
      await simulateInput(element, value);
    }

    await delay(100);
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
          const questionSpan = label.querySelector('span[aria-hidden="true"]');
          questionText = (
            questionSpan ? questionSpan.innerText : label.innerText
          )
            .trim()
            .toLowerCase();
        }
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

      if (dataPath === "workExperiences") {
        // Check if this is a Yes/No experience question vs numeric years question
        const isYesNoQuestion =
          questionText.includes("do you have experience") ||
          questionText.includes("have you worked") ||
          questionText.includes("have experience in");

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

            const answerText = String(answer).toLowerCase();
            log(
              `Comparing radio option "${labelText}" with answer "${answerText}"`
            );
            return labelText.toLowerCase() === answerText.toLowerCase();
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
