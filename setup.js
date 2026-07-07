/**
 * setup.js — downloads yt-dlp + ffmpeg into ./bin so the app runs with
 * zero manual installs. Run once after cloning: `npm run setup`
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, 'bin');
const PLATFORM = process.platform; // 'win32' | 'darwin' | 'linux'
const ARCH = process.arch;         // 'x64' | 'arm64'

if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

// ─── helpers ────────────────────────────────────────────────────────────────

function download(url, destPath, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'yt-fast-setup' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        if (redirectsLeft <= 0) return reject(new Error('Too many redirects: ' + url));
        res.resume();
        return resolve(download(res.headers.location, destPath, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Download failed (${res.statusCode}): ${url}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

function extractArchive(archivePath, destDir) {
  // Modern Windows (10 1803+), macOS, and Linux all ship a `tar` that can
  // handle both .tar.xz and .zip — avoids adding an npm unzip dependency.
  execSync(`tar -xf "${archivePath}" -C "${destDir}"`, { stdio: 'inherit' });
}

function findFileRecursive(dir, filename) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFileRecursive(full, filename);
      if (found) return found;
    } else if (entry.name === filename) {
      return full;
    }
  }
  return null;
}

function markExecutable(filePath) {
  if (PLATFORM !== 'win32') fs.chmodSync(filePath, 0o755);
}

// ─── yt-dlp ─────────────────────────────────────────────────────────────────

async function setupYtDlp() {
  const destName = PLATFORM === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const dest = path.join(BIN_DIR, destName);
  if (fs.existsSync(dest)) {
    console.log('[yt-dlp] already present, skipping');
    return;
  }

  const assetMap = {
    win32: 'yt-dlp.exe',
    darwin: 'yt-dlp_macos',
    linux: ARCH === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux',
  };
  const asset = assetMap[PLATFORM];
  if (!asset) throw new Error(`Unsupported platform for yt-dlp: ${PLATFORM}`);

  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
  console.log(`[yt-dlp] downloading ${asset}...`);
  await download(url, dest);
  markExecutable(dest);
  console.log('[yt-dlp] done ->', dest);
}

// ─── ffmpeg (+ ffprobe) ─────────────────────────────────────────────────────

async function setupFfmpeg() {
  const ffmpegName = PLATFORM === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const destFfmpeg = path.join(BIN_DIR, ffmpegName);
  if (fs.existsSync(destFfmpeg)) {
    console.log('[ffmpeg] already present, skipping');
    return;
  }

  if (PLATFORM === 'win32' || PLATFORM === 'linux') {
    // Static builds from BtbN/FFmpeg-Builds (github, permanent "latest" tag)
    const assetMap = {
      win32: 'ffmpeg-master-latest-win64-gpl.zip',
      linux: ARCH === 'arm64' ? 'ffmpeg-master-latest-linuxarm64-gpl.tar.xz' : 'ffmpeg-master-latest-linux64-gpl.tar.xz',
    };
    const asset = assetMap[PLATFORM];
    const url = `https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/${asset}`;
    const archivePath = path.join(BIN_DIR, asset);

    console.log(`[ffmpeg] downloading ${asset}...`);
    await download(url, archivePath);
    console.log('[ffmpeg] extracting...');
    extractArchive(archivePath, BIN_DIR);
    fs.unlinkSync(archivePath);

    // Archive extracts into a versioned subfolder like ffmpeg-.../bin/ffmpeg(.exe)
    for (const name of [ffmpegName, PLATFORM === 'win32' ? 'ffprobe.exe' : 'ffprobe']) {
      const found = findFileRecursive(BIN_DIR, name);
      if (found && found !== path.join(BIN_DIR, name)) {
        fs.copyFileSync(found, path.join(BIN_DIR, name));
        markExecutable(path.join(BIN_DIR, name));
      }
    }
    console.log('[ffmpeg] done ->', destFfmpeg);
  } else if (PLATFORM === 'darwin') {
    // No official static cross-arch build source as reliable as BtbN for Mac.
    // Try Homebrew first since most Mac dev machines already have it.
    try {
      const brewPrefix = execSync('brew --prefix ffmpeg', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      const brewFfmpeg = path.join(brewPrefix, 'bin', 'ffmpeg');
      const brewFfprobe = path.join(brewPrefix, 'bin', 'ffprobe');
      if (fs.existsSync(brewFfmpeg)) {
        console.log('[ffmpeg] found existing Homebrew install, linking into ./bin');
        fs.copyFileSync(brewFfmpeg, destFfmpeg);
        if (fs.existsSync(brewFfprobe)) fs.copyFileSync(brewFfprobe, path.join(BIN_DIR, 'ffprobe'));
        markExecutable(destFfmpeg);
        return;
      }
    } catch (_) { /* brew not installed or ffmpeg not installed via brew */ }

    console.log('[ffmpeg] could not auto-fetch a static Mac build.');
    console.log('         Please run: brew install ffmpeg');
    console.log('         (the app will still work — it will fall back to ffmpeg on your PATH)');
  } else {
    console.log(`[ffmpeg] unsupported platform "${PLATFORM}", please install ffmpeg manually`);
  }
}

// ─── run ────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`Setting up yt-fast for ${PLATFORM}/${ARCH}...\n`);
  try {
    await setupYtDlp();
    await setupFfmpeg();
    console.log('\nSetup complete. Run `npm start` to launch the app.');
  } catch (err) {
    console.error('\nSetup failed:', err.message);
    console.error('You can still run the app if yt-dlp/ffmpeg are installed and on your system PATH.');
    process.exitCode = 1;
  }
})();
