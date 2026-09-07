(() => {
  if (window.hasRunLinkedInContentScript) return;
  window.hasRunLinkedInContentScript = true;

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

  function attachBase64Pdf(fileInputElement, base64Pdf, fileName) {
    try {
      const binary = atob(base64Pdf);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([array], { type: 'application/pdf' });
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      fileInputElement.files = dataTransfer.files;
      fileInputElement.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('[LinkedIn Runner] Tailored PDF attached to LinkedIn form.');
    } catch (err) {
      console.error('[LinkedIn Runner Error] Resume attachment failed:', err);
    }
  }

  async function runLinkedInAutomator(job, profile) {
    console.log('[LinkedIn Runner] Commencing LinkedIn Easy Apply filling...');

    const easyApplyBtn = document.querySelector('.jobs-apply-button, button[aria-label*="Easy Apply"]');
    if (easyApplyBtn) {
      easyApplyBtn.click();
      await sleep(1000);
    }

    const mappings = [
      { sel: 'input[id*="phoneNumber"], input[name*="phone"]', val: profile.phone },
      { sel: 'input[id*="email"], input[name*="email"]', val: profile.email },
    ];

    for (const { sel, val } of mappings) {
      const el = document.querySelector(sel);
      if (el && val) {
        setNativeValue(el, val);
        await sleep(150);
      }
    }

    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput && job.tailoredPdf) {
      attachBase64Pdf(fileInput, job.tailoredPdf, `${profile.firstName}_${profile.lastName}_Resume.pdf`);
      await sleep(300);
    }

    await fetch(`${BACKEND}/jobs/${job.id}/applied`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SUBMITTED', filledFields: { linkedinFilled: true } }),
    });

    console.log('[LinkedIn Runner] LinkedIn application logged.');
  }

  async function autoCaptureLinkedInJob() {
    try {
      const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1');
      const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-postings-header__company-name');
      const locationEl = document.querySelector('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet');
      const descEl = document.querySelector('#job-details, .jobs-description-content, .jobs-box__html-content');

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
              atsPlatform: 'LINKEDIN',
              description,
            }),
          },
        });
        console.log(`[LinkedIn Auto-Capture] Captured job: '${title}' at '${company}'`);
      }
    } catch (err) {
      // Ignore non-job pages
    }
  }

  setTimeout(autoCaptureLinkedInJob, 2000);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXECUTE_AUTOFILL' || request.action === 'EXECUTE_AUTOFILL_AND_SUBMIT') {
      runLinkedInAutomator(request.job, request.profile).then(() => {
        sendResponse({ status: 'COMPLETED' });
      });
      return true;
    }
  });
})();
