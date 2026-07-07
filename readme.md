# YT Fast

A minimal YouTube video & MP3 downloader. Built with Node.js + Express + yt-dlp.

## Requirements

- Node.js (v16+) — that's it. yt-dlp and ffmpeg are fetched automatically below.
# How to Set Up

###  Download the Project

Clone the repository or download it as a ZIP.

```bash
git clone https://github.com/nandakisorr/yt-fast.git
```

---

# Windows

### 1. Install Node.js

Download and install Node.js from:

https://nodejs.org/en/download

### 2. Open the project in a terminal

```bash
cd C:\path\to\yt-fast
```

### 3. Install dependencies and start the app

```bash
npm install
npm run setup    # First time only
npm start
```

Open your browser and visit:

```
http://localhost:3000
```

---

# macOS

### 1. Install Node.js

You can either:

* Download it from https://nodejs.org/en/download
* Or install it using Homebrew:

```bash
brew install node
```

### 2. Open the project directory

```bash
cd /path/to/yt-fast
```

### 3. Install dependencies and start the app

```bash
npm install
npm run setup    # First time only
npm start
```

Open your browser and visit:

```
http://localhost:3000
```

> **Note:** If a static FFmpeg build isn't available for your macOS version, the setup script will prompt you to install it with:

```bash
brew install ffmpeg
```

---

# Linux

### 1. Install Node.js

Install Node.js using your distribution's package manager, or download it from:

https://nodejs.org/en/download

Examples:

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install nodejs npm
```

Fedora:

```bash
sudo dnf install nodejs npm
```

Arch Linux:

```bash
sudo pacman -S nodejs npm
```

### 2. Open the project directory

```bash
cd /path/to/yt-fast
```

### 3. Install dependencies and start the app

```bash
npm install
npm run setup    # First time only
npm start
```

Open your browser and visit:

```
http://localhost:3000
```

---

## What `npm run setup` Does
The `npm run setup` script will automatically fetch the required **yt-dlp** and **FFmpeg** binary for your machine and save it in the `./bin` directory of the local project. You won’t have to worry about downloading these binaries yourself or configuring the PATH of your system. The script works automatically for Windows and most Linux distributions, whereas for macOS, it'll ask you once to `brew install ffmpeg`.

## Usage

1. Paste any YouTube URL
2. Click **Fetch** to load video info and available qualities
3. Pick a quality (720p, 1080p, etc.) or **MP3** for audio only
4. Click **Download** — the file saves to your browser's downloads folder

## Notes

- Downloads are temporarily stored in `~/Downloads/yt-downloader/` and deleted after sending
- To update yt-dlp/ffmpeg later, delete the `bin/` folder and re-run `npm run setup`
