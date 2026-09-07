const BACKEND = 'http://localhost:4000/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setNativeValue(element, value) {
  const prototype = Object.getPrototypeOf(element);
  const setter =
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set ||
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

async function runWellfoundAutomator(job, profile) {
  console.log('[Wellfound Runner] Executing Wellfound application fill...');

  const applyBtn = document.querySelector('button[data-test="ApplyButton"], button.styles_applyButton__2c4w_');
  if (applyBtn) {
    applyBtn.click();
    await sleep(800);
  }

  // Cover letter text area
  const textarea = document.querySelector('textarea[name="userNote"], textarea');
  if (textarea && textarea.value.trim() === '') {
    try {
      const res = await fetch(`${BACKEND}/ai/answer-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Write a short note to the founder explaining why you are a great fit for this engineering role.',
          fieldType: 'text',
        }),
      });
      const { answer } = await res.json();
      if (answer) {
        setNativeValue(textarea, answer);
        await sleep(200);
      }
    } catch (err) {
      console.error('[Wellfound Runner Error]:', err);
    }
  }

  await fetch(`${BACKEND}/jobs/${job.id}/applied`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'SUBMITTED', filledFields: { wellfoundFilled: true } }),
  });

  console.log('[Wellfound Runner] Wellfound application logged.');
}

// Auto-capture Wellfound Job Details when browsing Wellfound jobs
async function autoCaptureWellfoundJob() {
  try {
    const titleEl = document.querySelector('h1, h2.styles_title__123, [class*="jobTitle"]');
    const companyEl = document.querySelector('[class*="companyName"], h2 a, [class*="startupName"]');
    const locationEl = document.querySelector('[class*="locationText"], [class*="location"]');
    const descEl = document.querySelector('[class*="descriptionText"], [class*="jobDescription"]');

    if (titleEl && (companyEl || descEl)) {
      const title = titleEl.innerText.trim();
      const company = companyEl ? companyEl.innerText.trim() : 'Company';
      const location = locationEl ? locationEl.innerText.trim() : 'Remote';
      const description = descEl ? descEl.innerHTML.trim() : title;
      const url = window.location.href;

      chrome.runtime.sendMessage({
        action: 'API_CALL',
        url: `${BACKEND}/jobs/ingest-custom`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            company,
            location,
            url,
            atsPlatform: 'WELLFOUND',
            description,
          }),
        },
      });
      console.log(`[Wellfound Auto-Capture] Captured job: '${title}' at '${company}'`);
    }
  } catch (err) {
    // Ignore extraction errors on non-job pages
  }
}

setTimeout(autoCaptureWellfoundJob, 2000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXECUTE_AUTOFILL' || request.action === 'EXECUTE_AUTOFILL_AND_SUBMIT') {
    runWellfoundAutomator(request.job, request.profile).then(() => {
      sendResponse({ status: 'COMPLETED' });
    });
    return true;
  }
});

