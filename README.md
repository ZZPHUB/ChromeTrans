# DeepSeek Smart Select

Select text on any webpage to **translate** or **chat** with DeepSeek V4 Pro.

## Features

- **Translate** — one-shot English-to-Chinese translation
- **Chat** — multi-turn conversation with DeepSeek about the selected text, with full markdown rendering (code blocks, lists, tables, etc.)
- **Two floating buttons** appear near the selection — blue `T` for translate, teal `C` for chat
- **Draggable & resizable** bubbles
- **Font scale** control — scales relative to the current page's base font size
- **Smart positioning** — buttons flip to the left when the selection is near the right edge of the viewport

## Installation

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `ChromeTrans/` folder
4. Click the extension icon in the toolbar → enter your DeepSeek API Key → Save

## Usage

| Action | How |
|---|---|
| Set API Key | Click extension icon → paste `sk-...` → Save |
| Adjust font size | Click extension icon → drag the **Font Scale** slider (0.5x – 2.0x) |
| Translate | Select text → click blue **T** button |
| Chat | Select text → click teal **C** button → type questions in the chat bubble |

## Project Structure

```
ChromeTrans/
├── manifest.json       # Chrome MV3 extension manifest
├── background.js       # Service worker — API calls to DeepSeek
├── content.js          # Content script — UI buttons, bubbles, drag/resize
├── content.css         # Styles for all UI elements
├── markdown.js         # Markdown-to-HTML renderer for chat responses
├── popup.html          # Popup — API Key input + font scale slider
├── popup.js            # Popup logic — save/load settings
├── gen_icons.py        # Icon generator (requires Pillow)
├── icons/              # Generated PNG icons (16, 48, 128)
└── .gitignore
```

## API

Uses [DeepSeek API](https://platform.deepseek.com/api_keys) — model `deepseek-v4-pro` with thinking mode disabled for fast, cost-effective responses.

| Type | Endpoint | System Prompt |
|---|---|---|
| Translate | `POST /chat/completions` | English-to-Chinese translator |
| Chat | `POST /chat/completions` | Helpful assistant with markdown formatting |

## License

MIT
