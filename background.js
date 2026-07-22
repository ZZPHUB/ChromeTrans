var SYSTEM_TRANSLATE = 'You are a translator. Translate the user input into Simplified Chinese (简体中文). Output only the Chinese translation. No explanations, no notes, no extra text. Never output Japanese, Korean, or any other non-Chinese language.';
var SYSTEM_CHAT = 'You are a helpful assistant. Answer questions about the provided text concisely and accurately.';
var SYSTEM_FULL_TRANSLATE = 'You are a translator. Translate each paragraph below into Simplified Chinese (简体中文). Paragraphs are separated by "===PARA_SEP===". Output translations separated by "===PARA_SEP===", same order and count, in Chinese only. Do not add or remove paragraphs. Output only Chinese translations, no extra text. Never output Japanese, Korean, or any other non-Chinese language.';

var FULL_PARAGRAPH_SEPARATOR = '\n\n===PARA_SEP===\n\n';

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'translate') {
    handleTranslate(msg, sendResponse);
    return true;
  }
  if (msg.type === 'chat') {
    handleChat(msg, sendResponse);
    return true;
  }
  if (msg.type === 'fullTranslate') {
    handleFullTranslate(msg, sendResponse);
    return true;
  }
});

async function handleTranslate(msg, sendResponse) {
  var apiKey = await getApiKey(sendResponse);
  if (!apiKey) return;

  try {
    var result = await callDeepSeek([
      { role: 'system', content: SYSTEM_TRANSLATE },
      { role: 'user', content: msg.text }
    ], apiKey);
    sendResponse({ translation: result });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

async function handleChat(msg, sendResponse) {
  var apiKey = await getApiKey(sendResponse);
  if (!apiKey) return;

  try {
    var result = await callDeepSeek(msg.messages, apiKey);
    sendResponse({ reply: result });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

async function handleFullTranslate(msg, sendResponse) {
  var apiKey = await getApiKey(sendResponse);
  if (!apiKey) return;

  var paragraphs = msg.paragraphs || [];
  if (paragraphs.length === 0) {
    sendResponse({ translations: [] });
    return;
  }

  var input = paragraphs.join(FULL_PARAGRAPH_SEPARATOR);

  try {
    var result = await callDeepSeek([
      { role: 'system', content: SYSTEM_FULL_TRANSLATE },
      { role: 'user', content: input }
    ], apiKey);

    var translations = result.split(FULL_PARAGRAPH_SEPARATOR).map(function (t) { return t.trim(); });
    sendResponse({ translations: translations });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

async function getApiKey(sendResponse) {
  var data = await chrome.storage.sync.get('apiKey');
  if (!data.apiKey) {
    sendResponse({ error: 'Please set your DeepSeek API Key first' });
    return null;
  }
  return data.apiKey;
}

async function callDeepSeek(messages, apiKey) {
  var res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: 'deepseek-v4-pro',
      thinking: { type: 'disabled' },
      messages: messages
    })
  });

  if (!res.ok) {
    var body = await res.text();
    throw new Error('API ' + res.status + ': ' + body);
  }

  var data = await res.json();
  return data.choices[0].message.content.trim();
}
