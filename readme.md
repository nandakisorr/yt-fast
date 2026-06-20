# YT Fast

A minimal YouTube video & MP3 downloader. Built with Node.js + Express + yt-dlp.

## Requirements

- Node.js (v16+)
- Python 3
- yt-dlp

## Setup

### 1. Install yt-dlp

**Linux / Mac:**
```bash
pip install yt-dlp
```

**Windows:**
```bash
pip install yt-dlp
# or download yt-dlp.exe from https://github.com/yt-dlp/yt-dlp/releases
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Run the server

```bash
node server.js
```

Then open **http://localhost:3000** in your browser.

## Usage

1. Paste any YouTube URL
2. Click **Fetch** to load video info and available qualities
3. Pick a quality (720p, 1080p, etc.) or **MP3** for audio only
4. Click **Download** — the file saves to your browser's downloads folder

## Notes

- Downloads are temporarily stored in `~/Downloads/yt-downloader/` and deleted after sending
- For best results, keep yt-dlp updated: `pip install -U yt-dlp`
- MP3 conversion requires ffmpeg: `sudo apt install ffmpeg` (Linux) or `brew install ffmpeg` (Mac)

## ffmpeg (required for MP3 & merging high-quality video)

**Linux:**
```bash
sudo apt install ffmpeg
```

**Mac:**
```bash
brew install ffmpeg
```

**Windows:**  
Download from https://ffmpeg.org/download.html and add to PATH.
# yt-fast
