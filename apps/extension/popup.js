const API_HOST = 'http://localhost:4000/api';

document.addEventListener('DOMContentLoaded', async () => {
  const queueCountEl = document.getElementById('queueCount');
  const connStatusEl = document.getElementById('connStatus');
  const runBtn = document.getElementById('runBtn');

  try {
    const res = await fetch(`${API_HOST}/jobs/dashboard-stats`);
    if (res.ok) {
      const data = await res.json();
      queueCountEl.textContent = data.queuedCount || 0;
      connStatusEl.textContent = 'Connected';
    } else {
      queueCountEl.textContent = 'Err';
      connStatusEl.textContent = 'Offline';
    }
  } catch (err) {
    queueCountEl.textContent = '0';
    connStatusEl.textContent = 'Disconnected';
  }

  runBtn.addEventListener('click', () => {
    runBtn.textContent = '⏳ Triggering...';
    chrome.runtime.sendMessage({ action: 'TRIGGER_POLL_NOW' }, (response) => {
      runBtn.textContent = '✅ Dispatched!';
      setTimeout(() => {
        runBtn.textContent = '⚡ Check & Apply Next Job';
      }, 2000);
    });
  });
});
