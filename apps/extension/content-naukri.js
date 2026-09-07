(() => {
  if (window.hasRunNaukriContentScript) return;
  window.hasRunNaukriContentScript = true;

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

  async function autoCaptureNaukriJob() {
    try {
      const titleEl = document.querySelector('h1.styles_jd-header-title__r2Xfd, h1.jd-header-title, h1');
      const companyEl = document.querySelector('a.styles_jd-header-comp-name__M2_ae, .jd-header-comp-name');
      const locationEl = document.querySelector('.styles_jcl__location__a21_Y, .location');
      const descEl = document.querySelector('.styles_Jd-dscrptn__b1_3L, .danger-markup, section.job-desc');

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
              atsPlatform: 'NAUKRI',
              description,
            }),
          },
        });
        console.log(`[Naukri Auto-Capture] Captured job: '${title}' at '${company}'`);
      }
    } catch (err) {
      // Ignore extraction errors
    }
  }

  setTimeout(autoCaptureNaukriJob, 2000);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXECUTE_AUTOFILL' || request.action === 'EXECUTE_AUTOFILL_AND_SUBMIT') {
      runNaukriAutomator(request.job, request.profile).then(() => {
        sendResponse({ status: 'COMPLETED' });
      });
      return true;
    }
  });
})();
