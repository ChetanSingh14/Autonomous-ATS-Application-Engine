const BACKEND = 'http://localhost:4000/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runNaukriAutomator(job, profile) {
  console.log('[Naukri Runner] Executing Naukri application fill...');

  const applyBtn = document.querySelector('#apply-button, button.apply-button, .apply-button-container button');
  if (applyBtn) {
    applyBtn.click();
    await sleep(800);
  }

  await fetch(`${BACKEND}/jobs/${job.id}/applied`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'SUBMITTED', filledFields: { naukriFilled: true } }),
  });

  console.log('[Naukri Runner] Naukri application logged.');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXECUTE_AUTOFILL') {
    runNaukriAutomator(request.job, request.profile).then(() => {
      sendResponse({ status: 'COMPLETED' });
    });
    return true;
  }
});
