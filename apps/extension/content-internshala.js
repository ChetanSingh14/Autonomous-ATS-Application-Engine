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

async function runInternshalaAutomator(job, profile) {
  console.log('[Internshala Runner] Commencing Internshala form fill...');

  const applyNowBtn = document.querySelector('#easy_apply_button, .apply_now_button, #apply_now');
  if (applyNowBtn) {
    applyNowBtn.click();
    await sleep(1000);
  }

  // Answer cover letter / why should we hire you question via Gemini
  const textareas = document.querySelectorAll('textarea');
  for (const textarea of textareas) {
    if (textarea && textarea.value.trim() === '') {
      try {
        const res = await fetch(`${BACKEND}/ai/answer-question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: 'Why should you be hired for this role?',
            fieldType: 'text',
          }),
        });
        const { answer } = await res.json();
        if (answer) {
          setNativeValue(textarea, answer);
          await sleep(200);
        }
      } catch (err) {
        console.error('[Internshala Runner Error]:', err);
      }
    }
  }

  // Log applied status
  await fetch(`${BACKEND}/jobs/${job.id}/applied`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'SUBMITTED', filledFields: { internshalaFilled: true } }),
  });

  console.log('[Internshala Runner] Internshala application logged.');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXECUTE_AUTOFILL') {
    runInternshalaAutomator(request.job, request.profile).then(() => {
      sendResponse({ status: 'COMPLETED' });
    });
    return true;
  }
});
