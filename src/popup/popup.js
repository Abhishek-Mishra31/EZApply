document.addEventListener("DOMContentLoaded", () => {
  const statusDiv = document.getElementById("status");
  const batchApplyBtn = document.getElementById("batch-apply-btn");

  batchApplyBtn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];

    // 1. Must be on LinkedIn Jobs page
    if (
      !tab ||
      !tab.url ||
      !tab.url.startsWith("https://www.linkedin.com/jobs")
    ) {
      statusDiv.textContent = "Please open a LinkedIn jobs page first.";
      statusDiv.style.color = "red";
      return;
    }

    // 2. Extension icon is only enabled when URL contains 'easy-apply'
    //    (handled by background script), so we can safely enable the button
    batchApplyBtn.disabled = false;

    batchApplyBtn.addEventListener("click", async () => {
      statusDiv.textContent = "Starting batch apply to all jobs...";
      statusDiv.style.color = "inherit";

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["src/js/Content.js"],
        });
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["src/js/BatchApply.js"],
        });

        await new Promise((r) => setTimeout(r, 500));

        try {
          const tabId = tabs[0].id;
          const retry = async (attempts = 2) => {
            for (let i = 0; i < attempts; i++) {
              try {
                await chrome.tabs.sendMessage(tabId, {
                  action: "startBatchApply",
                });
                statusDiv.textContent = "Batch apply started!";
                return;
              } catch (err) {
                if (i === attempts - 1) throw err;
                await new Promise((r) => setTimeout(r, 1000)); // wait 1s then retry
              }
            }
          };
          await retry();
          statusDiv.textContent = "Batch apply started successfully!";
          setTimeout(() => window.close(), 1000);
        } catch (error) {
          console.error("Failed to start batch apply:", error);
          statusDiv.textContent =
            "Error: Failed to start batch apply. Please refresh the page and try again.";
          statusDiv.style.color = "red";
        }
      } catch (error) {
        console.error(error);
        statusDiv.textContent = `Error: ${error.message}. Please refresh the page and try again.`;
        statusDiv.style.color = "red";
      }
    });
  });
});
