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

/**
 * Automated Greenhouse Form Filler Engine
 */
async function runGreenhouseAutomator(job, profile) {
  console.log('[AutoApply Runner] Commencing Greenhouse form filling pipeline...');

  // Check for CAPTCHA anti-bot challenges
  const hasCaptcha = document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"]');
  if (hasCaptcha) {
    console.warn('[AutoApply Runner] CAPTCHA challenge detected! Flagging for manual review...');
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

  // 3. Dynamic Screening Questions Resolution
  const customFields = document.querySelectorAll('.field, .custom-question');
  for (const field of customFields) {
    const label = field.querySelector('label');
    const textInput = field.querySelector('input[type="text"], textarea');
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

  // 4. Update Backend DB Status
  await apiCall(`/jobs/${job.id}/applied`, 'POST', {
    status: 'SUBMITTED',
    filledFields: { standardMappingsFilled: true },
  }).catch(() => {});

  // 5. Automatic Form Submission Click
  const submitBtn = document.querySelector(
    '#submit_app, input[type="submit"], button[type="submit"], button#submit, input[value*="Submit"], button[id*="submit"]'
  );
  if (submitBtn) {
    console.log('[AutoApply Runner] Clicking Submit Application button automatically...');
    submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(600);
    submitBtn.click();
  }

  console.log('[AutoApply Runner] Application filled and submitted successfully!');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXECUTE_AUTOFILL' || request.action === 'EXECUTE_AUTOFILL_AND_SUBMIT') {
    runGreenhouseAutomator(request.job, request.profile).then(() => {
      sendResponse({ status: 'COMPLETED' });
    });
    return true;
  }
});

