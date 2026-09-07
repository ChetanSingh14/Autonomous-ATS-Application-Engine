(() => {
  if (window.hasRunGreenhouseContentScript) return;
  window.hasRunGreenhouseContentScript = true;

  const BACKEND = 'http://localhost:4000/api';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * Native prototype descriptor bypass to satisfy React/Vue synthetic event listeners
   */
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

  /**
   * Converts Base64 PDF buffer to a binary File object and attaches to input via DataTransfer
   */
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
      console.log('[AutoApply Runner] Tailored PDF attached to input successfully.');
    } catch (err) {
      console.error('[AutoApply Runner Error] Failed to attach PDF binary:', err);
    }
  }

  async function apiCall(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'API_CALL',
          url: `${BACKEND}${endpoint}`,
          options: {
            method,
            headers: { 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}),
          },
        },
        (response) => {
          const err = chrome.runtime.lastError;
          if (err) return reject(err);
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'API call failed'));
          }
        }
      );
    });
  }

  function isBlockingCaptchaPresent() {
    const captchas = Array.from(
      document.querySelectorAll(
        'iframe[src*="recaptcha/api2/bframe"], iframe[src*="hcaptcha.com/captcha/v1/"], iframe[title*="recaptcha challenge"], iframe[title*="hCaptcha challenge"]'
      )
    );

    return captchas.some((iframe) => {
      const style = window.getComputedStyle(iframe);
      const rect = iframe.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 200 &&
        rect.height > 200
      );
    });
  }

  /**
   * Automated Greenhouse Form Filler Engine
   */
  async function runGreenhouseAutomator(job, profile) {
    console.log('[AutoApply Runner] Commencing Greenhouse form filling pipeline...');

    // Check for active blocking CAPTCHA challenges
    if (isBlockingCaptchaPresent()) {
      console.warn('[AutoApply Runner] Active CAPTCHA challenge detected! Flagging for manual review...');
      await apiCall(`/jobs/${job.id}/applied`, 'POST', {
        status: 'REQUIRES_MANUAL_REVIEW',
        filledFields: { captchaDetected: true },
      }).catch(() => {});
      return;
    }

    // 1. Core Profile Fields Injection
    const standardMappings = [
      { sel: '#first_name, input[name*="first_name"]', val: profile.firstName },
      { sel: '#last_name, input[name*="last_name"]', val: profile.lastName },
      { sel: '#email, input[name*="email"]', val: profile.email },
      { sel: '#phone, input[name*="phone"]', val: profile.phone },
      { sel: 'input[autocomplete*="linkedin"], input[name*="linkedin"]', val: profile.linkedinUrl },
      { sel: 'input[autocomplete*="website"], input[name*="website"], input[name*="github"]', val: profile.githubUrl },
    ];

    for (const { sel, val } of standardMappings) {
      const input = document.querySelector(sel);
      if (input && val) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setNativeValue(input, val);
        await sleep(150 + Math.random() * 100); // Human synthetic jitter
      }
    }

    // 2. Attach Tailored PDF Resume
    const fileInput = document.querySelector('input[type="file"][id*="resume"], input[type="file"][name*="resume"]');
    if (fileInput && job.tailoredPdf) {
      attachBase64Pdf(fileInput, job.tailoredPdf, `${profile.firstName}_${profile.lastName}_Resume.pdf`);
      await sleep(400);
    }

    // 3. Radio Buttons & Yes/No Screening Questions
    const radioContainers = document.querySelectorAll('.field, div[class*="field"], fieldset');
    for (const container of radioContainers) {
      const radios = Array.from(container.querySelectorAll('input[type="radio"]'));
      if (radios.length === 0 || radios.some((r) => r.checked)) continue;

      const label = container.querySelector('label, legend');
      const questionText = label ? label.innerText.trim() : '';

      const options = radios.map((r) => {
        const rLabel = container.querySelector(`label[for="${r.id}"]`) || r.parentElement;
        return { input: r, text: (rLabel ? rLabel.innerText : r.value || '').trim() };
      });

      const optTexts = options.map((o) => o.text).filter(Boolean);
      try {
        const data = await apiCall('/ai/answer-question', 'POST', {
          question: questionText || 'Are you authorized to work?',
          fieldType: 'radio',
          options: optTexts.length ? optTexts : ['Yes', 'No'],
        });

        let chosen = options[0]?.input;
        if (data && data.answer) {
          const match = options.find((o) => o.text.toLowerCase().includes(data.answer.toLowerCase()));
          if (match) chosen = match.input;
        }
        if (chosen) {
          chosen.checked = true;
          chosen.dispatchEvent(new Event('change', { bubbles: true }));
          chosen.dispatchEvent(new Event('click', { bubbles: true }));
          await sleep(150);
        }
      } catch (err) {
        console.warn('[AutoApply Runner] Radio resolution skipped:', err.message);
      }
    }

    // 4. Consent & Privacy Checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of checkboxes) {
      if (!cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        cb.dispatchEvent(new Event('click', { bubbles: true }));
      }
    }

    // 5. Dynamic Screening Questions Resolution (Text & Select)
    const customFields = document.querySelectorAll('.field, .custom-question');
    for (const field of customFields) {
      const label = field.querySelector('label');
      const textInput = field.querySelector('input[type="text"], input[type="number"], textarea');
      const select = field.querySelector('select');

      if (!label) continue;
      const questionText = label.innerText.trim();

      if (textInput && textInput.value.trim() === '') {
        try {
          const data = await apiCall('/ai/answer-question', 'POST', { question: questionText, fieldType: 'text' });
          if (data && data.answer) {
            setNativeValue(textInput, data.answer);
            await sleep(200);
          }
        } catch (err) {
          console.error('[AutoApply Runner Error] Failed to resolve question:', err);
        }
      } else if (select && select.selectedIndex <= 0) {
        try {
          const options = Array.from(select.options)
            .map((o) => o.text.trim())
            .filter(Boolean);

          const data = await apiCall('/ai/answer-question', 'POST', { question: questionText, fieldType: 'select', options });

          if (data && data.answer) {
            const matchedIdx = Array.from(select.options).findIndex((o) =>
              o.text.toLowerCase().includes(data.answer.toLowerCase())
            );
            if (matchedIdx !== -1) {
              select.selectedIndex = matchedIdx;
              select.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
          await sleep(200);
        } catch (err) {
          console.error('[AutoApply Runner Error] Failed to resolve select question:', err);
        }
      }
    }

    // 6. Automatic Form Submission Execution & Status Marking
    const submitBtn = document.querySelector(
      '#submit_app, input[type="submit"], button[type="submit"], button#submit, input[value*="Submit"], button[id*="submit"], input[type="button"][value*="Submit"]'
    );

    console.log('[AutoApply Runner] Executing automatic form submission...');
    if (submitBtn) {
      submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(600);
      submitBtn.click();

      const form = submitBtn.closest('form') || document.querySelector('form');
      if (form && typeof form.requestSubmit === 'function') {
        try {
          form.requestSubmit();
        } catch (e) {
          // Form already submitted
        }
      }
    }

    await apiCall(`/jobs/${job.id}/applied`, 'POST', {
      status: 'SUBMITTED',
      filledFields: { standardMappingsFilled: true, radioOptionsFilled: true, autoSubmitted: true },
    }).catch(() => {});

    console.log('[AutoApply Runner] Application form filled and submitted to company successfully!');
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXECUTE_AUTOFILL' || request.action === 'EXECUTE_AUTOFILL_AND_SUBMIT') {
      runGreenhouseAutomator(request.job, request.profile).then(() => {
        sendResponse({ status: 'COMPLETED' });
      });
      return true;
    }
  });
})();


