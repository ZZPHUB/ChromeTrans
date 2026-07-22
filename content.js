(function () {
  'use strict';

  var selectedText = '';
  var selectedRect = null;
  var isTranslating = false;
  var isChatting = false;
  var isFullTransActive = false;
  var isPinned = false;
  var layoutMode = 2; // 0=1x4 vertical, 1=4x1 horizontal, 2=2x2 grid (default)
  var dragState = null;
  var chatContext = '';
  var chatHistory = [];
  var pageParagraphs = [];
  var scrollTimer = null;
  var translationCache = {};

  // ── button group container ──
  var btnGroup = document.createElement('div');
  btnGroup.id = 'ds-btn-group';
  btnGroup.classList.add('ds-layout-grid');
  document.body.appendChild(btnGroup);

  // ── translate button ──
  var tBtn = document.createElement('div');
  tBtn.id = 'ds-t-btn';
  tBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>';
  tBtn.title = 'Translate';
  btnGroup.appendChild(tBtn);

  // ── chat button ──
  var cBtn = document.createElement('div');
  cBtn.id = 'ds-c-btn';
  cBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>';
  cBtn.title = 'Chat';
  btnGroup.appendChild(cBtn);

  // ── full-translate button ──
  var ftBtn = document.createElement('div');
  ftBtn.id = 'ds-ft-btn';
  ftBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="9" y2="9"/></svg>';
  ftBtn.title = 'Full Translate';
  btnGroup.appendChild(ftBtn);

  // ── pin button ──
  var pinBtn = document.createElement('div');
  pinBtn.id = 'ds-pin-btn';
  pinBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="8 5 16 5 12 2 8 5"/><circle cx="12" cy="21" r="1.5"/></svg>';
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
      if (selectedText) {
        try { selectedRect = sel.getRangeAt(0).getBoundingClientRect(); } catch (e) { selectedRect = null; }
      } else {
        selectedRect = null;
      }
      if (selectedText && !isPinned) {
        positionButtonGroup(selectedRect, mx, my);
      }
    }, 10);
  });

  // ── toggle original/translation ──
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('.ds-toggle-btn');
    if (!toggle) return;
    var paragraph = toggle.parentElement;
    if (!paragraph || !paragraph.dataset.dsTranslated) return;
    if (paragraph.dataset.dsShowing === 'translation') {
      paragraph.textContent = paragraph.dataset.dsOriginal;
      paragraph.dataset.dsShowing = 'original';
      paragraph.appendChild(toggle);
      toggle.title = 'Show translation';
      toggle.classList.add('ds-showing-original');
    } else {
      paragraph.textContent = paragraph.dataset.dsTranslation;
      paragraph.dataset.dsShowing = 'translation';
      paragraph.appendChild(toggle);
      toggle.title = 'Show original';
      toggle.classList.remove('ds-showing-original');
    }
  });

  // ── scroll triggers full-translate update ──
  document.addEventListener('scroll', function () {
    if (isFullTransActive) {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(translateAllParagraphs, 500);
    }
  }, true);

  // ── click outside dismisses bubbles ──
  document.addEventListener('mousedown', function (e) {
    if (!isOurUI(e.target)) {
      closeBubble(tBubble);
      closeBubble(cBubble);
    }
  });

  // ── TRANSLATE button ──
  tBtn.addEventListener('click', async function () {
    if (isTranslating || !selectedText) return;
    closeBubble(cBubble);
    isTranslating = true;

    // position bubble near the selected text
    var selRect = selectedRect;

    if (translationCache[selectedText]) {
      tResult.textContent = translationCache[selectedText];
    } else {
      tResult.innerHTML = '<div class="ds-spinner"></div>';
    }

    tBubble.style.width = '';
    tBubble.style.height = '';
    tBubble.style.display = 'block';
    tBtn.classList.add('ds-active');
    var bw = 320;
    var bh = tBubble.offsetHeight;
    var bx, by;
    if (selRect) {
      bx = selRect.left + selRect.width / 2 - bw / 2;
      by = selRect.bottom + 8;
    } else {
      bx = window.innerWidth - bw - 20;
      by = 20;
    }
    if (bx < 12) bx = 12;
    if (bx + bw > window.innerWidth) bx = window.innerWidth - bw - 12;
    if (by + bh > window.innerHeight) by = selRect ? selRect.top - bh - 8 : window.innerHeight - bh - 20;
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

    cBubble.style.width = Math.round(window.innerWidth * 2 / 3) + 'px';
    cBubble.style.height = Math.round(window.innerHeight * 2 / 3) + 'px';
    cBubble.style.display = 'block';
    cBtn.classList.add('ds-active');

    var bw = Math.round(window.innerWidth * 2 / 3);
    var bh = Math.round(window.innerHeight * 2 / 3);
    var bx = Math.max(12, (window.innerWidth - bw) / 2);
    var by = Math.max(12, (window.innerHeight - bh) / 2);
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
    translateAllParagraphs();
  }

  function deactivateFullTranslate() {
    isFullTransActive = false;
    ftBtn.classList.remove('ds-active');
    ftBtn.title = 'Full Translate';
    removeAllTranslations();
    pageParagraphs = [];
    if (scrollTimer) clearTimeout(scrollTimer);
  }

  async function translateAllParagraphs() {
    if (!isFullTransActive) return;
    var pending = pageParagraphs.filter(function (p) {
      return !p.el.dataset.dsTranslated;
    });
    if (pending.length === 0) return;

    // split into cached vs uncached
    var uncached = [];
    for (var i = 0; i < pending.length; i++) {
      var p = pending[i];
      if (translationCache[p.text]) {
        insertTranslation(p, translationCache[p.text]);
      } else {
        uncached.push(p);
      }
    }

    if (uncached.length === 0) return;

    ftBtn.classList.add('ds-loading');
    for (var i = 0; i < uncached.length; i++) {
      var p = uncached[i];
      if (p.el.dataset.dsTranslated) continue;
      // find neighbors for context
      var pIdx = pageParagraphs.indexOf(p);
      var contextBefore = pIdx > 0 ? pageParagraphs[pIdx - 1].text : '';
      var contextAfter = pIdx < pageParagraphs.length - 1 ? pageParagraphs[pIdx + 1].text : '';
      try {
        var res = await chrome.runtime.sendMessage({
          type: 'fullTranslate',
          text: p.text,
          contextBefore: contextBefore,
          contextAfter: contextAfter
        });
        if (res.translation) {
          translationCache[p.text] = res.translation;
          insertTranslation(p, res.translation);
        }
      } catch (err) {
        // continue to next paragraph
      }
    }
    ftBtn.classList.remove('ds-loading');
  }

  function insertTranslation(paragraph, translation) {
    // skip if already translated (safety guard)
    if (paragraph.el.dataset.dsTranslated) return;
    // save both texts permanently, show translation by default
    paragraph.el.dataset.dsOriginal = paragraph.el.textContent;
    paragraph.el.dataset.dsTranslation = translation;
    paragraph.el.textContent = translation;
    paragraph.el.dataset.dsTranslated = '1';
    paragraph.el.dataset.dsShowing = 'translation';
    // insert toggle button inside paragraph (inline at end)
    var toggle = document.createElement('span');
    toggle.className = 'ds-toggle-btn';
    toggle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>';
    toggle.title = 'Show original';
    paragraph.el.appendChild(toggle);
  }

  function removeAllTranslations() {
    var all = document.querySelectorAll('[data-ds-translated]');
    for (var j = 0; j < all.length; j++) {
      var el = all[j];
      // restoring textContent also removes child toggle buttons
      el.textContent = el.dataset.dsOriginal || el.textContent;
      delete el.dataset.dsOriginal;
      delete el.dataset.dsTranslation;
      delete el.dataset.dsShowing;
      delete el.dataset.dsTranslated;
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

  // ── double-click group gap to cycle layout ──
  btnGroup.addEventListener('dblclick', function (e) {
    if (e.target.closest('#ds-t-btn, #ds-c-btn, #ds-ft-btn, #ds-pin-btn')) return;
    cycleLayout();
  });

  // ── drag (button group) ──
  btnGroup.addEventListener('mousedown', function (e) {
    if (e.target.closest('#ds-t-btn, #ds-c-btn, #ds-ft-btn, #ds-pin-btn')) return;
    if (isPinned) return;
    e.preventDefault();
    // snapshot current position, then switch to left/top exclusively
    var rect = btnGroup.getBoundingClientRect();
    btnGroup.style.right = 'auto';
    btnGroup.style.bottom = 'auto';
    btnGroup.style.left = rect.left + 'px';
    btnGroup.style.top = rect.top + 'px';
    dragState = {
      type: 'drag-group',
      startX: e.clientX, startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top
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
      btnGroup.style.left = (dragState.startLeft + e.clientX - dragState.startX) + 'px';
      btnGroup.style.top  = (dragState.startTop  + e.clientY - dragState.startY) + 'px';
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
    if (el === tBubble) tBtn.classList.remove('ds-active');
    if (el === cBubble) cBtn.classList.remove('ds-active');
  }

  // ── chat input auto-resize ──
  cInput.addEventListener('input', resizeChatInput);

  function resizeChatInput() {
    cInput.style.height = 'auto';
    cInput.style.height = Math.min(cInput.scrollHeight, 100) + 'px';
  }

  // ── helpers ──
  var SKIP_TAGS = { PRE: 1, CODE: 1, KBD: 1, SAMP: 1, VAR: 1 };
  var SKIP_ANCESTOR_TAGS = { NAV: 1, HEADER: 1, FOOTER: 1, ASIDE: 1, MENU: 1 };
  var SKIP_CLASS_PATTERNS = /(^|[_-])(blob-code|line-number|commit|sha|hash|timestamp|mono|signature|avatar|breadcrumb|pagination|sidebar)([_-]|$)/i;
  var MIN_TEXT_LENGTH = 8;

  function extractPageParagraphs() {
    var selectors = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, dt, dd, td, th, summary';
    var all = document.querySelectorAll(selectors);
    var result = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.offsetParent === null && el.tagName !== 'BODY') continue;
      if (el.closest('#ds-t-bubble, #ds-c-bubble, #ds-btn-group')) continue;
      if (shouldSkipTranslate(el)) continue;

      var contained = false;
      for (var j = 0; j < all.length; j++) {
        if (i !== j && el.contains(all[j])) { contained = true; break; }
      }
      if (contained) continue;

      var text = el.textContent.trim();
      if (text.length >= MIN_TEXT_LENGTH && isProseContent(text)) {
        result.push({ el: el, text: text });
      }
    }
    return result;
  }

  function shouldSkipTranslate(el) {
    var cur = el;
    while (cur && cur !== document.body) {
      // explicit opt-out
      if (cur.getAttribute && cur.getAttribute('translate') === 'no') return true;
      if (cur.classList && cur.classList.contains('notranslate')) return true;
      // code-related tags
      if (SKIP_TAGS[cur.tagName]) return true;
      // semantic non-content ancestors
      if (SKIP_ANCESTOR_TAGS[cur.tagName]) return true;
      // class-based exclusion
      if (cur.classList && matchesSkipClass(cur.classList)) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  function matchesSkipClass(classList) {
    for (var i = 0; i < classList.length; i++) {
      if (SKIP_CLASS_PATTERNS.test(classList[i])) return true;
    }
    return false;
  }

  function isProseContent(text) {
    // skip only if clearly code (very high symbol ratio)
    var nonProse = text.match(/[^\p{L}\p{N}\s.,;:!?()\-—""''一-鿿㐀-䶿]/gu) || [];
    if (nonProse.length / text.length > 0.65) return false;
    return true;
  }

  function isOurUI(el) {
    while (el) {
      if (el === btnGroup || el === tBtn || el === cBtn || el === ftBtn || el === tBubble || el === cBubble) return true;
      el = el.parentElement;
    }
    return false;
  }

  function cycleLayout() {
    btnGroup.classList.remove('ds-layout-row', 'ds-layout-grid');
    layoutMode = (layoutMode + 1) % 3;
    if (layoutMode === 1) btnGroup.classList.add('ds-layout-row');
    if (layoutMode === 2) btnGroup.classList.add('ds-layout-grid');
    // reposition if there is an active selection
    if (selectedText && selectedRect) {
      setTimeout(function () { positionButtonGroup(selectedRect, 0, 0); }, 0);
    }
  }

  function positionButtonGroup(selRect, mx, my) {
    var gRect = btnGroup.getBoundingClientRect();
    var gw = gRect.width;
    var gh = gRect.height;
    var gap = 10;
    var left, top;

    // try positions around the selection, avoiding overlap
    if (selRect && selRect.width > 0 && selRect.height > 0) {
      // 1) right of selection, vertically centered
      left = selRect.right + gap;
      top = selRect.top + selRect.height / 2 - gh / 2;
      if (left + gw > window.innerWidth) left = window.innerWidth - gw - gap;

      // 2) if still would overlap or out of bounds, try below
      if (left + gw > window.innerWidth || top < gap || top + gh > window.innerHeight - gap ||
          (left < selRect.right && top + gh > selRect.top && top < selRect.bottom)) {
        left = selRect.left + selRect.width / 2 - gw / 2;
        top = selRect.bottom + gap;
      }

      // 3) if below doesn't fit, try above
      if (top + gh > window.innerHeight - gap || left < gap ||
          (top < selRect.bottom && left + gw > selRect.left && left < selRect.right)) {
        top = selRect.top - gh - gap;
      }

      // 4) if above doesn't fit, try left of selection
      if (top < gap) {
        left = selRect.left - gw - gap;
        top = selRect.top + selRect.height / 2 - gh / 2;
      }
    } else {
      // fallback: near mouse
      left = mx - gw / 2;
      top = my - gh - gap;
    }

    // clamp to viewport
    left = Math.max(gap, Math.min(left, window.innerWidth - gw - gap));
    top = Math.max(gap, Math.min(top, window.innerHeight - gh - gap));

    btnGroup.style.right = 'auto';
    btnGroup.style.bottom = 'auto';
    btnGroup.style.left = left + 'px';
    btnGroup.style.top = top + 'px';
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
