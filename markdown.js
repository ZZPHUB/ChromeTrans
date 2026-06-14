function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMarkdown(text) {
  var blocks = [];
  var safe = text.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
    blocks.push({ lang: lang.trim(), code: code.trim() });
    return '\x00CB' + (blocks.length - 1) + '\x00';
  });

  var lines = safe.split('\n');
  var out = [];
  var inList = false;
  var listTag = '';

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();

    if (/^\x00CB\d+\x00$/.test(trimmed)) {
      if (inList) { out.push('</' + listTag + '>'); inList = false; }
      out.push(trimmed);
      continue;
    }

    if (!trimmed) {
      if (inList) { out.push('</' + listTag + '>'); inList = false; }
      continue;
    }

    var h = trimmed.match(/^(#{1,6}) (.+)$/);
    if (h) {
      if (inList) { out.push('</' + listTag + '>'); inList = false; }
      var lv = h[1].length;
      out.push('<h' + lv + '>' + processInline(h[2]) + '</h' + lv + '>');
      continue;
    }

    var hr = trimmed.match(/^(\-{3,}|\*{3,})$/);
    if (hr) {
      if (inList) { out.push('</' + listTag + '>'); inList = false; }
      out.push('<hr>');
      continue;
    }

    var ul = trimmed.match(/^[\-\*] (.+)$/);
    if (ul) {
      if (inList && listTag !== 'ul') { out.push('</' + listTag + '>'); inList = false; }
      if (!inList) { out.push('<ul>'); inList = true; listTag = 'ul'; }
      out.push('<li>' + processInline(ul[1]) + '</li>');
      continue;
    }

    var ol = trimmed.match(/^\d+\. (.+)$/);
    if (ol) {
      if (inList && listTag !== 'ol') { out.push('</' + listTag + '>'); inList = false; }
      if (!inList) { out.push('<ol>'); inList = true; listTag = 'ol'; }
      out.push('<li>' + processInline(ol[1]) + '</li>');
      continue;
    }

    if (inList) { out.push('</' + listTag + '>'); inList = false; }

    var bq = trimmed.match(/^> (.+)$/);
    if (bq) {
      out.push('<blockquote><p>' + processInline(bq[1]) + '</p></blockquote>');
      continue;
    }

    out.push('<p>' + processInline(trimmed) + '</p>');
  }

  if (inList) out.push('</' + listTag + '>');

  var html = out.join('\n');
  html = html.replace(/\x00CB(\d+)\x00/g, function (_, idx) {
    var b = blocks[idx];
    var lang = b.lang ? ' class="language-' + escapeHtml(b.lang) + '"' : '';
    return '<pre><code' + lang + '>' + escapeHtml(b.code) + '</code></pre>';
  });

  return html;
}

function processInline(text) {
  text = escapeHtml(text);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return text;
}
