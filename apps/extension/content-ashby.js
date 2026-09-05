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
    console.log('[Ashby Runner] Tailored PDF attached to Ashby form successfully.');
  } catch (err) {
    console.error('[Ashby Runner Error] PDF attachment failed:', err);
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

async function runAshbyAutomator(job, profile) {
  console.log('[Ashby Runner] Executing Ashby form fill...');

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const ashbyMappings = [
    { sel: 'input[name="name"], input[autocomplete="name"]', val: fullName },
    { sel: 'input[name="email"], input[type="email"]', val: profile.email },
    { sel: 'input[name="phone"], input[type="tel"]', val: profile.phone },
    { sel: 'input[name*="linkedin"]', val: profile.linkedinUrl },
    { sel: 'input[name*="github"]', val: profile.githubUrl },
  ];

  for (const { sel, val } of ashbyMappings) {
    const input = document.querySelector(sel);
    if (input && val) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setNativeValue(input, val);
      await sleep(150 + Math.random() * 100);
    }
  }

  // Resume Upload
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput && job.tailoredPdf) {
    attachBase64Pdf(fileInput, job.tailoredPdf, `${profile.firstName}_${profile.lastName}_Resume.pdf`);
    await sleep(400);
  }

  await apiCall(`/jobs/${job.id}/applied`, 'POST', {
    status: 'SUBMITTED',
    filledFields: { ashbyFilled: true },
  }).catch(() => {});

  // Automatic Form Submission Click
  const submitBtn = document.querySelector(
    'button[type="submit"], input[type="submit"], button:has-text("Submit Application")'
  );
  if (submitBtn) {
    console.log('[Ashby Runner] Clicking Submit Application button automatically...');
    submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(600);
    submitBtn.click();
  }

  console.log('[Ashby Runner] Ashby application completed.');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXECUTE_AUTOFILL' || request.action === 'EXECUTE_AUTOFILL_AND_SUBMIT') {
    runAshbyAutomator(request.job, request.profile).then(() => {
      sendResponse({ status: 'COMPLETED' });
    });
    return true;
  }
});

