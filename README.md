## Ink Air — An AR reader for MentraOS

Ink Air turns your AR glasses into a voice‑controlled e‑reader. Search among 75,000+ public‑domain books, download and read them out loud in your display, and control playback with simple phrases. You can even load your own `.txt` books — our chunking engine formats them for crisp, glanceable reading.

### Highlights
- **Voice reading control**: start, pause, resume, restart — all hands‑free.
- **75,000+ books**: searches Project Gutenberg via the Gutendex API.
- **Your own books**: drop in a `.txt` file and start reading by forking this repo.
- **Smart session handling**: if you close the Ink Air app on your phone, reading pauses; when you reopen, it resumes where you left off (Just say "hey sam resume")

## Quick Start
In the Mentra mobile app, turn on the Ink Air app to connect your glasses to our  server.

## Using Ink Air

When the session connects, you’ll see a quick animation and a prompt. Say “hey sam …” followed by a command.

### Voice commands
- **“hey sam, find [title or author]”**: Searches books. Example:
  - “hey sam find pride and prejudice”
- **“hey sam, get book [1-5]”**: Downloads one of the shown results. Example:
  - “hey sam get book 1”
- **“hey sam, start reading”**: Starts reading the loaded book from the beginning.
- **“hey sam, pause” / “hey sam, stop”**: Pauses reading immediately.
- **“hey sam, resume” / “hey sam, continue”**: Resumes from the current page.
- **“hey sam, start over” / “hey sam, restart”**: Jumps back to the beginning.

Notes:
- Searches use the public Gutendex API (Project Gutenberg). Most English books are available; language is currently optimized for English results.
- Results are limited to the top 5 to keep choices simple.

### Pause and resume on phone app close
- **Close Ink Air on your phone**: reading pauses within a moment.
- **Reopen Ink Air**: if you were mid‑reading, it **auto‑resumes on the same page**.

## Reading your own `.txt` books

You can load any plain‑text book. The chunker formats text into short, readable pages (about 3 lines × 5 words per line) with page numbers.

### Easiest method (no code)
1) Put your book’s text into a UTF‑8 `.txt` file.
2) Replace the file at `src/Burning_Chrome.txt` with your file’s contents (keep the same filename).
3) Start the app and say: “hey sam, start reading”.

This uses your text as the default reading content.

If you’re customizing the app, you can programmatically load a string into the reader:

```ts
import { loadBookContent, startEReader } from './src/inkAirDisplay';

// After you obtain your text (e.g., from disk or network):
await loadBookContent(myPlainText);
await startEReader(session, 0, samAssistant);
```

You can also drop `.txt` files into the `downloads/` folder — useful for caching or quick access while developing.

## How it works
- **Catalog**: Searches `https://gutendex.com` (Project Gutenberg mirror) and downloads `.txt` when available.
- **Chunking**: Text is split into small, high‑contrast pages for comfortable glance reading.
- **State**: The assistant tracks your current page, pausing timers and resuming correctly across disconnects.

## Scripts
```bash
# Type-check and build
bun run build

# Start built server
bun run start

# Dev mode (hot reload)
bun run dev
```

## Credits
- Public‑domain books from **Project Gutenberg** via **Gutendex**.
- Built on **MentraOS** with Bun.
