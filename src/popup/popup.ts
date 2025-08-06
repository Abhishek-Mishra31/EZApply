
document.addEventListener("DOMContentLoaded", () => {
  const statusDiv = document.getElementById("status") as HTMLElement;
  const batchApplyBtn = document.getElementById("batch-apply-btn") as HTMLButtonElement;

  batchApplyBtn.disabled = true;

  // Check current tab and enable/disable functionality
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs: chrome.tabs.Tab[]) => {
    const tab = tabs[0];

    // Validate LinkedIn jobs page
    if (
      !tab ||
      !tab.url ||
      !tab.url.startsWith("https://www.linkedin.com/jobs")
    ) {
      statusDiv.textContent = "Please open a LinkedIn jobs page first.";
      statusDiv.style.color = "red";
      return;
    }

    // Enable button for valid LinkedIn jobs page
    batchApplyBtn.disabled = false;

    // Handle batch apply button click
    batchApplyBtn.addEventListener("click", async () => {
      statusDiv.textContent = "Starting batch apply to all jobs...";
      statusDiv.style.color = "inherit";

      try {
        // Inject required scripts
        await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          files: ["dist/js/Content.js"],
        });
        
        await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          files: ["dist/js/BatchApply.js"],
        });

        await new Promise<void>((resolve) => setTimeout(resolve, 500));

        try {
          const tabId = tabs[0].id!;
          
          // Retry mechanism for message sending
          const retry = async (attempts: number = 2): Promise<void> => {
            for (let i = 0; i < attempts; i++) {
              try {
                await chrome.tabs.sendMessage(tabId, {
                  action: "startBatchApply",
                });
                statusDiv.textContent = "Batch apply started!";
                return;
              } catch (err) {
                if (i === attempts - 1) throw err;
                await new Promise<void>((resolve) => setTimeout(resolve, 1000)); // wait 1s then retry
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
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        statusDiv.textContent = `Error: ${errorMessage}. Please refresh the page and try again.`;
        statusDiv.style.color = "red";
      }
    });
  });
});
