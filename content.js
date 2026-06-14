(function () {
  'use strict';

  var selectedText = '';
  var isTranslating = false;
  var dragState = null; // { type, startX, startY, startLeft, startTop, startW, startH }

  // ── create floating button ──
  var btn = document.createElement('div');
  btn.id = 'ds-trans-btn';
  btn.textContent = '译';
  document.body.appendChild(btn);

  // ── create translation bubble ──
  var bubble = document.createElement('div');
  bubble.id = 'ds-trans-bubble';
  bubble.innerHTML = '<div class="ds-bubble-header"><span class="ds-bubble-title">翻译</span><span class="ds-bubble-close">&times;</span></div><div class="ds-bubble-result"></div><div class="ds-bubble-resize"></div>';
  document.body.appendChild(bubble);

  var bubbleClose  = bubble.querySelector('.ds-bubble-close');
  var bubbleResult = bubble.querySelector('.ds-bubble-result');
  var bubbleHeader = bubble.querySelector('.ds-bubble-header');
  var bubbleResize = bubble.querySelector('.ds-bubble-resize');

  // ── event: detect text selection ──
  document.addEventListener('mouseup', function (e) {
    if (isOurUI(e.target) || isTranslating) return;
    setTimeout(function () {
      var sel = window.getSelection();
      var text = (sel && sel.toString().trim()) || '';
      if (text) {
        selectedText = text;
        var rect = sel.getRangeAt(0).getBoundingClientRect();
        btn.style.left = (rect.right + 6) + 'px';
        btn.style.top  = (rect.top + rect.height / 2 - 14) + 'px';
        btn.style.display = 'flex';
      } else {
        btn.style.display = 'none';
      }
    }, 10);
  });

  // ── event: scroll hides button ──
  document.addEventListener('scroll', function () {
    if (!isTranslating) btn.style.display = 'none';
  }, true);

  // ── event: click outside dismisses bubble ──
  document.addEventListener('mousedown', function (e) {
    if (!isOurUI(e.target)) bubble.style.display = 'none';
  });

  // ── button → translate ──
  btn.addEventListener('mousedown', function (e) {
    e.stopPropagation();
    e.preventDefault();
  });

  btn.addEventListener('click', async function () {
    if (isTranslating || !selectedText) return;
    isTranslating = true;

    var btnRect = btn.getBoundingClientRect();
    bubbleResult.innerHTML = '<div class="ds-spinner"></div>';

    // reset any previous resize, show to measure natural height
    bubble.style.width = '';
    bubble.style.height = '';
    bubble.style.display = 'block';
    var bw = 320;
    var bh = bubble.offsetHeight;

    var bx = btnRect.right + 8;
    var by = btnRect.bottom + 4;
    if (bx + bw > window.innerWidth) bx = window.innerWidth - bw - 12;
    if (bx < 12) bx = 12;
    if (by + bh > window.innerHeight) by = btnRect.top - bh - 4;
    if (by < 12) by = 12;

    bubble.style.left = bx + 'px';
    bubble.style.top  = by + 'px';
    btn.style.display = 'none';

    try {
      var res = await chrome.runtime.sendMessage({ type: 'translate', text: selectedText });
      bubbleResult.textContent = res.error || res.translation || '(空)';
    } catch (err) {
      bubbleResult.textContent = '请求失败: ' + err.message;
    }
    isTranslating = false;
  });

  // ── drag ──
  bubbleHeader.addEventListener('mousedown', function (e) {
    if (e.target === bubbleClose) return;
    e.preventDefault();
    dragState = {
      type: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      startLeft: parseInt(bubble.style.left) || 0,
      startTop: parseInt(bubble.style.top) || 0
    };
  });

  // ── resize ──
  bubbleResize.addEventListener('mousedown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dragState = {
      type: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      startW: bubble.offsetWidth,
      startH: bubble.offsetHeight
    };
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragState) return;
    if (dragState.type === 'drag') {
      bubble.style.left = (dragState.startLeft + e.clientX - dragState.startX) + 'px';
      bubble.style.top  = (dragState.startTop  + e.clientY - dragState.startY) + 'px';
    } else if (dragState.type === 'resize') {
      var w = Math.max(200, dragState.startW + e.clientX - dragState.startX);
      var h = Math.max(80,  dragState.startH + e.clientY - dragState.startY);
      w = Math.min(w, window.innerWidth - 12);
      h = Math.min(h, window.innerHeight - 12);
      bubble.style.width = w + 'px';
      bubble.style.height = h + 'px';
    }
  });

  document.addEventListener('mouseup', function () {
    dragState = null;
  });

  // ── bubble close button ──
  bubbleClose.addEventListener('click', function (e) {
    e.stopPropagation();
    bubble.style.display = 'none';
  });

  // ── helper: matches our UI elements ──
  function isOurUI(el) {
    while (el) {
      if (el === btn || el === bubble) return true;
      el = el.parentElement;
    }
    return false;
  }
})();
