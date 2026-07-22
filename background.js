var SYSTEM_TRANSLATE = 'You are a translator. Translate the user input into Simplified Chinese (简体中文). Output only the Chinese translation. No explanations, no notes, no extra text. Never output Japanese, Korean, or any other non-Chinese language.';
var SYSTEM_CHAT = 'You are a helpful assistant. Answer questions about the provided text concisely and accurately.';
var SYSTEM_FULL_TRANSLATE = 'You are a translator. Translate the text after "---TRANSLATE---" into Simplified Chinese (简体中文). Use the surrounding context before and after to understand the topic and produce an accurate, natural translation. Output only the Chinese translation. No explanations, no notes, no extra text. Never output Japanese, Korean, or any other non-Chinese language.';

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

  var text = msg.text || '';
  if (!text) {
    sendResponse({ translation: '' });
    return;
  }

  var contextBefore = msg.contextBefore || '';
  var contextAfter = msg.contextAfter || '';
  var userContent = '';
  if (contextBefore) userContent += 'Context (previous paragraph):\n' + contextBefore + '\n\n';
  userContent += '---TRANSLATE---\n' + text;
  if (contextAfter) userContent += '\n\nContext (next paragraph):\n' + contextAfter;

  try {
    var result = await callDeepSeek([
      { role: 'system', content: SYSTEM_FULL_TRANSLATE },
      { role: 'user', content: userContent }
    ], apiKey);

    sendResponse({ translation: result });
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
