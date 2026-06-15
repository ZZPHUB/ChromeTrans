# DeepSeek Smart Select

Select text on any webpage to **translate**, **chat**, or **full-page translate** with DeepSeek V4 Pro.

## Features

| Feature | Description |
|---|---|
| **Translate (T)** | One-shot English-to-Chinese translation in a draggable/resizable bubble. Result is cached — reopen shows it instantly without re-calling the API. |
| **Chat (C)** | Multi-turn conversation with DeepSeek about the full page content. Markdown rendering for code blocks, lists, tables, and more. Conversation history is preserved across close/reopen. |
| **Full Translate (FT)** | Toggle full-page translation. Translates visible paragraphs on-demand and inserts them inline below each original. Scrolls auto-translate new paragraphs. Translation results are cached across toggles. |
| **Button group** | T, C, FT are unified in a single draggable panel at the bottom-right. The group snaps to your mouse position after you select text. |
| **Font scale** | Slider in the popup (0.5x – 2.0x) scales all UI relative to the current page's base font size. |
| **Bubble controls** | Both translate and chat bubbles are draggable (by the title bar) and resizable (by the bottom-right handle). |

## Installation

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `ChromeTrans/` folder
4. Click the extension icon in the toolbar → enter your DeepSeek API Key → Save

## Usage

| Action | How |
|---|---|
| Set API Key | Click extension icon → paste `sk-...` → Save |
| Adjust font size | Click extension icon → drag the **Font Scale** slider |
| Translate selected text | Select text → click blue **T** button in the group |
| Chat about the page | Click teal **C** button → type questions → Enter or Send |
| Full-page translate | Click orange **FT** button → toggle on/off |
| Move the button group | Drag the gap between buttons, or select text to snap it to your mouse position |

## Project Structure

```
ChromeTrans/
├── manifest.json       # Chrome MV3 extension manifest
├── background.js       # Service worker — API calls to DeepSeek
├── content.js          # Content script — UI buttons, bubbles, drag/resize, caching
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

| Type | Endpoint | Description |
|---|---|---|
| Translate | `POST /chat/completions` | One-shot English-to-Chinese translation |
| Chat | `POST /chat/completions` | Multi-turn conversation with markdown output |
| Full Translate | `POST /chat/completions` | Batch paragraph-by-paragraph translation |

## License

MIT
