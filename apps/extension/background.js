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

        // Allow DOM scripts to complete initial rendering
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'EXECUTE_AUTOFILL',
            job,
            profile,
          });
        }, 2500);
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
