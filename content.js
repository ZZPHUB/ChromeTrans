(function () {
  'use strict';

  var selectedText = '';
  var isTranslating = false;
  var isChatting = false;
  var isFullTransActive = false;
  var dragState = null;
  var chatContext = '';
  var chatHistory = [];
  var pageParagraphs = [];
  var scrollTimer = null;

  // ── translate button (selection only) ──
  var tBtn = document.createElement('div');
  tBtn.id = 'ds-t-btn';
  tBtn.textContent = 'T';
  tBtn.title = 'Translate';
  document.body.appendChild(tBtn);

  // ── chat button (always visible) ──
  var cBtn = document.createElement('div');
  cBtn.id = 'ds-c-btn';
  cBtn.textContent = 'C';
  cBtn.title = 'Chat';
  cBtn.style.display = 'flex';
  cBtn.style.right = '16px';
  cBtn.style.bottom = '64px';
  document.body.appendChild(cBtn);

  // ── full-translate button (always visible) ──
  var ftBtn = document.createElement('div');
  ftBtn.id = 'ds-ft-btn';
  ftBtn.textContent = 'FT';
  ftBtn.title = 'Full Translate';
  ftBtn.style.display = 'flex';
  ftBtn.style.right = '16px';
  ftBtn.style.bottom = '16px';
  document.body.appendChild(ftBtn);

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
  cBubble.innerHTML = '<div class="ds-c-header"><span class="ds-c-title">Chat with DeepSeek</span><span class="ds-c-close">&times;</span></div><div class="ds-c-context"></div><div class="ds-c-messages"></div><div class="ds-c-input-row"><textarea class="ds-c-input" placeholder="Ask about the page..." rows="1"></textarea><button class="ds-c-send">Send</button></div><div class="ds-c-resize"></div>';
  document.body.appendChild(cBubble);
  var cClose    = cBubble.querySelector('.ds-c-close');
  var cContext  = cBubble.querySelector('.ds-c-context');
  var cMessages = cBubble.querySelector('.ds-c-messages');
  var cInput    = cBubble.querySelector('.ds-c-input');
  var cSendBtn  = cBubble.querySelector('.ds-c-send');
  var cHeader   = cBubble.querySelector('.ds-c-header');
  var cResize   = cBubble.querySelector('.ds-c-resize');

  // ── selection detection (only T button) ──
  document.addEventListener('mouseup', function (e) {
    if (isOurUI(e.target)) return;
    setTimeout(function () {
      var sel = window.getSelection();
      var text = (sel && sel.toString().trim()) || '';
      if (text) {
        selectedText = text;
        var rect = sel.getRangeAt(0).getBoundingClientRect();
        var btnY = Math.max(0, Math.min(rect.top + rect.height / 2 - 14, window.innerHeight - 28));

        if (rect.right + 34 > window.innerWidth && rect.left > 34) {
          tBtn.style.left = (rect.left - 34) + 'px';
        } else {
          tBtn.style.left = (rect.right + 6) + 'px';
        }
        tBtn.style.top = btnY + 'px';
        tBtn.style.display = 'flex';
      } else {
        tBtn.style.display = 'none';
      }
    }, 10);
  });

  // ── scroll hides only T button ──
  document.addEventListener('scroll', function () {
    tBtn.style.display = 'none';
    if (isFullTransActive) {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(translateVisibleBatch, 500);
    }
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
    closeBubble(tBubble);
    tBtn.style.display = 'none';

    var pars = extractPageParagraphs();
    chatContext = pars.map(function (p) { return p.text; }).join('\n\n');
    chatHistory = [];
    cMessages.innerHTML = '';
    cContext.textContent = 'Full page: ' + pars.length + ' paragraphs';
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

  // ── FULL TRANSLATE button ──
  ftBtn.addEventListener('click', function () {
    if (isFullTransActive) {
      deactivateFullTranslate();
    } else {
      activateFullTranslate();
    }
  });

  function activateFullTranslate() {
    isFullTransActive = true;
    pageParagraphs = extractPageParagraphs();
    ftBtn.classList.add('ds-active');
    ftBtn.title = 'Full Translate (active) — click to remove';
    translateVisibleBatch();
  }

  function deactivateFullTranslate() {
    isFullTransActive = false;
    ftBtn.classList.remove('ds-active');
    ftBtn.title = 'Full Translate';
    removeAllTranslations();
    pageParagraphs = [];
    if (scrollTimer) clearTimeout(scrollTimer);
  }

  async function translateVisibleBatch() {
    if (!isFullTransActive) return;
    var visible = pageParagraphs.filter(function (p) {
      return isInViewport(p.el) && !p.el.dataset.dsTranslated;
    });
    if (visible.length === 0) return;

    // show loading indicator
    ftBtn.textContent = '...';

    try {
      var res = await chrome.runtime.sendMessage({
        type: 'fullTranslate',
        paragraphs: visible.map(function (p) { return p.text; })
      });

      if (res.error) {
        ftBtn.textContent = 'FT';
        return;
      }

      var trans = res.translations;
      for (var i = 0; i < visible.length && i < trans.length; i++) {
        if (!trans[i] || visible[i].el.dataset.dsTranslated) continue;
        var transEl = document.createElement('div');
        transEl.className = 'ds-translated';
        transEl.textContent = trans[i];
        visible[i].el.insertAdjacentElement('afterend', transEl);
        visible[i].el.dataset.dsTranslated = '1';
      }
    } catch (err) {
      // ignore
    }
    ftBtn.textContent = 'FT';
  }

  function removeAllTranslations() {
    var all = document.querySelectorAll('.ds-translated');
    for (var i = 0; i < all.length; i++) all[i].remove();
    for (var j = 0; j < pageParagraphs.length; j++) {
      delete pageParagraphs[j].el.dataset.dsTranslated;
    }
  }

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
      { role: 'system', content: 'You are a helpful assistant. Answer questions about the provided page content concisely and accurately. Use markdown formatting for code, lists, and emphasis when appropriate.' }
    ];

    if (chatHistory.length === 0) {
      msgs.push({ role: 'user', content: 'Page content:\n"""\n' + (chatContext.slice(0, 20000)) + '\n"""\n\n' + userMsg });
    } else {
      msgs.push({ role: 'user', content: 'Page content (abbreviated):\n"""\n' + (chatContext.slice(0, 8000)) + '\n"""' });
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

  // ── drag (chat button) ──
  cBtn.addEventListener('mousedown', function (e) {
    e.preventDefault();
    var rect = cBtn.getBoundingClientRect();
    cBtn.style.left = rect.left + 'px';
    cBtn.style.top = rect.top + 'px';
    cBtn.style.right = '';
    cBtn.style.bottom = '';
    dragState = {
      type: 'drag-c-btn',
      startX: e.clientX, startY: e.clientY,
      startLeft: rect.left, startTop: rect.top
    };
  });

  // ── drag (full-translate button) ──
  ftBtn.addEventListener('mousedown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var rect = ftBtn.getBoundingClientRect();
    ftBtn.style.left = rect.left + 'px';
    ftBtn.style.top = rect.top + 'px';
    ftBtn.style.right = '';
    ftBtn.style.bottom = '';
    dragState = {
      type: 'drag-ft-btn',
      startX: e.clientX, startY: e.clientY,
      startLeft: rect.left, startTop: rect.top
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
    } else if (dragState.type === 'drag-c-btn') {
      cBtn.style.left = (dragState.startLeft + e.clientX - dragState.startX) + 'px';
      cBtn.style.top  = (dragState.startTop  + e.clientY - dragState.startY) + 'px';
    } else if (dragState.type === 'drag-ft-btn') {
      ftBtn.style.left = (dragState.startLeft + e.clientX - dragState.startX) + 'px';
      ftBtn.style.top  = (dragState.startTop  + e.clientY - dragState.startY) + 'px';
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

  // ── helpers ──
  function extractPageParagraphs() {
    var selectors = 'p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, figcaption';
    var all = document.querySelectorAll(selectors);
    var result = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.offsetParent === null && el.tagName !== 'BODY') continue;
      if (el.closest('#ds-t-bubble, #ds-c-bubble, #ds-t-btn, #ds-c-btn, #ds-ft-btn')) continue;

      var contained = false;
      for (var j = 0; j < all.length; j++) {
        if (i !== j && el.contains(all[j])) { contained = true; break; }
      }
      if (contained) continue;

      var text = el.textContent.trim();
      if (text.length > 3) {
        result.push({ el: el, text: text });
      }
    }
    return result;
  }

  function isInViewport(el) {
    var rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  function isOurUI(el) {
    while (el) {
      if (el === tBtn || el === cBtn || el === ftBtn || el === tBubble || el === cBubble) return true;
      el = el.parentElement;
    }
    return false;
  }

  // ── font scale ──
  function applyFontScale(scale) {
    var pageFont = parseFloat(getComputedStyle(document.body).fontSize) || 16;
    var size = pageFont * scale;
    tBtn.style.fontSize = size + 'px';
    cBtn.style.fontSize = size + 'px';
    ftBtn.style.fontSize = size + 'px';
    tBubble.style.fontSize = size + 'px';
    cBubble.style.fontSize = size + 'px';
  }

  chrome.storage.sync.get('fontScale', function (data) {
    applyFontScale(data.fontScale || 1.0);
  });

  chrome.storage.onChanged.addListener(function (changes) {
    if (changes.fontScale) {
      applyFontScale(changes.fontScale.newValue || 1.0);
    }
  });
})();
