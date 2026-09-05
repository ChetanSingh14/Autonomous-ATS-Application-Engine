const API_HOST = 'http://localhost:4000/api';
let isProcessing = false;

// Create periodic alarm to prevent Service Worker sleep cycle issues in Manifest V3
chrome.alarms.create('poll_apply_queue', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'poll_apply_queue' && !isProcessing) {
    await processNextApplication();
  }
});

/**
 * Sends message to tab content script with automatic retry until content script listener is active
 */
async function sendMessageWithRetry(tabId, message, retries = 5) {
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
 * Polls the local API queue and triggers tab navigation + content script execution
 */
async function processNextApplication() {
  isProcessing = true;
  try {
    const res = await fetch(`${API_HOST}/jobs/next-queued`);
    if (!res.ok) return;

    const data = await res.json();
    if (!data || !data.job) {
      console.log('[Extension Background] Queue empty. Standing by...');
      return;
    }

    const { job, profile } = data;
    console.log(`[Extension Background] Claimed job: ${job.title} at ${job.company}`);

    // Create tab to load the ATS application page in candidate's authenticated browser session
    const tab = await chrome.tabs.create({ url: job.url, active: true });

    chrome.tabs.onUpdated.addListener(function tabListener(tabId, changeInfo) {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(tabListener);

        // Send message with automatic retry to handle content script loading delays
        setTimeout(async () => {
          await sendMessageWithRetry(tab.id, {
            action: 'EXECUTE_AUTOFILL',
            job,
            profile,
          });
        }, 2000);
      }
    });
  } catch (err) {
    console.error('[Extension Background Error]:', err);
  } finally {
    isProcessing = false;
  }
}

// Listen for manual trigger commands from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TRIGGER_POLL_NOW') {
    processNextApplication().then(() => sendResponse({ status: 'DONE' }));
    return true;
  }
});
