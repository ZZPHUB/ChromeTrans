(function () {
  'use strict';

  var selectedText = '';
  var isTranslating = false;
  var isChatting = false;
  var isFullTransActive = false;
  var isPinned = false;
  var dragState = null;
  var chatContext = '';
  var chatHistory = [];
  var pageParagraphs = [];
  var scrollTimer = null;
  var translationCache = {};

  // ── button group container ──
  var btnGroup = document.createElement('div');
  btnGroup.id = 'ds-btn-group';
  document.body.appendChild(btnGroup);

  // ── translate button ──
  var tBtn = document.createElement('div');
  tBtn.id = 'ds-t-btn';
  tBtn.textContent = 'T';
  tBtn.title = 'Translate';
  btnGroup.appendChild(tBtn);

  // ── chat button ──
  var cBtn = document.createElement('div');
  cBtn.id = 'ds-c-btn';
  cBtn.textContent = 'C';
  cBtn.title = 'Chat';
  btnGroup.appendChild(cBtn);

  // ── full-translate button ──
  var ftBtn = document.createElement('div');
  ftBtn.id = 'ds-ft-btn';
  ftBtn.textContent = 'FT';
  ftBtn.title = 'Full Translate';
  btnGroup.appendChild(ftBtn);

  // ── pin button ──
  var pinBtn = document.createElement('div');
  pinBtn.id = 'ds-pin-btn';
  pinBtn.textContent = 'P';
  pinBtn.title = 'Pin';
  btnGroup.appendChild(pinBtn);

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

  // ── selection detection ──
  document.addEventListener('mouseup', function (e) {
    if (isOurUI(e.target)) return;
    var mx = e.clientX, my = e.clientY;
    setTimeout(function () {
      var sel = window.getSelection();
      selectedText = (sel && sel.toString().trim()) || '';
      if (selectedText && !isPinned) {
        var gRect = btnGroup.getBoundingClientRect();
        var newRight = window.innerWidth - mx - gRect.width / 2;
        var newBottom = window.innerHeight - my - gRect.height / 2;
        newRight = Math.max(0, Math.min(newRight, window.innerWidth - gRect.width));
        newBottom = Math.max(0, Math.min(newBottom, window.innerHeight - gRect.height));
        btnGroup.style.right = newRight + 'px';
        btnGroup.style.bottom = newBottom + 'px';
      }
    }, 10);
  });

  // ── scroll triggers full-translate update ──
  document.addEventListener('scroll', function () {
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

  // ── TRANSLATE button ──
  tBtn.addEventListener('click', async function () {
    if (isTranslating || !selectedText) return;
    closeBubble(cBubble);
    isTranslating = true;

    var rect = tBtn.getBoundingClientRect();

    if (translationCache[selectedText]) {
      tResult.textContent = translationCache[selectedText];
    } else {
      tResult.innerHTML = '<div class="ds-spinner"></div>';
    }

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

    if (!translationCache[selectedText]) {
      try {
        var res = await chrome.runtime.sendMessage({ type: 'translate', text: selectedText });
        if (res.error) {
          tResult.textContent = 'Error: ' + res.error;
        } else {
          var trans = res.translation || '(empty)';
          translationCache[selectedText] = trans;
          tResult.textContent = trans;
        }
      } catch (err) {
        tResult.textContent = 'Request failed: ' + err.message;
      }
    }
    isTranslating = false;
  });

  // ── CHAT button ──
  cBtn.addEventListener('click', function () {
    closeBubble(tBubble);

    if (chatHistory.length === 0) {
      var pars = extractPageParagraphs();
      chatContext = pars.map(function (p) { return p.text; }).join('\n\n');
      cMessages.innerHTML = '';
      cContext.textContent = 'Full page: ' + pars.length + ' paragraphs';
    }

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

  // ── PIN button ──
  pinBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    isPinned = !isPinned;
    if (isPinned) {
      pinBtn.classList.add('ds-pinned');
      pinBtn.title = 'Unpin';
      btnGroup.classList.add('ds-pinned');
    } else {
      pinBtn.classList.remove('ds-pinned');
      pinBtn.title = 'Pin';
      btnGroup.classList.remove('ds-pinned');
    }
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
    ftBtn.title = 'Full Translate (active)';
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

    // split into cached vs uncached
    var uncached = [];
    for (var i = 0; i < visible.length; i++) {
      var p = visible[i];
      if (translationCache[p.text]) {
        insertTranslation(p, translationCache[p.text]);
      } else {
        uncached.push(p);
      }
    }

    if (uncached.length === 0) return;

    ftBtn.textContent = '...';
    try {
      var res = await chrome.runtime.sendMessage({
        type: 'fullTranslate',
        paragraphs: uncached.map(function (p) { return p.text; })
      });

      if (res.error) { ftBtn.textContent = 'FT'; return; }

      for (var i = 0; i < uncached.length && i < res.translations.length; i++) {
        var p = uncached[i];
        var trans = res.translations[i];
        if (!trans || p.el.dataset.dsTranslated) continue;
        translationCache[p.text] = trans;
        insertTranslation(p, trans);
      }
    } catch (err) {
      // ignore
    }
    ftBtn.textContent = 'FT';
  }

  function insertTranslation(paragraph, translation) {
    var transEl = document.createElement('div');
    transEl.className = 'ds-translated';
    transEl.textContent = translation;
    paragraph.el.insertAdjacentElement('afterend', transEl);
    paragraph.el.dataset.dsTranslated = '1';
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

  // ── drag (button group) ──
  btnGroup.addEventListener('mousedown', function (e) {
    if (e.target.closest('#ds-t-btn, #ds-c-btn, #ds-ft-btn, #ds-pin-btn')) return;
    if (isPinned) return;
    e.preventDefault();
    dragState = {
      type: 'drag-group',
      startX: e.clientX, startY: e.clientY,
      offsetX: 0, offsetY: 0
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
    } else if (dragState.type === 'drag-group') {
      var dx = e.clientX - dragState.startX;
      var dy = e.clientY - dragState.startY;
      dragState.offsetX = dx;
      dragState.offsetY = dy;
      btnGroup.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
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
    if (dragState && dragState.type === 'drag-group') {
      var rect = btnGroup.getBoundingClientRect();
      btnGroup.style.right = (window.innerWidth - rect.right) + 'px';
      btnGroup.style.bottom = (window.innerHeight - rect.bottom) + 'px';
      btnGroup.style.transform = '';
    }
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
      if (el.closest('#ds-t-bubble, #ds-c-bubble, #ds-btn-group')) continue;

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
      if (el === btnGroup || el === tBtn || el === cBtn || el === ftBtn || el === tBubble || el === cBubble) return true;
      el = el.parentElement;
    }
    return false;
  }

  // ── font scale ──
  function applyFontScale(scale) {
    var pageFont = parseFloat(getComputedStyle(document.body).fontSize) || 16;
    btnGroup.style.fontSize = (pageFont * scale) + 'px';
    tBubble.style.fontSize = (pageFont * scale) + 'px';
    cBubble.style.fontSize = (pageFont * scale) + 'px';
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
