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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXECUTE_AUTOFILL') {
    runWellfoundAutomator(request.job, request.profile).then(() => {
      sendResponse({ status: 'COMPLETED' });
    });
    return true;
  }
});
