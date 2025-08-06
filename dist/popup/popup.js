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
// Main popup functionality with TypeScript
document.addEventListener("DOMContentLoaded", () => {
    const statusDiv = document.getElementById("status");
    const batchApplyBtn = document.getElementById("batch-apply-btn");
    // Initially disable button
    batchApplyBtn.disabled = true;
    // Check current tab and enable/disable functionality
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => __awaiter(void 0, void 0, void 0, function* () {
        const tab = tabs[0];
        // Validate LinkedIn jobs page
        if (!tab ||
            !tab.url ||
            !tab.url.startsWith("https://www.linkedin.com/jobs")) {
            statusDiv.textContent = "Please open a LinkedIn jobs page first.";
            statusDiv.style.color = "red";
            return;
        }
        // Enable button for valid LinkedIn jobs page
        batchApplyBtn.disabled = false;
        // Handle batch apply button click
        batchApplyBtn.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
            statusDiv.textContent = "Starting batch apply to all jobs...";
            statusDiv.style.color = "inherit";
            try {
                // Inject required scripts
                yield chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["dist/js/Content.js"],
                });
                yield chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["dist/js/BatchApply.js"],
                });
                // Small delay to ensure scripts are loaded
                yield new Promise((resolve) => setTimeout(resolve, 500));
                try {
                    const tabId = tabs[0].id;
                    // Retry mechanism for message sending
                    const retry = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (attempts = 2) {
                        for (let i = 0; i < attempts; i++) {
                            try {
                                yield chrome.tabs.sendMessage(tabId, {
                                    action: "startBatchApply",
                                });
                                statusDiv.textContent = "Batch apply started!";
                                return;
                            }
                            catch (err) {
                                if (i === attempts - 1)
                                    throw err;
                                yield new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1s then retry
                            }
                        }
                    });
                    yield retry();
                    statusDiv.textContent = "Batch apply started successfully!";
                    setTimeout(() => window.close(), 1000);
                }
                catch (error) {
                    console.error("Failed to start batch apply:", error);
                    statusDiv.textContent =
                        "Error: Failed to start batch apply. Please refresh the page and try again.";
                    statusDiv.style.color = "red";
                }
            }
            catch (error) {
                console.error(error);
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                statusDiv.textContent = `Error: ${errorMessage}. Please refresh the page and try again.`;
                statusDiv.style.color = "red";
            }
        }));
    }));
});
//# sourceMappingURL=popup.js.map