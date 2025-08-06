"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function () {
    // Only run on LinkedIn Jobs pages with easy-apply
    if (!location.hostname.includes("linkedin.com") ||
        !location.pathname.startsWith("/jobs/") ||
        !location.href.toLowerCase().includes("easy-apply")) {
        return; // do nothing
    }
    console.log("LinkedIn Auto Apply Extension content script loaded. Version: 4.0 (Data-Driven)");
    // Banner will be created after the function is defined below
    let showBanner = false;
    const isLinkedInJobs = location.hostname === "www.linkedin.com" &&
        location.pathname.startsWith("/jobs/");
    const isEasyApply = location.href.toLowerCase().includes("easy-apply");
    if (isLinkedInJobs && isEasyApply) {
        showBanner = true;
    }
    let isApplying = false;
    const log = (message) => console.log(`[LinkedIn Auto Apply] ${message}`);
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    function simulateUserInput(element, value) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            log(`Simulating input for ${element.tagName} with value "${value}"`);
            const container = element.closest(".fb-dash-form-element") ||
                element.closest(".artdeco-text-input") ||
                element.closest(".artdeco-form-element") ||
                element.parentElement;
            const containerElement = container instanceof Element ? container : document.body;
            const questionText = ((_a = containerElement === null || containerElement === void 0 ? void 0 : containerElement.textContent) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || "";
            const errorElement = (_b = containerElement.nextElementSibling) === null || _b === void 0 ? void 0 : _b.querySelector(".artdeco-inline-feedback--error");
            const errorMessage = ((_c = errorElement === null || errorElement === void 0 ? void 0 : errorElement.textContent) === null || _c === void 0 ? void 0 : _c.trim().toLowerCase()) || "";
            element.focus();
            const isNumericInput = element.type === "number" ||
                element.getAttribute("type") === "number" ||
                element.inputMode === "numeric" ||
                ((_d = element.id) === null || _d === void 0 ? void 0 : _d.includes("numeric")) ||
                ((_e = element.className) === null || _e === void 0 ? void 0 : _e.includes("numeric")) ||
                errorMessage.includes("enter a whole number") ||
                errorMessage.includes("enter a decimal number") ||
                errorMessage.includes("larger than 0.0") ||
                questionText.includes("years of experience") ||
                questionText.includes("notice period") ||
                questionText.includes("ctc") ||
                questionText.includes("salary") ||
                questionText.includes("how many") ||
                questionText.includes("how much");
            if (isNumericInput) {
                let numericValue = value || "3";
                const requiresInteger = errorMessage.includes("whole number") ||
                    questionText.includes("notice period in days") ||
                    questionText.includes("how many years");
                const requiresDecimal = errorMessage.includes("decimal number") ||
                    errorMessage.includes("larger than 0.0") ||
                    questionText.includes("ctc") ||
                    questionText.includes("salary") ||
                    questionText.includes("expected compensation");
                let parsedValue = parseFloat(numericValue);
                if (isNaN(parsedValue) || parsedValue <= 0) {
                    parsedValue = 1.0;
                }
                let finalValue;
                const requiresWholeNumber = errorMessage.includes("whole number") ||
                    errorMessage.includes("between 0 to 99") ||
                    questionText.includes("how many years") ||
                    (questionText.includes("experience") &&
                        !questionText.includes("salary"));
                const hasRangeConstraint = errorMessage.includes("between 0 to 99") ||
                    errorMessage.includes("larger than 0.0");
                if (questionText.includes("experience") &&
                    questionText.includes("years")) {
                    const cappedValue = Math.min(Math.max(Math.round(parsedValue), 0), 99);
                    finalValue = cappedValue.toString();
                }
                else if (questionText.includes("notice period") ||
                    questionText.includes("lwd")) {
                    const cappedValue = Math.min(Math.max(parsedValue, 0.1), 90);
                    finalValue = cappedValue.toFixed(1);
                    if (finalValue.endsWith(".0")) {
                        finalValue = finalValue.slice(0, -2);
                    }
                }
                else if (questionText.includes("ctc") ||
                    questionText.includes("salary")) {
                    // For compensation inputs allow large numbers, keep as integer
                    finalValue = Math.round(parsedValue).toString();
                }
                else {
                    if (requiresWholeNumber || hasRangeConstraint) {
                        const wholeValue = Math.min(Math.max(Math.round(parsedValue), 0), 99);
                        finalValue = wholeValue.toString();
                    }
                    else {
                        const decimalValue = Math.max(0.1, parsedValue);
                        finalValue = decimalValue.toFixed(1);
                        if (finalValue.endsWith(".0")) {
                            finalValue = finalValue.slice(0, -2);
                        }
                    }
                }
                const minValue = 0.1;
                const finalNumeric = parseFloat(finalValue);
                if (finalNumeric < minValue) {
                    finalValue = minValue.toString();
                }
                log(`Setting numeric value: ${finalValue} for question: ${questionText.substring(0, 50)}...`);
                element.value = finalValue;
                element.dispatchEvent(new Event("input", { bubbles: true }));
                element.dispatchEvent(new Event("change", { bubbles: true }));
                element.dispatchEvent(new Event("blur", { bubbles: true }));
                yield delay(300);
                return;
            }
            if (element.tagName === "SELECT") {
                const selectElement = element;
                selectElement.value = value;
                selectElement.dispatchEvent(new Event("change", { bubbles: true }));
                selectElement.dispatchEvent(new Event("input", { bubbles: true }));
                selectElement.dispatchEvent(new Event("blur", { bubbles: true }));
                // Handle multi-select if needed
                if (selectElement.hasAttribute("multiple")) {
                    const options = selectElement.options;
                    const values = value.split(",").map((v) => v.trim());
                    for (let i = 0; i < options.length; i++) {
                        options[i].selected = values.includes(options[i].value);
                    }
                }
                let option = null;
                const valueStr = String(value).toLowerCase();
                const options = Array.from(element.options);
                const isYesNoQuestion = questionText.includes("are you") ||
                    questionText.includes("do you") ||
                    questionText.includes("have you") ||
                    questionText.includes("is this") ||
                    questionText.includes("okay for");
                const isContractQuestion = questionText.includes("contract") ||
                    questionText.includes("6 months") ||
                    questionText.includes("temporary");
                const isHourlyRateQuestion = questionText.includes("hourly rate") || questionText.includes("$10");
                // Try exact match first
                option = options.find((opt) => {
                    var _a;
                    return (((_a = opt.textContent) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || "") === valueStr ||
                        opt.value.toLowerCase() === valueStr;
                });
                // If no exact match, try partial match on text/value
                if (!option) {
                    option = options.find((opt) => {
                        var _a;
                        return (((_a = opt.textContent) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || "").includes(valueStr) ||
                            (opt.value && opt.value.toLowerCase().includes(valueStr));
                    });
                }
                // Special handling: if the value looks like a phone or country code, attempt numeric substring match
                if (!option) {
                    const digits = valueStr.replace(/[^0-9]/g, "");
                    if (digits.length >= 1) {
                        option = options.find((opt) => {
                            const textDigits = (opt.textContent || "").replace(/[^0-9]/g, "");
                            return textDigits === digits || textDigits.endsWith(digits);
                        });
                    }
                }
                // Special handling for contract questions (default to Yes)
                if (!option && isContractQuestion) {
                    log("Contract question detected, defaulting to Yes");
                    option =
                        options.find((opt) => {
                            var _a;
                            return (((_a = opt.textContent) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || "") === "yes" ||
                                opt.value.toLowerCase() === "yes";
                        }) || options[1];
                }
                // Special handling for yes/no questions
                if (!option && isYesNoQuestion) {
                    const yesOption = options.find((opt) => {
                        var _a;
                        return (((_a = opt.textContent) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || "") === "yes" ||
                            opt.value.toLowerCase() === "yes";
                    });
                    const noOption = options.find((opt) => {
                        var _a;
                        return (((_a = opt.textContent) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || "") === "no" ||
                            opt.value.toLowerCase() === "no";
                    });
                    // If the question asks about having >= N years experience, choose Yes by default
                    const yearsReq = questionText.match(/(\d+)\s*\+?\s*years?/);
                    if (yearsReq && yesOption) {
                        option = yesOption;
                    }
                    else {
                        // Default to Yes for most questions, unless it's a negative question
                        const isNegativeQuestion = questionText.includes("not") ||
                            questionText.includes("disability") ||
                            questionText.includes("criminal");
                        option = isNegativeQuestion ? noOption || yesOption : yesOption || noOption;
                    }
                }
                else {
                    // Regular option matching for non-yes/no values
                    const valueLower = String(value).toLowerCase();
                    option = options.find((opt) => {
                        var _a;
                        return (((_a = opt.textContent) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || "") === valueLower ||
                            opt.value.toLowerCase() === valueLower;
                    });
                }
                if (option) {
                    log(`Found option for "${value}": "${((_f = option.textContent) === null || _f === void 0 ? void 0 : _f.trim()) || ""}" (value: ${option.value}). Applying selection.`);
                    // Ensure the select element is properly updated
                    selectElement.value = option.value;
                    option.selected = true;
                    // Trigger multiple events to ensure the change is recognized
                    selectElement.dispatchEvent(new Event("change", { bubbles: true }));
                    selectElement.dispatchEvent(new Event("input", { bubbles: true }));
                    // Also trigger click events for better compatibility
                    option.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                    // Focus and blur events to complete the interaction
                    yield delay(200);
                    selectElement.focus();
                    selectElement.dispatchEvent(new Event("blur", { bubbles: true }));
                    yield delay(Math.random() * 500 + 300);
                }
                else {
                    const availableOptions = options
                        .map((opt) => { var _a; return `"${((_a = opt.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ""}" (value: ${opt.value})`; })
                        .join(", ");
                    log(`Could not find an option for "${value}". Available options: ${availableOptions}`);
                    // Find a non-placeholder option as fallback
                    const nonPlaceholderOption = options.find((opt) => {
                        var _a;
                        return opt.value &&
                            opt.value !== "" &&
                            !/(select an option|choose)/i.test((_a = opt.textContent) !== null && _a !== void 0 ? _a : "");
                    });
                    if (nonPlaceholderOption) {
                        element.value = nonPlaceholderOption.value;
                        element.dispatchEvent(new Event("change", { bubbles: true }));
                        nonPlaceholderOption.selected = true;
                    }
                }
            }
            // Handle text/number inputs
            else {
                const isNumericInput = element.type === "number" ||
                    (element.type === "text" &&
                        (element.getAttribute("inputmode") === "numeric" ||
                            /\b(?:\d+\s*)?(?:years?|yrs?|months?|mos?|days?|dys?)\s+(?:[a-z]+\s+){0,3}experience\b/i.test(questionText) ||
                            /how\s+many\s+[a-z]*\s*years?[a-z\s]*experience/i.test(questionText) ||
                            /(?:expected|current)\s+(?:ctc|salary|compensation)/i.test(questionText)));
                // Special handling for experience questions that expect a decimal number
                const isExperienceQuestion = /\b(?:\d+\s*)?years?\s+(?:of\s+)?(?:work\s+)?(?:experience|exp|professional\s+experience|relevant\s+experience)\b/i.test(questionText) ||
                    /\b(?:experience|exp)\s+(?:with|in)\s+\w+/i.test(questionText) ||
                    /\b(?:\d+\s*)?years?\s+(?:of\s+)?(?:\w+\s+)?experience\b/i.test(questionText);
                let finalValue = value;
                // Detect any question asking for years of experience (e.g. 8+, 5 years, etc.)
                const yearsMatch = questionText.match(/(\d+)\s*\+?\s*(?:years?\s+)?(?:of\s+)?(?:experience|exp)/i);
                const askedYears = yearsMatch ? parseInt(yearsMatch[1], 10) : null;
                // If the field is a Yes/No choice (radio / dropdown with only Yes/No)
                const isYesNoQuestion = (element.tagName === "SELECT" &&
                    Array.from(element.options).every((o) => /yes|no/i.test(o.text || ""))) ||
                    (element.type === "radio" &&
                        Array.from(document.querySelectorAll(`input[name="${element.name}"]`)).every((r) => { var _a; return /yes|no/i.test(((_a = r.nextElementSibling) === null || _a === void 0 ? void 0 : _a.textContent) || ""); }));
                // Format numeric inputs properly
                if (isNumericInput) {
                    // For experience questions, use whole numbers 0-99
                    if (isExperienceQuestion) {
                        const numValue = parseFloat(value) || 3;
                        finalValue = String(Math.max(0, Math.min(99, Math.round(numValue))));
                        // Dynamic: any number of years in a Yes/No question → Yes
                        const yearsMatch = questionText.match(/(\d+)\s*\+?\s*(?:years?\s+)?(?:of\s+)?(?:experience|exp)/i);
                        if (yearsMatch &&
                            (element.tagName === "SELECT" ||
                                element.type === "radio")) {
                            finalValue = "Yes";
                        }
                        else {
                            const numValue = parseFloat(finalValue);
                            if (!isNaN(numValue) && isExperienceQuestion) {
                                finalValue = String(Math.max(0, Math.min(99, Math.round(numValue))));
                                log(`Normalized experience value to: ${finalValue}`);
                            }
                        }
                    }
                    else {
                        const numValue = parseFloat(finalValue);
                        if (!isNaN(numValue)) {
                            if (isExperienceQuestion) {
                                finalValue = String(Math.max(0, Math.min(99, Math.round(numValue))));
                                log(`Normalized experience value to: ${finalValue}`);
                            }
                            else if (numValue < 0) {
                                finalValue = "0";
                            }
                        }
                        else if (isExperienceQuestion) {
                            // Default value if all else fails
                            finalValue = "3.0";
                        }
                        finalValue = "3.0";
                    }
                }
                // Simulate typing for text inputs
                if (element.type === "text" ||
                    element.type === "number" ||
                    element.tagName === "TEXTAREA") {
                    yield delay(Math.random() * 300 + 200);
                    element.focus();
                    yield delay(100);
                    // Clear the field first
                    element.value = "";
                    element.dispatchEvent(new Event("input", { bubbles: true }));
                    // Type the value character by character for text inputs
                    if (element.type === "text" || element.tagName === "TEXTAREA") {
                        for (let i = 0; i < finalValue.length; i++) {
                            element.value += finalValue[i];
                            element.dispatchEvent(new Event("input", { bubbles: true }));
                            yield delay(Math.random() * 50 + 30);
                        }
                    }
                    else {
                        // For number inputs, set the value directly
                        element.value = finalValue;
                        element.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                    // Trigger change and blur events
                    element.dispatchEvent(new Event("change", { bubbles: true }));
                    yield delay(200);
                    element.blur();
                    element.dispatchEvent(new Event("blur", { bubbles: true }));
                    yield delay(300);
                }
                else {
                    // For other input types, just set the value directly
                    element.value = finalValue;
                    element.dispatchEvent(new Event("input", { bubbles: true }));
                    element.dispatchEvent(new Event("change", { bubbles: true }));
                }
            }
            // Add a small delay before moving to the next field
            yield delay(Math.random() * 200 + 100);
        });
    }
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "startApply" || request.action === "startBatchApply") {
            if (isApplying) {
                log("Application already in progress.");
                sendResponse({
                    success: false,
                    message: "Application already in progress.",
                });
                return;
            }
            const userData = window.loadUserData();
            log("Received startApply message. Beginning process.");
            processApplication().finally(() => {
                isApplying = false;
                log("Application process has concluded.");
            });
            sendResponse({ success: true });
            return true; // keep channel open for this async response
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
                return; // no async work, so no return true
            }
            isApplying = true;
            log("Starting job application process from BatchApply.js...");
            // Immediately acknowledge the message so the sender's port can close without errors
            sendResponse({ success: true });
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
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                log(`Application failed: ${errorMessage}`);
                chrome.runtime.sendMessage({
                    action: "applicationComplete",
                    success: false,
                    error: errorMessage,
                });
            });
            return true; // keep channel open for this async response
        }
        return;
    });
    // Make processJobApplication globally available
    window.processJobApplication = function () {
        return __awaiter(this, void 0, void 0, function* () {
            log("Starting application process...");
            try {
                // Load user data
                const userData = yield window.loadUserData();
                if (!userData) {
                    log("ERROR: No user data found");
                    return;
                }
                log("User data loaded successfully");
                const easyApplyButton = document.querySelector(".jobs-apply-button--top-card button") ||
                    document.querySelector("#jobs-apply-button-id") ||
                    document.querySelector(".jobs-apply-button");
                if (easyApplyButton) {
                    easyApplyButton.click();
                    yield delay(2000);
                }
                else {
                    throw new Error("Easy Apply button not found on the page.");
                }
                let maxAttempts = 10;
                let attemptCount = 0;
                let lastQuestionCount = -1;
                while (attemptCount < maxAttempts) {
                    attemptCount++;
                    log(`Processing attempt ${attemptCount}/${maxAttempts}`);
                    const currentQuestions = document.querySelectorAll(".fb-dash-form-element");
                    if (currentQuestions.length === lastQuestionCount && attemptCount > 1) {
                        log("Loop detected: question count has not changed. Forcing button search.");
                        break;
                    }
                    lastQuestionCount = currentQuestions.length;
                    yield answerQuestionsOnPage(userData);
                    yield delay(1000);
                    // Check for Next button first
                    const nextButton = document.querySelector('button[aria-label="Continue to next step"], button[aria-label="Next"]');
                    // Check for Review button
                    const reviewButton = document.querySelector('button[aria-label="Review your application"], button[data-live-test-easy-apply-review-button]');
                    if (nextButton && !nextButton.disabled) {
                        log('Clicking "Next" button...');
                        nextButton.click();
                        yield delay(4000);
                        attemptCount = 0;
                    }
                    else if (reviewButton &&
                        !reviewButton.disabled) {
                        log('Found "Review" button. Moving to review step.');
                        break;
                    }
                    else {
                        log("No actionable buttons found. Checking if all questions are answered...");
                        // Check if we're on a success/confirmation page or if no questions found multiple times
                        const successIndicators = document.querySelectorAll('[data-test="success-message"], .artdeco-inline-feedback--success, [aria-label="Done"], .jobs-apply-confirmation, .jobs-apply-success');
                        const questionElements = document.querySelectorAll(".fb-dash-form-element");
                        if (successIndicators.length > 0 ||
                            (questionElements.length === 0 && attemptCount > 2)) {
                            log("Application appears to be successfully submitted or completed. Exiting process.");
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
                        const unansweredFields = document.querySelectorAll('input[aria-required="true"]:not([value]), select[aria-required="true"]:not([value]), input[type="radio"][aria-required="true"]:not(:checked)');
                        if (unansweredFields.length === 0) {
                            log("All required fields appear to be filled. Looking for any available button...");
                            break;
                        }
                        else {
                            log(`Found ${unansweredFields.length} unanswered required fields. Continuing...`);
                        }
                    }
                }
                if (attemptCount >= maxAttempts) {
                    log("Maximum attempts reached. Proceeding to review step...");
                }
                const reviewButton = document.querySelector('button[aria-label="Review your application"]');
                if (reviewButton) {
                    log('Clicking "Review" button...');
                    reviewButton.click();
                    yield delay(2000);
                }
                const submitButton = document.querySelector('button[aria-label="Submit application"]');
                if (submitButton) {
                    log("Final review page. Answering any remaining questions.");
                    yield answerQuestionsOnPage(userData);
                    yield delay(1000);
                    log("Submitting application...");
                    submitButton.click();
                    // Wait for submission to complete
                    log("Waiting for submission to complete...");
                    yield delay(3000);
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
                        yield closeSuccessModal();
                    }
                    else {
                        log("WARNING: Could not confirm submission success");
                    }
                }
                else {
                    log("Could not find the final submit button. Manual review may be required.");
                    chrome.runtime.sendMessage({
                        action: "updateStatus",
                        message: "Could not find submit button.",
                    });
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                log(`ERROR: ${errorMessage}`);
                chrome.runtime.sendMessage({
                    action: "updateStatus",
                    message: `Error: ${errorMessage}`,
                });
            }
        });
    };
    // Expose helper globally
    window.loadUserData = function () {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Try multiple possible paths for the data.json file
                const possiblePaths = [
                    "src/assets/data.json",
                    "src/assests/data.json",
                    "assests/data.json",
                    "assets/data.json",
                ];
                let userData = null;
                let lastError = null;
                for (const path of possiblePaths) {
                    try {
                        const extensionURL = chrome.runtime.getURL(path);
                        const response = yield fetch(extensionURL);
                        if (response.ok) {
                            userData = yield response.json();
                            log(`User data loaded successfully from: ${path}`);
                            break;
                        }
                        else {
                            lastError = `Failed to load from ${path}: ${response.status}`;
                        }
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : "Unknown error";
                        lastError = errorMessage;
                        continue;
                    }
                }
                if (!userData) {
                    log(`ERROR loading user data: ${lastError}`);
                    // Return a default empty structure to prevent null reference errors
                    return {
                        personalInfo: {
                            fullName: "",
                            email: "",
                            phone: "",
                            linkedin: "",
                            location: "",
                        },
                        jobPreferences: {
                            expectedCTC: "",
                            totalITExperience: "",
                            totalMonthsExperience: "",
                            currentSalary: "",
                            servingNoticePeriod: "",
                        },
                        educationAndInternships: {
                            hasBachelorsDegree: false,
                        },
                        documentsAndLinks: {
                            resumeURL: "",
                            coverLetter: "",
                            portfolioURL: "",
                            personalWebsite: "",
                        },
                        assessmentsAndSkills: {
                            githubURL: "",
                            leetcodeURL: "",
                        },
                        behavioralAndMotivation: {
                            strengths: "",
                            weaknesses: "",
                        },
                        legalAndWorkAuth: {
                            authorizedToWorkIn: "",
                            visaType: "",
                            needSponsorship: "",
                        },
                        availability: {
                            startDate: "",
                        },
                        extraAndOptional: {
                            openToRemoteWork: false,
                            lookingForInternship: false,
                            unpaidInternshipComfort: "",
                        },
                        workExperiences: [],
                        education: {
                            gpa: "",
                            graduationDate: "",
                            currentlyEnrolled: false,
                        },
                    };
                }
                return userData;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                log(`ERROR loading user data: ${errorMessage}`);
                // Return default structure on any error
                return {
                    personalInfo: {
                        fullName: "",
                        email: "",
                        phone: "",
                        linkedin: "",
                        location: "",
                    },
                    workExperiences: [],
                    education: {
                        gpa: "",
                        graduationDate: "",
                        currentlyEnrolled: false,
                    },
                    jobPreferences: {
                        expectedCTC: "",
                        totalITExperience: "",
                        totalMonthsExperience: "",
                        currentSalary: "",
                        servingNoticePeriod: "",
                    },
                    skills: {},
                    keywords: {},
                    educationAndInternships: {
                        hasBachelorsDegree: false,
                    },
                    documentsAndLinks: {
                        resumeURL: "",
                        coverLetter: "",
                        portfolioURL: "",
                        personalWebsite: "",
                    },
                    assessmentsAndSkills: {
                        githubURL: "",
                        leetcodeURL: "",
                    },
                    behavioralAndMotivation: {
                        strengths: "",
                        weaknesses: "",
                    },
                    legalAndWorkAuth: {
                        authorizedToWorkIn: "",
                        visaType: "",
                        needSponsorship: "",
                    },
                    availability: {
                        startDate: "",
                    },
                    extraAndOptional: {
                        openToRemoteWork: false,
                        lookingForInternship: false,
                        unpaidInternshipComfort: "",
                    },
                };
            }
        });
    };
    function processApplication() {
        return __awaiter(this, void 0, void 0, function* () {
            log("Starting application process...");
            try {
                const userData = yield window.loadUserData();
                log("User data loaded successfully.");
                const easyApplyButton = document.querySelector(".jobs-apply-button--top-card button") ||
                    document.querySelector("#jobs-apply-button-id") ||
                    document.querySelector(".jobs-apply-button");
                if (easyApplyButton) {
                    easyApplyButton.click();
                    yield delay(2000);
                }
                else {
                    throw new Error("Easy Apply button not found on the page.");
                }
                let maxAttempts = 10;
                let attemptCount = 0;
                let lastQuestionCount = -1;
                while (attemptCount < maxAttempts) {
                    attemptCount++;
                    log(`Processing attempt ${attemptCount}/${maxAttempts}`);
                    const currentQuestions = document.querySelectorAll(".fb-dash-form-element");
                    if (currentQuestions.length === lastQuestionCount && attemptCount > 1) {
                        log("Loop detected: question count has not changed. Forcing button search.");
                        break;
                    }
                    lastQuestionCount = currentQuestions.length;
                    yield answerQuestionsOnPage(userData);
                    yield delay(1000);
                    // Check for Next button first
                    const nextButton = document.querySelector('button[aria-label="Continue to next step"], button[aria-label="Next"]');
                    // Check for Review button
                    const reviewButton = document.querySelector('button[aria-label="Review your application"], button[data-live-test-easy-apply-review-button]');
                    if (nextButton && !nextButton.disabled) {
                        log('Clicking "Next" button...');
                        nextButton.click();
                        yield delay(4000);
                        attemptCount = 0;
                    }
                    else if (reviewButton &&
                        !reviewButton.disabled) {
                        log('Found "Review" button. Moving to review step.');
                        break;
                    }
                    else {
                        log("No actionable buttons found. Checking if all questions are answered...");
                        // Check if we're on a success/confirmation page or if no questions found multiple times
                        const successIndicators = document.querySelectorAll('[data-test="success-message"], .artdeco-inline-feedback--success, [aria-label="Done"], .jobs-apply-confirmation, .jobs-apply-success');
                        const questionElements = document.querySelectorAll(".fb-dash-form-element");
                        if (successIndicators.length > 0 ||
                            (questionElements.length === 0 && attemptCount > 2)) {
                            log("Application appears to be successfully submitted or completed. Exiting process.");
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
                        const unansweredFields = document.querySelectorAll('input[aria-required="true"]:not([value]), select[aria-required="true"]:not([value]), input[type="radio"][aria-required="true"]:not(:checked)');
                        if (unansweredFields.length === 0) {
                            log("All required fields appear to be filled. Looking for any available button...");
                            break;
                        }
                        else {
                            log(`Found ${unansweredFields.length} unanswered required fields. Continuing...`);
                        }
                    }
                }
                if (attemptCount >= maxAttempts) {
                    log("Maximum attempts reached. Proceeding to review step...");
                }
                const reviewButton = document.querySelector('button[aria-label="Review your application"]');
                if (reviewButton) {
                    log('Clicking "Review" button...');
                    reviewButton.click();
                    yield delay(2000);
                }
                const submitButton = document.querySelector('button[aria-label="Submit application"]');
                if (submitButton) {
                    log("Final review page. Answering any remaining questions.");
                    yield answerQuestionsOnPage(userData);
                    yield delay(1000);
                    log("Submitting application...");
                    submitButton.click();
                    // Wait for submission to complete
                    log("Waiting for submission to complete...");
                    yield delay(3000);
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
                        yield closeSuccessModal();
                    }
                    else {
                        log("WARNING: Could not confirm submission success");
                    }
                }
                else {
                    log("Could not find the final submit button. Manual review may be required.");
                    chrome.runtime.sendMessage({
                        action: "updateStatus",
                        message: "Could not find submit button.",
                    });
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                log(`ERROR: ${errorMessage}`);
                chrome.runtime.sendMessage({
                    action: "updateStatus",
                    message: `Error: ${errorMessage}`,
                });
            }
        });
    }
    const keywordMapping = {
        pronoun: "personalInfo.pronouns",
        "country of residence": "personalInfo.countryOfResidence",
        "full name": "personalInfo.fullName",
        email: "personalInfo.email",
        phone: "personalInfo.phone",
        "phone country code": "personalInfo.phoneCountryCode",
        "country code": "personalInfo.phoneCountryCode",
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
        "expected compensation": "jobPreferences.expectedCTC",
        "current salary": "jobPreferences.currentSalary",
        "current ctc": "jobPreferences.currentSalary",
        "total years of professional experience": "jobPreferences.totalITExperience",
        "total additional months of experience": "jobPreferences.totalMonthsExperience",
        remote: "extraAndOptional.openToRemoteWork",
        bachelor: "educationAndInternships.hasBachelorsDegree",
        degree: "educationAndInternships.hasBachelorsDegree",
        resume: "documentsAndLinks.resumeURL",
        "cover letter": "documentsAndLinks.coverLetter",
        portfolio: "documentsAndLinks.portfolioURL",
        website: "documentsAndLinks.personalWebsite",
        github: "assessmentsAndSkills.githubURL",
        leetcode: "assessmentsAndSkills.leetcodeURL",
        linkedin: "personalInfo.linkedin",
        strength: "behavioralAndMotivation.strengths",
        weakness: "behavioralAndMotivation.weaknesses",
        "start date": "availability.startDate",
        "start immediately": "availability.startDate",
        "notice period": "jobPreferences.servingNoticePeriod",
        "serving notice period": "jobPreferences.servingNoticePeriod",
        "are you serving a notice period": "jobPreferences.servingNoticePeriod",
        "already working": "jobPreferences.currentlyWorking",
        "currently working": "jobPreferences.currentlyWorking",
        "are you currently working": "jobPreferences.currentlyWorking",
        "immediate joiner": "jobPreferences.immediateJoiner",
        "immediate to 1 week joiner": "jobPreferences.immediateJoiner",
        hybrid: "jobPreferences.hybridWork",
        "commuting to this job's location": "jobPreferences.commuteToLocation",
        "commute to location": "jobPreferences.commuteToLocation",
        "commuting to job's location": "jobPreferences.commuteToLocation",
        "comfortable commuting": "jobPreferences.commuteToLocation",
        "c#": "jobPreferences.skillRatings.C#",
        "next.js": "jobPreferences.skillRatings.Next.js",
        docker: "jobPreferences.technologies.docker",
        kubernetes: "jobPreferences.technologies.kubernetes",
        container: "jobPreferences.technologies.docker",
        containerization: "jobPreferences.technologies.docker",
        orchestration: "jobPreferences.technologies.kubernetes",
        aws: "jobPreferences.technologies.aws",
        cloud: "jobPreferences.technologies.aws",
        frontend: "jobPreferences.technologies.react",
        redux: "jobPreferences.technologies.redux",
        toolkit: "jobPreferences.technologies.redux",
        tailwind: "jobPreferences.technologies.tailwind",
        figma: "jobPreferences.technologies.figma",
        "figma handoff": "jobPreferences.technologies.figma",
        postgresql: "jobPreferences.technologies.postgresql",
        redis: "jobPreferences.technologies.redis",
        vercel: "jobPreferences.technologies.vercel",
        git: "jobPreferences.technologies.git",
        cicd: "jobPreferences.technologies.cicd",
        react: "jobPreferences.technologies.react",
        node: "jobPreferences.technologies.node",
        python: "jobPreferences.technologies.python",
        java: "jobPreferences.technologies.java",
        commuting: "jobPreferences.commuteToLocation",
        "bachelor's degree": "educationAndInternships.hasBachelorsDegree",
        "bachelor degree": "educationAndInternships.hasBachelorsDegree",
        "us clients": "jobPreferences.immediateJoiner",
        "join in 7 days": "jobPreferences.immediateJoiner",
        "start this job immediately": "jobPreferences.immediateJoiner",
        "start job immediately": "jobPreferences.immediateJoiner",
        "start the job by office immediately": "jobPreferences.immediateJoiner",
        lpa: "jobPreferences.expectedSalary",
        "per annum": "jobPreferences.expectedSalary",
        "expected salary": "jobPreferences.expectedSalary",
        "are you okay with": "jobPreferences.expectedSalary",
        "are you comfortable with": "jobPreferences.expectedSalary",
        "are you willing to accept": "jobPreferences.expectedSalary",
        "do you accept": "jobPreferences.expectedSalary",
        "how many years": "jobPreferences.totalExperience",
        "how many months": "jobPreferences.totalExperience",
        "how much experience": "jobPreferences.totalExperience",
        "total experience": "jobPreferences.totalExperience",
        "do you have": "jobPreferences.totalExperience",
        "are you currently": "jobPreferences.currentlyWorking",
        "are you working": "jobPreferences.currentlyWorking",
        "do you work": "jobPreferences.currentlyWorking",
        "are you available": "availability.startDate",
        "how soon can you": "jobPreferences.noticePeriod",
        "when can you": "availability.startDate",
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
        "comfortable with a 6-month unpaid": "extraAndOptional.unpaidInternshipComfort",
    };
    function getAnswerFromPath(userData, path) {
        const keys = path.split(".");
        let value = userData;
        for (const key of keys) {
            if (value && typeof value === "object" && key in value) {
                value = value[key];
            }
            else {
                return "";
            }
        }
        return value || "";
    }
    function closeSuccessModal() {
        return __awaiter(this, void 0, void 0, function* () {
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
                    const visibleButton = buttons.find((btn) => btn.offsetParent !== null &&
                        !btn.disabled &&
                        (btn.offsetWidth > 0 ||
                            btn.offsetHeight > 0));
                    if (visibleButton) {
                        log(`Clicking close button: ${selector}`);
                        visibleButton.click();
                        yield delay(1000);
                        return;
                    }
                }
                catch (e) {
                    const errorMessage = e instanceof Error ? e.message : "Unknown error";
                    log(`Error with selector ${selector}: ${errorMessage}`);
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
                        yield delay(1000);
                        return;
                    }
                }
            }
            catch (e) {
                const errorMessage = e instanceof Error ? e.message : "Unknown error";
                log(`Error clicking overlay: ${errorMessage}`);
            }
            log("Could not find a way to close the success modal");
        });
    }
    function calculateTotalExperience(workExperiences) {
        if (!workExperiences || workExperiences.length === 0)
            return 0;
        let totalMonths = 0;
        workExperiences.forEach((exp) => {
            const duration = exp.duration || "";
            const months = duration.match(/(\d+)\s*month/i);
            const years = duration.match(/(\d+)\s*year/i);
            if (months)
                totalMonths += parseInt(months[1]);
            if (years)
                totalMonths += parseInt(years[1]) * 12;
        });
        return Math.round(totalMonths / 12);
    }
    function answerQuestionsOnPage(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
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
                            questionText = legendSpan.innerText
                                .trim()
                                .toLowerCase();
                        }
                    }
                }
                // Method 2: Check for regular label (text inputs, dropdowns)
                if (!questionText) {
                    const label = questionContainer.querySelector("label");
                    if (label) {
                        // First try to find the question text in a span with specific class
                        let questionSpan = label.querySelector('span[aria-hidden="true"]') ||
                            label.querySelector(".fb-dash-form-element__label-title") ||
                            label;
                        questionText = questionSpan.innerText
                            .trim()
                            .toLowerCase();
                        // If we still don't have text, try to find any visible text in the container
                        if (!questionText) {
                            questionText = questionContainer.innerText
                                .trim()
                                .toLowerCase();
                        }
                    }
                }
                // Clean up the question text
                if (questionText) {
                    questionText = questionText
                        .replace(/\s+/g, " ") // Replace multiple spaces with one
                        .replace(/[^a-z0-9\s]/g, "") // Remove special characters
                        .trim();
                }
                if (!questionText)
                    continue;
                log(`Processing question: "${questionText}"`);
                let answer = null;
                let dataPath = null;
                const sortedKeywords = Object.keys(keywordMapping).sort((a, b) => b.length - a.length);
                for (const keyword of sortedKeywords) {
                    // Distinguish between "Do you have experience with X?" (yes/no)
                    // and "How many years of experience do you have in X?" (numeric).
                    const isSkillYesNo = /(?:experience|knowledge|proficiency|familiarity)\s+(?:with|of|in)\s+\w+/.test(questionText);
                    const isYearsPrompt = /\bhow\s+many\s+years|\byears?\s+of\s+experience\b/.test(questionText);
                    if (isSkillYesNo && !isYearsPrompt) {
                        // Treat as yes/no skill question; skip years path
                        continue;
                    }
                    if (questionText.includes(keyword)) {
                        dataPath = keywordMapping[keyword];
                        log(`Keyword "${keyword}" matched. Data path is "${dataPath}".`);
                        break;
                    }
                }
                if (!dataPath) {
                    // Handle salary / compensation questions generically
                    if (/\bexpected\s+(?:ctc|salary|compensation|package)\b/i.test(questionText)) {
                        dataPath = "jobPreferences.expectedCTC";
                    }
                    else if (/\bcurrent\s+(?:ctc|salary|compensation)\b/i.test(questionText)) {
                        dataPath = "jobPreferences.currentSalary";
                    }
                }
                // Layer 1: High-priority keyword mapping
                const keywordMap = {
                    salary: "jobPreferences.expectedCTC",
                    ctc: "jobPreferences.expectedCTC",
                    ectc: "jobPreferences.expectedCTC",
                    "notice period": "jobPreferences.noticePeriod",
                    gpa: "education.gpa",
                    "current ctc": "jobPreferences.currentSalary",
                    "current salary": "jobPreferences.currentSalary",
                };
                for (const [keyword, path] of Object.entries(keywordMap)) {
                    if (questionText.toLowerCase().includes(keyword)) {
                        dataPath = path;
                        log(`Layer 1: Keyword match → ${keyword} → ${path}`);
                        break;
                    }
                }
                // Layer 2: Categorical regex patterns
                if (!dataPath) {
                    // Location questions
                    const locationRegex = /\b(?:from|relocate|commute|location)\s+(?:to\s+)?(?:hyderabad|bangalore|mumbai|delhi|chennai|pune|remote|onsite)/i;
                    if (locationRegex.test(questionText)) {
                        const userLocation = ((_b = (_a = userData.personalInfo) === null || _a === void 0 ? void 0 : _a.location) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "";
                        const willingToRelocate = ((_c = userData.jobPreferences) === null || _c === void 0 ? void 0 : _c.willingToRelocate) === true;
                        if (questionText.includes("relocate") && willingToRelocate) {
                            answer = "Yes";
                        }
                        else if (questionText.includes("from") &&
                            userLocation.includes("hyderabad")) {
                            answer = "Yes";
                        }
                        else {
                            answer = "No";
                        }
                        log(`Layer 2: Location question → ${answer}`);
                        dataPath = "location";
                    }
                    // Work authorization questions
                    else if (/\b(?:authorized|authorization|sponsorship|visa|work\s+permit)\b/i.test(questionText)) {
                        const authorized = ((_d = userData.jobPreferences) === null || _d === void 0 ? void 0 : _d.workAuthorization) === "Yes";
                        answer = authorized ? "Yes" : "No";
                        log(`Layer 2: Work authorization → ${answer}`);
                        dataPath = "workAuthorization";
                    }
                    // Technology & skills questions
                    else if (/\b(?:experience|proficiency|knowledge)\s+(?:with|in)\s+([a-zA-Z0-9\-\.\s]+)/i.test(questionText)) {
                        const techMatch = questionText.match(/\b(?:experience|proficiency|knowledge)\s+(?:with|in)\s+([a-zA-Z0-9\-\.\s]+)/i);
                        const technology = ((_e = techMatch === null || techMatch === void 0 ? void 0 : techMatch[1]) === null || _e === void 0 ? void 0 : _e.trim().toLowerCase()) || "";
                        // Ensure we have safe access to user data
                        const userSkills = userData && userData.skills ? userData.skills : {};
                        const workExps = userData && userData.workExperiences
                            ? userData.workExperiences
                            : [];
                        // Check if user has this skill
                        let hasSkill = false;
                        let answer = 0;
                        if (typeof userSkills === "object") {
                            const matchingSkill = Object.keys(userSkills).find((skill) => skill &&
                                ((typeof skill === "string" &&
                                    skill.toLowerCase().includes(technology)) ||
                                    (typeof skill === "object" &&
                                        skill &&
                                        typeof skill === "object" &&
                                        "name" in skill &&
                                        skill.name &&
                                        skill.name.toLowerCase().includes(technology))));
                            if (matchingSkill) {
                                hasSkill = true;
                                if (typeof userSkills[matchingSkill] === "object" &&
                                    userSkills[matchingSkill] &&
                                    typeof userSkills[matchingSkill] === "object" &&
                                    "years" in userSkills[matchingSkill]) {
                                    answer = userSkills[matchingSkill].years;
                                }
                                else {
                                    answer = 2; // Default to 2 years
                                }
                            }
                        }
                        // If no direct skill match, check work experience descriptions
                        if (!hasSkill && Array.isArray(workExps)) {
                            let totalYears = 0;
                            workExps.forEach((exp) => {
                                if (exp &&
                                    exp.description &&
                                    exp.description.toLowerCase().includes(technology)) {
                                    try {
                                        const startDate = exp.startDate
                                            ? new Date(exp.startDate)
                                            : new Date();
                                        const endDate = exp.endDate && exp.endDate.toLowerCase() === "present"
                                            ? new Date()
                                            : exp.endDate
                                                ? new Date(exp.endDate)
                                                : new Date();
                                        const years = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) /
                                            (1000 * 60 * 60 * 24 * 365)));
                                        totalYears += years;
                                    }
                                    catch (dateError) {
                                        // Skip invalid dates
                                    }
                                }
                            });
                            answer = totalYears > 0 ? totalYears : 0;
                        }
                        // If still no answer, provide a reasonable default
                        if (answer === 0) {
                            // Check if it's a common technology
                            const commonTech = [
                                "javascript",
                                "python",
                                "java",
                                "react",
                                "node",
                                "sql",
                                "html",
                                "css",
                            ];
                            if (commonTech.includes(technology)) {
                                answer = 2; // Default for common technologies
                            }
                        }
                        log(`Layer 2: ${technology} experience → ${answer} years`);
                        dataPath = `skills.${technology}`;
                    }
                    // Availability questions
                    else if (/\b(?:how\s+soon|join|start\s+date|availability)\b/i.test(questionText)) {
                        answer = ((_f = userData.jobPreferences) === null || _f === void 0 ? void 0 : _f.noticePeriod) || "15 days";
                        log(`Layer 2: Availability question → ${answer}`);
                        dataPath = "availability";
                    }
                }
                // Layer 3: General yes/no fallback
                if (!dataPath) {
                    const negativeKeywords = [
                        "felony",
                        "convicted",
                        "criminal",
                        "disability",
                        "sponsorship",
                        "visa",
                        "authorized",
                    ];
                    const isYesNoQuestion = /^\s*(?:are\s+you|do\s+you|have\s+you|can\s+you)/i.test(questionText);
                    if (isYesNoQuestion) {
                        const hasNegative = negativeKeywords.some((keyword) => questionText.toLowerCase().includes(keyword));
                        answer = hasNegative ? "No" : "Yes";
                        log(`Layer 3: Generic yes/no → ${answer} (negative: ${hasNegative})`);
                        dataPath = "genericYesNo";
                    }
                }
                if (!dataPath)
                    continue;
                // Handle salary / compensation questions generically
                if (/\bexpected\s+(?:ctc|salary|compensation|package)\b/i.test(questionText)) {
                    dataPath = "jobPreferences.expectedCTC";
                }
                else if (/\bcurrent\s+(?:ctc|salary|compensation)\b/i.test(questionText)) {
                    dataPath = "jobPreferences.currentSalary";
                }
                if (dataPath === "workExperiences" ||
                    (questionText.includes("exp") &&
                        /\bhow many (?:whole )?years of .*?experience\b/i.test(questionText))) {
                    // Skip if we already have a yes/no answer
                    if (answer !== null) {
                        continue;
                    }
                    // Generic experience question: any "how many years... with <anything>"
                    const isExperienceQuestion = /\bhow many (?:whole )?years of .*?experience\b/i.test(questionText);
                    // Determine if the question expects a Yes/No answer rather than numeric
                    const isYesNoQuestion = questionText.includes("do you have") ||
                        questionText.includes("have you worked") ||
                        questionText.includes("have experience");
                    if (isExperienceQuestion && !isYesNoQuestion) {
                        const raw = (_h = (_g = userData.jobPreferences) === null || _g === void 0 ? void 0 : _g.totalExperience) !== null && _h !== void 0 ? _h : "3";
                        const skillName = questionText.match(/\bhow many (?:whole )?years of (?:experience|exp)?\s+with\s+([a-zA-Z0-9\-\.\s]+)/i);
                        if (skillName && skillName[1]) {
                            const skillRating = ((_k = (_j = userData.jobPreferences) === null || _j === void 0 ? void 0 : _j.skillRatings) === null || _k === void 0 ? void 0 : _k[skillName[1]]) || "5";
                            answer = String(Math.max(0, Math.min(99, Math.round(Number(raw)))));
                            log(`Experience question: ${answer} years`);
                        }
                    }
                    // Check if dropdown has Yes/No options
                    const selectElement = questionContainer.querySelector("select");
                    const hasYesNoOptions = selectElement &&
                        Array.from(selectElement.options).some((opt) => {
                            var _a, _b;
                            return (((_a = opt.textContent) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || "") === "yes" ||
                                (((_b = opt.textContent) === null || _b === void 0 ? void 0 : _b.trim().toLowerCase()) || "") === "no";
                        });
                    if (isYesNoQuestion || hasYesNoOptions) {
                        // This is a Yes/No experience question, not a numeric one
                        let skillPart = questionText.split(" in ")[1] || questionText.split(" with ")[1];
                        if (skillPart) {
                            skillPart = skillPart.replace("?", "").trim();
                            const mentionedSkills = skillPart.split(/\s*\/\s*|\s+or\s+|\s*,\s+/);
                            let foundSkill = false;
                            const userSkills = userData.skills
                                ? Object.keys(userData.skills).sort((a, b) => b.length - a.length)
                                : [];
                            for (const s of mentionedSkills) {
                                const cleanSkill = s.trim().toLowerCase();
                                const matchingUserSkill = userSkills.find((userSkill) => userSkill.toLowerCase().includes(cleanSkill));
                                if (matchingUserSkill) {
                                    const exp = (_l = userData.skills) === null || _l === void 0 ? void 0 : _l[matchingUserSkill];
                                    if (exp && exp > 0)
                                        foundSkill = true;
                                    break;
                                }
                            }
                            answer = foundSkill ? "Yes" : "No";
                            log(`Converted experience question to Yes/No: "${answer}"`);
                        }
                        else {
                            answer = "Yes";
                        }
                    }
                    else {
                        let skillPart = questionText.split(" on ")[1] ||
                            questionText.split(" in ")[1] ||
                            questionText.split(" with ")[1];
                        if (skillPart) {
                            skillPart = skillPart.replace("?", "").trim();
                            const mentionedSkills = skillPart.split(/\s*\/\s*|\s+or\s+/);
                            let maxExp = 0;
                            let foundSkill = false;
                            const userSkills = userData.skills
                                ? Object.keys(userData.skills).sort((a, b) => b.length - a.length)
                                : [];
                            for (const s of mentionedSkills) {
                                const cleanSkill = s.trim().toLowerCase();
                                const matchingUserSkill = userSkills.find((userSkill) => userSkill.toLowerCase().includes(cleanSkill));
                                if (matchingUserSkill) {
                                    const exp = (_m = userData.skills) === null || _m === void 0 ? void 0 : _m[matchingUserSkill];
                                    if (exp && exp > maxExp)
                                        maxExp = exp;
                                    foundSkill = true;
                                }
                            }
                            answer = foundSkill
                                ? String(maxExp)
                                : calculateTotalExperience(userData === null || userData === void 0 ? void 0 : userData.workExperiences);
                        }
                        else {
                            answer = calculateTotalExperience(userData === null || userData === void 0 ? void 0 : userData.workExperiences);
                        }
                    }
                }
                else if (dataPath === "extraAndOptional.skillRatings") {
                    const skillKeys = ((_o = userData === null || userData === void 0 ? void 0 : userData.extraAndOptional) === null || _o === void 0 ? void 0 : _o.skillRatings)
                        ? Object.keys(userData.extraAndOptional.skillRatings).sort((a, b) => b.length - a.length)
                        : [];
                    const foundSkillKey = skillKeys.find((skillKey) => questionText.includes(skillKey.toLowerCase()));
                    if (foundSkillKey) {
                        answer =
                            ((_p = userData.extraAndOptional.skillRatings) === null || _p === void 0 ? void 0 : _p[foundSkillKey]) || "";
                    }
                }
                else {
                    answer = getAnswerFromPath(userData, dataPath);
                }
                if (questionText.includes("bachelor") ||
                    questionText.includes("degree")) {
                    const educationKeywords = (_q = userData.education) === null || _q === void 0 ? void 0 : _q.some((edu) => { var _a; return (_a = edu.degree) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes("bachelor"); });
                    answer = educationKeywords ? "Yes" : "No";
                    log(`Derived answer for degree question: "${answer}"`);
                }
                if (dataPath === "availability.startDate" &&
                    (answer === null || answer === void 0 ? void 0 : answer.toString().toLowerCase()) === "asap") {
                    answer = "Yes";
                    log(`Converted 'ASAP' to 'Yes' for start date question.`);
                }
                if (dataPath === "extraAndOptional.unpaidInternshipComfort") {
                    if (typeof answer === "boolean") {
                        answer = answer ? "Yes" : "No";
                        log(`Converted boolean to "${answer}" for internship question.`);
                    }
                    else if (typeof answer === "string") {
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
                    const isPersonalInfoQuestion = questionText.includes("email") ||
                        questionText.includes("phone") ||
                        questionText.includes("country") ||
                        questionText.includes("address") ||
                        questionText.includes("name") ||
                        questionText.includes("location");
                    if (!isPersonalInfoQuestion) {
                        const selectElement = questionContainer.querySelector("select");
                        if (selectElement) {
                            const options = Array.from(selectElement.options).map((opt) => { var _a; return ((_a = opt.textContent) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || ""; });
                            const hasYesNo = options.includes("yes") && options.includes("no");
                            if (hasYesNo) {
                                let defaultAnswer = null;
                                if (questionText.includes("authorized") ||
                                    questionText.includes("eligible") ||
                                    questionText.includes("legally") ||
                                    questionText.includes("work permit") ||
                                    questionText.includes("visa") ||
                                    questionText.includes("citizen")) {
                                    defaultAnswer = "Yes";
                                    log(`Using default "Yes" for work authorization question: "${questionText}"`);
                                }
                                else if (questionText.includes("comfortable") ||
                                    questionText.includes("willing") ||
                                    questionText.includes("able to") ||
                                    questionText.includes("can you") ||
                                    questionText.includes("would you") ||
                                    questionText.includes("do you have")) {
                                    defaultAnswer = "Yes";
                                    log(`Using default "Yes" for comfort/willingness question: "${questionText}"`);
                                }
                                else if (questionText.includes("disability") ||
                                    questionText.includes("criminal") ||
                                    questionText.includes("convicted") ||
                                    questionText.includes("felony") ||
                                    questionText.includes("violation") ||
                                    questionText.includes("drug test")) {
                                    defaultAnswer = "No";
                                    log(`Using default "No" for negative/legal question: "${questionText}"`);
                                }
                                else {
                                    defaultAnswer = "Yes";
                                    log(`Using default "Yes" for general Yes/No question: "${questionText}"`);
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
                    const radioButtons = questionContainer.querySelectorAll('input[type="radio"]');
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
                            if (!labelText &&
                                radio.getAttribute("data-test-text-selectable-option__input")) {
                                const attrValue = radio.getAttribute("data-test-text-selectable-option__input");
                                labelText = attrValue ? attrValue.trim().toLowerCase() : "";
                            }
                            // Normalize the answer text
                            const answerText = String(answer).trim().toLowerCase();
                            // Special handling for Yes/No answers
                            if ((answerText === "yes" || answerText === "no") && labelText) {
                                // Check for variations of Yes/No (y/n, yeah/nope, etc.)
                                const normalizedLabel = labelText.replace(/[^a-z]/g, "");
                                if (answerText === "yes" &&
                                    (normalizedLabel.startsWith("y") ||
                                        normalizedLabel === "yeah" ||
                                        normalizedLabel === "yep")) {
                                    log(`Matched "${labelText}" as "Yes"`);
                                    return true;
                                }
                                if (answerText === "no" &&
                                    (normalizedLabel.startsWith("n") ||
                                        normalizedLabel === "nope" ||
                                        normalizedLabel === "nah")) {
                                    log(`Matched "${labelText}" as "No"`);
                                    return true;
                                }
                            }
                            // Check for direct match (case-insensitive)
                            const isMatch = labelText.toLowerCase() === answerText.toLowerCase();
                            log(`Comparing radio option "${labelText}" with answer "${answerText}": ${isMatch ? "MATCH" : "no match"}`);
                            return isMatch;
                        });
                        if (radioToSelect && !radioToSelect.checked) {
                            log(`Clicking radio button with value: ${radioToSelect.value}`);
                            yield delay(Math.random() * 400 + 200);
                            radioToSelect.click();
                            yield delay(Math.random() * 600 + 400);
                        }
                        else {
                            log(`No matching radio button found for answer: "${answer}"`);
                            const availableOptions = Array.from(radioButtons)
                                .map((radio) => {
                                return (radio.value ||
                                    radio.getAttribute("data-test-text-selectable-option__input") ||
                                    "unknown");
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
                            yield simulateUserInput(selectElement, String(answer));
                        }
                        else {
                            const inputElement = questionContainer.querySelector('input:not([type="radio"]), textarea');
                            if (inputElement) {
                                log(`Simulating input for found element...`);
                                yield simulateUserInput(inputElement, String(answer));
                            }
                            else {
                                log(`Could not find any input field for question: "${questionText}"`);
                            }
                        }
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    log(`Error processing question "${questionText}": ${errorMessage}`);
                }
            }
            yield delay(200);
            log("Finished answering questions on this page.");
        });
    }
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "startApply" || request.action === "startBatchApply") {
            if (isApplying) {
                log("Application already in progress.");
                sendResponse({
                    success: false,
                    message: "Application already in progress.",
                });
                return;
            }
            const userData = window.loadUserData();
            log("Received startApply message. Beginning process.");
            processApplication().finally(() => {
                isApplying = false;
                log("Application process has concluded.");
            });
            sendResponse({ success: true });
            return true; // keep channel open for this async response
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
                return; // no async work, so no return true
            }
            isApplying = true;
            log("Starting job application process from BatchApply.js...");
            // Immediately acknowledge the message so the sender's port can close without errors
            sendResponse({ success: true });
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
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                log(`Application failed: ${errorMessage}`);
                chrome.runtime.sendMessage({
                    action: "applicationComplete",
                    success: false,
                    error: errorMessage,
                });
            });
            return true; // keep channel open for this async response
        }
        return;
    });
})();
//# sourceMappingURL=Content.js.map