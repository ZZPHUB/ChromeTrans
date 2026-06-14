var input = document.getElementById('apikey');
var btn = document.getElementById('save');
var status = document.getElementById('status');
var slider = document.getElementById('fontscale');
var scaleVal = document.getElementById('scaleval');

chrome.storage.sync.get(['apiKey', 'fontScale'], function (data) {
  if (data.apiKey) input.value = data.apiKey;
  var s = data.fontScale || 1.0;
  slider.value = s;
  scaleVal.textContent = s.toFixed(1) + 'x';
});

slider.addEventListener('input', function () {
  var v = parseFloat(slider.value);
  scaleVal.textContent = v.toFixed(1) + 'x';
  chrome.storage.sync.set({ fontScale: v });
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
