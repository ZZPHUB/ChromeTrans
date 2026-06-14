(function () {
  'use strict';

  var selectedText = '';
  var isTranslating = false;
  var isChatting = false;
  var dragState = null;
  var chatContext = '';
  var chatHistory = [];

  // ── translate button ──
  var tBtn = document.createElement('div');
  tBtn.id = 'ds-t-btn';
  tBtn.textContent = 'T';
  tBtn.title = 'Translate';
  document.body.appendChild(tBtn);

  // ── chat button ──
  var cBtn = document.createElement('div');
  cBtn.id = 'ds-c-btn';
  cBtn.textContent = 'C';
  cBtn.title = 'Chat';
  document.body.appendChild(cBtn);

  // ── translate bubble ──
  var tBubble = document.createElement('div');
  tBubble.id = 'ds-t-bubble';
  tBubble.innerHTML = '<div class="ds-t-header"><span class="ds-t-title">Translate</span><span class="ds-t-close">&times;</span></div><div class="ds-t-result"></div><div class="ds-t-resize"></div>';
  document.body.appendChild(tBubble);
  var tClose  = tBubble.querySelector('.ds-t-close');
  var tResult = tBubble.querySelector('.ds-t-result');
  var tHeader = tBubble.querySelector('.ds-t-header');
  var tResize = tBubble.querySelector('.ds-t-resize');

  // ── chat bubble ──
  var cBubble = document.createElement('div');
  cBubble.id = 'ds-c-bubble';
  cBubble.innerHTML = '<div class="ds-c-header"><span class="ds-c-title">Chat with DeepSeek</span><span class="ds-c-close">&times;</span></div><div class="ds-c-context"></div><div class="ds-c-messages"></div><div class="ds-c-input-row"><textarea class="ds-c-input" placeholder="Ask about the selected text..." rows="1"></textarea><button class="ds-c-send">Send</button></div><div class="ds-c-resize"></div>';
  document.body.appendChild(cBubble);
  var cClose    = cBubble.querySelector('.ds-c-close');
  var cContext  = cBubble.querySelector('.ds-c-context');
  var cMessages = cBubble.querySelector('.ds-c-messages');
  var cInput    = cBubble.querySelector('.ds-c-input');
  var cSendBtn  = cBubble.querySelector('.ds-c-send');
  var cHeader   = cBubble.querySelector('.ds-c-header');
  var cResize   = cBubble.querySelector('.ds-c-resize');

  // ── selection detection ──
  document.addEventListener('mouseup', function (e) {
    if (isOurUI(e.target)) return;
    setTimeout(function () {
      var sel = window.getSelection();
      var text = (sel && sel.toString().trim()) || '';
      if (text) {
        selectedText = text;
        var rect = sel.getRangeAt(0).getBoundingClientRect();
        var btnY = Math.max(0, Math.min(rect.top + rect.height / 2 - 14, window.innerHeight - 28));

        if (rect.right + 66 > window.innerWidth && rect.left > 66) {
          cBtn.style.left = (rect.left - 34) + 'px';
          tBtn.style.left = (rect.left - 66) + 'px';
        } else {
          tBtn.style.left = (rect.right + 6) + 'px';
          cBtn.style.left = (rect.right + 38) + 'px';
        }

        tBtn.style.top  = btnY + 'px';
        cBtn.style.top  = btnY + 'px';
        tBtn.style.display = 'flex';
        cBtn.style.display = 'flex';
      } else {
        tBtn.style.display = 'none';
        cBtn.style.display = 'none';
      }
    }, 10);
  });

  // ── scroll hides buttons ──
  document.addEventListener('scroll', function () {
    tBtn.style.display = 'none';
    cBtn.style.display = 'none';
  }, true);

  // ── click outside dismisses bubbles ──
  document.addEventListener('mousedown', function (e) {
    if (!isOurUI(e.target)) {
      tBubble.style.display = 'none';
      cBubble.style.display = 'none';
    }
  });

  // ── prevent buttons from clearing selection ──
  tBtn.addEventListener('mousedown', function (e) { e.stopPropagation(); e.preventDefault(); });
  cBtn.addEventListener('mousedown', function (e) { e.stopPropagation(); e.preventDefault(); });

  // ── TRANSLATE button ──
  tBtn.addEventListener('click', async function () {
    if (isTranslating || !selectedText) return;
    closeBubble(cBubble);
    isTranslating = true;

    var rect = tBtn.getBoundingClientRect();
    tResult.innerHTML = '<div class="ds-spinner"></div>';
    resizeChatInput();

    tBubble.style.width = '';
    tBubble.style.height = '';
    tBubble.style.display = 'block';
    var bw = 320;
    var bh = tBubble.offsetHeight;
    var bx = rect.right + 8;
    var by = rect.bottom + 4;
    if (bx + bw > window.innerWidth) bx = window.innerWidth - bw - 12;
    if (bx < 12) bx = 12;
    if (by + bh > window.innerHeight) by = rect.top - bh - 4;
    if (by < 12) by = 12;
    tBubble.style.left = bx + 'px';
    tBubble.style.top  = by + 'px';
    tBtn.style.display = 'none';
    cBtn.style.display = 'none';

    try {
      var res = await chrome.runtime.sendMessage({ type: 'translate', text: selectedText });
      tResult.textContent = res.error || res.translation || '(empty)';
    } catch (err) {
      tResult.textContent = 'Request failed: ' + err.message;
    }
    isTranslating = false;
  });

  // ── CHAT button ──
  cBtn.addEventListener('click', function () {
    if (!selectedText) return;
    closeBubble(tBubble);
    tBtn.style.display = 'none';
    cBtn.style.display = 'none';

    chatContext = selectedText;
    chatHistory = [];
    cMessages.innerHTML = '';
    cContext.textContent = selectedText;
    cInput.value = '';

    cBubble.style.width = '';
    cBubble.style.height = '';
    cBubble.style.display = 'block';

    var rect = cBtn.getBoundingClientRect();
    var bx = rect.right + 8;
    var by = rect.bottom + 4;
    if (bx + 380 > window.innerWidth) bx = window.innerWidth - 380 - 12;
    if (bx < 12) bx = 12;
    if (by + 440 > window.innerHeight) by = rect.top - 440 - 4;
    if (by < 12) by = 12;
    cBubble.style.left = bx + 'px';
    cBubble.style.top  = by + 'px';

    cInput.focus();
  });

  // ── send chat message ──
  cSendBtn.addEventListener('click', sendChat);
  cInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });

  async function sendChat() {
    var userMsg = cInput.value.trim();
    if (!userMsg || isChatting) return;
    isChatting = true;

    cInput.value = '';
    cInput.style.height = 'auto';

    var userEl = document.createElement('div');
    userEl.className = 'ds-msg ds-msg-user';
    userEl.textContent = userMsg;
    cMessages.appendChild(userEl);

    var msgs = [
      { role: 'system', content: 'You are a helpful assistant. Answer questions about the provided text concisely and accurately. Use markdown formatting for code, lists, and emphasis when appropriate.' }
    ];

    if (chatHistory.length === 0) {
      msgs.push({ role: 'user', content: 'Reference text:\n"""\n' + chatContext + '\n"""\n\n' + userMsg });
    } else {
      msgs.push({ role: 'user', content: 'Reference text:\n"""\n' + chatContext + '\n"""' });
      for (var i = 0; i < chatHistory.length; i++) {
        msgs.push(chatHistory[i]);
      }
      msgs.push({ role: 'user', content: userMsg });
    }

    chatHistory.push({ role: 'user', content: userMsg });

    var loadingEl = document.createElement('div');
    loadingEl.className = 'ds-msg ds-msg-assistant';
    loadingEl.innerHTML = '<div class="ds-spinner"></div>';
    cMessages.appendChild(loadingEl);
    cMessages.scrollTop = cMessages.scrollHeight;

    try {
      var res = await chrome.runtime.sendMessage({ type: 'chat', messages: msgs });

      if (res.error) {
        loadingEl.textContent = 'Error: ' + res.error;
      } else {
        var reply = (res.reply || '').trim();
        loadingEl.innerHTML = reply ? renderMarkdown(reply) : '(empty)';
        chatHistory.push({ role: 'assistant', content: reply });
      }
    } catch (err) {
      loadingEl.textContent = 'Request failed: ' + err.message;
    }

    cMessages.scrollTop = cMessages.scrollHeight;
    isChatting = false;
    cInput.focus();
  }

  // ── drag (translate bubble) ──
  tHeader.addEventListener('mousedown', function (e) {
    if (e.target === tClose) return;
    e.preventDefault();
    dragState = {
      type: 'drag-t',
      startX: e.clientX, startY: e.clientY,
      startLeft: parseInt(tBubble.style.left) || 0,
      startTop: parseInt(tBubble.style.top) || 0
    };
  });

  // ── drag (chat bubble) ──
  cHeader.addEventListener('mousedown', function (e) {
    if (e.target === cClose) return;
    e.preventDefault();
    dragState = {
      type: 'drag-c',
      startX: e.clientX, startY: e.clientY,
      startLeft: parseInt(cBubble.style.left) || 0,
      startTop: parseInt(cBubble.style.top) || 0
    };
  });

  // ── resize (translate bubble) ──
  tResize.addEventListener('mousedown', function (e) {
    e.preventDefault(); e.stopPropagation();
    dragState = {
      type: 'resize-t',
      startX: e.clientX, startY: e.clientY,
      startW: tBubble.offsetWidth, startH: tBubble.offsetHeight
    };
  });

  // ── resize (chat bubble) ──
  cResize.addEventListener('mousedown', function (e) {
    e.preventDefault(); e.stopPropagation();
    dragState = {
      type: 'resize-c',
      startX: e.clientX, startY: e.clientY,
      startW: cBubble.offsetWidth, startH: cBubble.offsetHeight
    };
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragState) return;
    if (dragState.type === 'drag-t') {
      tBubble.style.left = (dragState.startLeft + e.clientX - dragState.startX) + 'px';
      tBubble.style.top  = (dragState.startTop  + e.clientY - dragState.startY) + 'px';
    } else if (dragState.type === 'drag-c') {
      cBubble.style.left = (dragState.startLeft + e.clientX - dragState.startX) + 'px';
      cBubble.style.top  = (dragState.startTop  + e.clientY - dragState.startY) + 'px';
    } else if (dragState.type === 'resize-t') {
      var w = Math.max(200, dragState.startW + e.clientX - dragState.startX);
      var h = Math.max(80,  dragState.startH + e.clientY - dragState.startY);
      tBubble.style.width = Math.min(w, window.innerWidth - 12) + 'px';
      tBubble.style.height = Math.min(h, window.innerHeight - 12) + 'px';
    } else if (dragState.type === 'resize-c') {
      var w = Math.max(300, dragState.startW + e.clientX - dragState.startX);
      var h = Math.max(200, dragState.startH + e.clientY - dragState.startY);
      cBubble.style.width = Math.min(w, window.innerWidth - 12) + 'px';
      cBubble.style.height = Math.min(h, window.innerHeight - 12) + 'px';
    }
  });

  document.addEventListener('mouseup', function () {
    dragState = null;
  });

  // ── close buttons ──
  tClose.addEventListener('click', function (e) { e.stopPropagation(); closeBubble(tBubble); });
  cClose.addEventListener('click', function (e) { e.stopPropagation(); closeBubble(cBubble); });

  function closeBubble(el) {
    el.style.display = 'none';
  }

  // ── chat input auto-resize ──
  cInput.addEventListener('input', resizeChatInput);

  function resizeChatInput() {
    cInput.style.height = 'auto';
    cInput.style.height = Math.min(cInput.scrollHeight, 100) + 'px';
  }

  // ── helper ──
  function isOurUI(el) {
    while (el) {
      if (el === tBtn || el === cBtn || el === tBubble || el === cBubble) return true;
      el = el.parentElement;
    }
    return false;
  }
})();
