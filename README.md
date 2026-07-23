# DeepSeek Smart Select

Select text on any webpage to **translate**, **chat**, or **full-page translate** with DeepSeek V4 Pro.

## Features

| Feature | Description |
|---|---|
| **Translate** 🌐 | One-shot English-to-Chinese translation in a draggable/resizable bubble with a blue gradient header. Result is cached — reopen shows it instantly without re-calling the API. Bubble appears near the selected text. |
| **Chat** 💬 | Multi-turn conversation with DeepSeek about the full page content. Markdown rendering for code blocks, lists, tables, and more. Glassmorphism bubble (2/3 viewport) with teal gradient header, centered in the viewport. Conversation history is preserved across close/reopen. |
| **Full Translate** 📄 | Toggle full-page translation. Translates all paragraphs at once — replaces original text with translation. Click the inline ⇅ toggle button on any paragraph to flip between original and translation. Proper nouns (software names, brands, acronyms) are preserved in original form. Multi-layer filtering excludes nav, code, timestamps, and non-prose content. Cached across toggles. |
| **Pin** 📌 | Lock the button group in place. When pinned, the group won't move with text selection or dragging. Unpin to restore normal behavior. |
| **Button group** | Four icon buttons (🌐 💬 📄 📌) in a draggable panel. Positions adjacent to the selection (never covers it). Double-click the gap to cycle layouts: 1×4 vertical, 4×1 horizontal, 2×2 grid. Activated buttons pulse with a colored glow. |
| **Font scale** | Slider in the popup (0.5x – 2.0x) scales all UI relative to the current page's base font size. |
| **Bubble controls** | Both translate and chat bubbles are draggable (by the title bar) and resizable (by the bottom-right handle). Resize handle and scrollbars appear on hover for a clean look. Bubbles animate in with a smooth scale+fade effect. |

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
| Translate selected text | Select text → click blue **T** (🌐) button — bubble appears near selection |
| Chat about the page | Click teal **C** (💬) button → bubble opens centered at 2/3 viewport → type questions → Enter or Send |
| Full-page translate | Click orange **FT** (📄) button → toggle on/off |
| Lock button position | Click gray **P** (📌) button → turns pink to indicate pinned |
| Move the button group | Drag the gap between buttons, or select text to snap it near the selection (only when unpinned) |
| Change button layout | Double-click the gap between buttons to cycle: 1×4 → 4×1 → 2×2 |

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
