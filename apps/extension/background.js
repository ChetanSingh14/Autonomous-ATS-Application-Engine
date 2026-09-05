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
 * Returns the best direct application form URL for the targeted ATS platform
 */
function getTargetApplyUrl(job) {
  if (job.atsPlatform === 'GREENHOUSE' && job.externalId) {
    return `https://boards.greenhouse.io/embed/job_app?for=${job.company}&token=${job.externalId}`;
  }
  if (job.atsPlatform === 'LEVER' && job.externalId) {
    return `https://jobs.lever.co/${job.company}/${job.externalId}/apply`;
  }
  if (job.atsPlatform === 'ASHBY' && job.externalId) {
    return `https://jobs.ashbyhq.com/${job.company}/${job.externalId}`;
  }
  return job.url;
}

/**
 * Determines which content script to inject programmatically if not auto-injected
 */
function getContentScriptFile(atsPlatform) {
  switch (atsPlatform) {
    case 'GREENHOUSE':
      return 'content-greenhouse.js';
    case 'LEVER':
      return 'content-lever.js';
    case 'ASHBY':
      return 'content-ashby.js';
    case 'LINKEDIN':
      return 'content-linkedin.js';
    case 'INTERNSHALA':
      return 'content-internshala.js';
    case 'NAUKRI':
      return 'content-naukri.js';
    case 'WELLFOUND':
      return 'content-wellfound.js';
    default:
      return 'content-greenhouse.js';
  }
}

/**
 * Sends message to tab content script with automatic retry and programmatic injection fallback
 */
async function sendMessageWithRetry(tabId, message, atsPlatform, retries = 5) {
  const scriptFile = getContentScriptFile(atsPlatform);

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
      console.log(`[Extension Background] Retry ${i + 1}/${retries} waiting for content script listener... (${err.message})`);
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: [scriptFile],
        });
        console.log(`[Extension Background] Programmatically injected ${scriptFile} into tab ${tabId}`);
      } catch (injectErr) {
        console.warn(`[Extension Background] Injection attempt ${i + 1} skipped/failed:`, injectErr.message);
      }
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
      const res = await fetch(`${API_HOST}/jobs/next-queued`).catch((err) => {
        console.error('[Extension Background] Backend fetch error:', err.message);
        return null;
      });

      if (!res || !res.ok) break;

      const data = await res.json();
      if (!data || !data.job) {
        console.log('[Extension Background] Queue is empty. Standing by for new jobs...');
        break;
      }

      const { job, profile } = data;
      console.log(`[Extension Background] Claimed job for Auto-Apply: ${job.title} at ${job.company}`);

      const targetUrl = getTargetApplyUrl(job);
      console.log(`[Extension Background] Opening candidate application URL: ${targetUrl}`);

      // Create tab to load the ATS application page in candidate's authenticated browser session
      const tab = await chrome.tabs.create({ url: targetUrl, active: true });

      await new Promise((resolve) => {
        const tabListener = async (tabId, changeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(tabListener);

            // Wait 2.5s for dynamic DOM scripts & fields to render
            await new Promise((r) => setTimeout(r, 2500));

            // Send autofill + auto-submit instruction
            await sendMessageWithRetry(
              tab.id,
              {
                action: 'EXECUTE_AUTOFILL_AND_SUBMIT',
                job,
                profile,
              },
              job.atsPlatform
            );

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

// Listen for manual trigger commands and API proxy requests from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TRIGGER_POLL_NOW') {
    startContinuousAutoApply().then(() => sendResponse({ status: 'DONE' }));
    return true;
  }

  // Proxy backend API calls from content scripts to avoid HTTPS Mixed Content / CSP errors
  if (request.action === 'API_CALL') {
    fetch(request.url, request.options)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        sendResponse({ success: res.ok, status: res.status, data });
      })
      .catch((err) => {
        console.error('[Extension Proxy Error]:', err.message);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep message channel open for async response
  }
});

