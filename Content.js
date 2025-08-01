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
      const option = Array.from(element.options).find((opt) =>
        opt.textContent
          .trim()
          .toLowerCase()
          .includes(String(value).toLowerCase())
      );

      if (option) {
        log(`Found option for "${value}". Applying definitive simulation.`);
        await delay(150);
        element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        element.selectedIndex = option.index;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          "value"
        ).set;
        nativeInputValueSetter.call(element, option.value);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      } else {
        log(`Could not find an option with text including "${value}".`);
      }
    } else {
      const prototype = Object.getPrototypeOf(element);
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        prototype,
        "value"
      ).set;
      nativeInputValueSetter.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }

    element.blur();
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
  });

  async function processApplication() {
    log("Starting application process...");
    try {
      log("Loading user data...");
      const userData = await fetch(chrome.runtime.getURL("data.json")).then(
        (res) => res.json()
      );
      log("User data loaded successfully.");

      const easyApplyButton = document.querySelector(".jobs-apply-button");
      if (easyApplyButton) {
        easyApplyButton.click();
        await delay(2000);
      } else {
        throw new Error("Easy Apply button not found on the page.");
      }

      while (true) {
        await answerQuestionsOnPage(userData);
        const nextButton = document.querySelector(
          'button[aria-label="Continue to next step"], button[aria-label="Next"]'
        );
        if (nextButton) {
          log('Clicking "Next" button...');
          nextButton.click();
          await delay(2000);
        } else {
          log('No more "Next" buttons found. Looking for "Review" button.');
          break;
        }
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
        log("SUCCESS: Application submitted (Simulated).");
        chrome.runtime.sendMessage({
          action: "updateStatus",
          message: "Application submitted successfully!",
        });
        await delay(2000);

        const doneButton = document.querySelector('button[aria-label="Done"]');
        if (doneButton) doneButton.click();
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
    "notice period": "jobPreferences.noticePeriod",
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
      const label = questionContainer.querySelector("label");
      if (!label) continue;
      const questionSpan = label.querySelector('span[aria-hidden="true"]');
      const questionText = (
        questionSpan ? questionSpan.innerText : label.innerText
      )
        .trim()
        .toLowerCase();

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
        let skillPart =
          questionText.split(" on ")[1] || questionText.split(" in ")[1];
        if (skillPart) {
          skillPart = skillPart.replace("?", "").trim();
          const mentionedSkills = skillPart.split(/\s*\/\s*|\s+or\s+|\s*,\s+/);
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

      if (typeof answer === "boolean") {
        answer = answer ? "Yes" : "No";
        log(`Converted boolean answer to "${answer}" for dropdown.`);
      }

      if (answer === null || answer === undefined) {
        log(`No answer found for question: "${questionText}"`);

        continue;
      }

      log(`Found answer for "${questionText}": "${answer}"`);

      try {
        const inputElement = questionContainer.querySelector(
          'input:not([type="radio"]), textarea, select'
        );

        if (inputElement) {
          if (
            inputElement.tagName === "INPUT" &&
            inputElement.type === "radio"
          ) {
            const radioToSelect = Array.from(
              inputElement
                .closest(".fb-radio-buttons, .form-builder-radio-buttons")
                .querySelectorAll('input[type="radio"]')
            ).find(
              (radio) =>
                radio.nextElementSibling?.textContent.trim().toLowerCase() ===
                String(answer).toLowerCase()
            );
            if (radioToSelect && !radioToSelect.checked) radioToSelect.click();
          } else if (inputElement) {
            log(`Simulating input for found element...`);
            await simulateUserInput(inputElement, answer);
          }
        } else {
          log(`Could not find an input field for question: "${questionText}"`);
        }
      } catch (error) {
        log(`Error processing question "${questionText}": ${error.message}`);
      }
    }

    await delay(200);
    log("Finished answering questions on this page.");
  }
})();
