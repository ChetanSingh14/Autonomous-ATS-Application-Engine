(() => {
  if (window.hasRunInternshalaContentScript) return;
  window.hasRunInternshalaContentScript = true;

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

  // Auto-capture & Scrape visible Internshala job listings from search/detail page
  async function autoCaptureInternshalaJobs() {
    try {
      const jobCards = document.querySelectorAll('.individual_internship, .job-card, [id*="individual_internship"], .container-fluid');
      let count = 0;

      for (const card of jobCards) {
        const titleEl = card.querySelector('.job-title-href, .heading_4_5 a, h3.heading_4_5, a[href*="/job/detail/"]');
        const companyEl = card.querySelector('.company-name, .heading_6_company_name, a.link_display_like_text');
        const locationEl = card.querySelector('#location_names, .locations, .location_link');
        const descEl = card.querySelector('.job-description, .overview_container, .other_detail_item');

        if (titleEl) {
          const title = titleEl.innerText.trim();
          const company = companyEl ? companyEl.innerText.trim() : 'Company';
          const location = locationEl ? locationEl.innerText.trim() : 'Work from home';
          const url = titleEl.href || window.location.href;
          const description = descEl ? descEl.innerText.trim() : `${title} at ${company}`;

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
                atsPlatform: 'INTERNSHALA',
                description,
              }),
            },
          });
          count++;
        }
      }

      if (count > 0) {
        console.log(`[Internshala Auto-Capture] Captured ${count} visible job postings from Internshala page.`);
      }
    } catch (err) {
      // Ignore non-job pages
    }
  }

  // Inject Floating "⚡ Ingest Page Jobs" Button on Internshala Pages
  function injectInternshalaFloatingButton() {
    if (document.getElementById('autoapply-internshala-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'autoapply-internshala-btn';
    btn.innerHTML = '⚡ Auto-Ingest Internshala Jobs';
    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #ffffff;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 700;
      padding: 10px 18px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.5);
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    btn.addEventListener('click', async () => {
      btn.innerHTML = '⏳ Ingesting Jobs to Pipeline...';
      btn.style.opacity = '0.7';
      await autoCaptureInternshalaJobs();
      btn.innerHTML = '✅ Jobs Ingested! AI Scoring...';
      setTimeout(() => {
        btn.innerHTML = '⚡ Auto-Ingest Internshala Jobs';
        btn.style.opacity = '1';
      }, 3000);
    });

    document.body.appendChild(btn);
  }

  setTimeout(() => {
    injectInternshalaFloatingButton();
    autoCaptureInternshalaJobs();
  }, 2000);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXECUTE_AUTOFILL' || request.action === 'EXECUTE_AUTOFILL_AND_SUBMIT') {
      runInternshalaAutomator(request.job, request.profile).then(() => {
        sendResponse({ status: 'COMPLETED' });
      });
      return true;
    }
  });
})();
