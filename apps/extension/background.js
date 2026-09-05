const API_HOST = 'http://localhost:4000/api';
let isProcessing = false;

// Create periodic alarm every 15 seconds to ensure queue is continuously auto-processed
chrome.alarms.create('poll_apply_queue', { periodInMinutes: 0.25 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'poll_apply_queue' && !isProcessing) {
    await startContinuousAutoApply();
  }
});

// Auto-trigger continuous runner on extension startup
chrome.runtime.onStartup.addListener(() => {
  startContinuousAutoApply();
});

chrome.runtime.onInstalled.addListener(() => {
  startContinuousAutoApply();
});

/**
 * Sends message to tab content script with automatic retry until content script listener is active
 */
async function sendMessageWithRetry(tabId, message, retries = 6) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (res) => {
          const err = chrome.runtime.lastError;
          if (err) {
            return reject(err);
          }
          resolve(res);
        });
      });
      console.log('[Extension Background] Message delivered to tab content script:', response);
      return response;
    } catch (err) {
      console.log(`[Extension Background] Retry ${i + 1}/${retries} waiting for tab content script to initialize...`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

/**
 * Continuous Auto-Apply Engine Loop: Automatically processes queued jobs sequentially until empty
 */
async function startContinuousAutoApply() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      const res = await fetch(`${API_HOST}/jobs/next-queued`);
      if (!res.ok) break;

      const data = await res.json();
      if (!data || !data.job) {
        console.log('[Extension Background] Queue is empty. Standing by for new jobs...');
        break;
      }

      const { job, profile } = data;
      console.log(`[Extension Background] Claimed job for Auto-Apply: ${job.title} at ${job.company}`);

      // Create tab to load the ATS application page in candidate's authenticated browser session
      const tab = await chrome.tabs.create({ url: job.url, active: true });

      await new Promise((resolve) => {
        const tabListener = async (tabId, changeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(tabListener);

            // Wait 2s for dynamic DOM scripts to load
            await new Promise((r) => setTimeout(r, 2000));

            // Send autofill + auto-submit instruction
            const response = await sendMessageWithRetry(tab.id, {
              action: 'EXECUTE_AUTOFILL_AND_SUBMIT',
              job,
              profile,
            });

            // Wait 4s after submission for form POST to complete, then close tab
            await new Promise((r) => setTimeout(r, 4000));
            try {
              await chrome.tabs.remove(tab.id);
            } catch (e) {
              // Tab already closed
            }
            resolve(true);
          }
        };
        chrome.tabs.onUpdated.addListener(tabListener);
      });

      // Brief delay before processing next queued application
      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (err) {
    console.error('[Extension Background Error]:', err);
  } finally {
    isProcessing = false;
  }
}

// Listen for manual trigger commands from popup or dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TRIGGER_POLL_NOW') {
    startContinuousAutoApply().then(() => sendResponse({ status: 'DONE' }));
    return true;
  }
});

