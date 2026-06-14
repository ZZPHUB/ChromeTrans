const input = document.getElementById('apikey');
const btn = document.getElementById('save');
const status = document.getElementById('status');

chrome.storage.sync.get('apiKey', ({ apiKey }) => {
  if (apiKey) input.value = apiKey;
});

btn.addEventListener('click', async () => {
  const apiKey = input.value.trim();
  if (!apiKey) {
    showStatus('请输入 API Key', 'error');
    return;
  }
  if (!apiKey.startsWith('sk-')) {
    showStatus('API Key 应以 sk- 开头', 'error');
    return;
  }
  await chrome.storage.sync.set({ apiKey });
  showStatus('已保存', 'success');
});

function showStatus(msg, type) {
  status.textContent = msg;
  status.className = type;
  setTimeout(() => { status.textContent = ''; status.className = ''; }, 2000);
}
