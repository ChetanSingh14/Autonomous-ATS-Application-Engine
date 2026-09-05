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
    console.log('[Lever Runner] Tailored PDF attached to Lever form successfully.');
  } catch (err) {
    console.error('[Lever Runner Error] PDF attachment failed:', err);
  }
}

async function runLeverAutomator(job, profile) {
  console.log('[Lever Runner] Executing Lever form fill...');

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const leverMappings = [
    { sel: 'input[name="name"]', val: fullName },
    { sel: 'input[name="email"]', val: profile.email },
    { sel: 'input[name="phone"]', val: profile.phone },
    { sel: 'input[name="org"]', val: profile.experience?.[0]?.company || 'Tech Engine' },
    { sel: 'input[name*="urls[LinkedIn]"], input[name*="linkedin"]', val: profile.linkedinUrl },
    { sel: 'input[name*="urls[GitHub]"], input[name*="github"]', val: profile.githubUrl },
    { sel: 'input[name*="urls[Portfolio]"], input[name*="portfolio"]', val: profile.portfolioUrl },
  ];

  for (const { sel, val } of leverMappings) {
    const input = document.querySelector(sel);
    if (input && val) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setNativeValue(input, val);
      await sleep(150 + Math.random() * 100);
    }
  }

  // Resume File Upload
  const fileInput = document.querySelector('input[type="file"][name="resume"]');
  if (fileInput && job.tailoredPdf) {
    attachBase64Pdf(fileInput, job.tailoredPdf, `${profile.firstName}_${profile.lastName}_Resume.pdf`);
    await sleep(400);
  }

  // Mark status in DB
  await fetch(`${BACKEND}/jobs/${job.id}/applied`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'SUBMITTED', filledFields: { leverFilled: true } }),
  });

  console.log('[Lever Runner] Lever application completed.');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXECUTE_AUTOFILL') {
    runLeverAutomator(request.job, request.profile).then(() => {
      sendResponse({ status: 'COMPLETED' });
    });
    return true;
  }
});
