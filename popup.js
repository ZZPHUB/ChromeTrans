var input = document.getElementById('apikey');
var btn = document.getElementById('save');
var status = document.getElementById('status');

chrome.storage.sync.get('apiKey', function (data) {
  if (data.apiKey) input.value = data.apiKey;
});

btn.addEventListener('click', async function () {
  var apiKey = input.value.trim();
  if (!apiKey) {
    showStatus('Please enter an API Key', 'error');
    return;
  }
  if (!apiKey.startsWith('sk-')) {
    showStatus('API Key should start with sk-', 'error');
    return;
  }
  await chrome.storage.sync.set({ apiKey: apiKey });
  showStatus('Saved', 'success');
});

function showStatus(msg, type) {
  status.textContent = msg;
  status.className = type;
  setTimeout(function () { status.textContent = ''; status.className = ''; }, 2000);
}
