chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'translate') return;

  (async () => {
    const { apiKey } = await chrome.storage.sync.get('apiKey');
    if (!apiKey) {
      sendResponse({ error: '请先设置 DeepSeek API Key' });
      return;
    }
    try {
      const translation = await translateText(msg.text, apiKey);
      sendResponse({ translation });
    } catch (err) {
      sendResponse({ error: err.message });
    }
  })();

  return true;
});

async function translateText(text, apiKey) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-v4-pro',
      thinking: { type: 'disabled' },
      messages: [
        {
          role: 'system',
          content: '你是一个英译中翻译助手。只输出翻译结果，不要任何解释、注释或额外文字。'
        },
        { role: 'user', content: text }
      ]
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}
