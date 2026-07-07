# YT Fast

A minimal YouTube video & MP3 downloader. Built with Node.js + Express + yt-dlp.

## Requirements

- Node.js (v16+) — that's it. yt-dlp and ffmpeg are fetched automatically below.

## Setup

First install **node js** 

```bash
npm install
npm run setup   # first time only : downloads yt-dlp + ffmpeg into ./bin
npm start
```

Then open **http://localhost:3000** in your browser.

`npm run setup` downloads platform-appropriate yt-dlp and ffmpeg binaries into
a local `./bin` folder — no manual downloads, no PATH edits. On macOS, if it
can't find a static ffmpeg build it'll ask you to run `brew install ffmpeg`
once; everything else is automatic on all platforms.

## Usage

1. Paste any YouTube URL
2. Click **Fetch** to load video info and available qualities
3. Pick a quality (720p, 1080p, etc.) or **MP3** for audio only
4. Click **Download** — the file saves to your browser's downloads folder

## Notes

- Downloads are temporarily stored in `~/Downloads/yt-downloader/` and deleted after sending
- To update yt-dlp/ffmpeg later, delete the `bin/` folder and re-run `npm run setup`
