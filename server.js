const express = require('express');
const cors = require('cors');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── PATHS ───────────────────────────────────────────────────────────────────
// Looks for yt-dlp/ffmpeg in ./bin first (populated by `npm run setup`).
// Falls back to whatever's on the system PATH if ./bin is empty, so this
// still works for people who already have yt-dlp/ffmpeg installed globally.
const BIN_DIR = path.join(__dirname, 'bin');
const IS_WIN = process.platform === 'win32';

function resolveBinary(localName, pathName) {
  const local = path.join(BIN_DIR, localName);
  return fs.existsSync(local) ? local : pathName; // pathName = bare command, resolved via PATH
}

const YTDLP = resolveBinary(IS_WIN ? 'yt-dlp.exe' : 'yt-dlp', 'yt-dlp');
// --ffmpeg-location accepts a directory containing ffmpeg/ffprobe, or omit
// it entirely to let yt-dlp search PATH on its own.
const FFMPEG_DIR = fs.existsSync(path.join(BIN_DIR, IS_WIN ? 'ffmpeg.exe' : 'ffmpeg')) ? BIN_DIR : null;

function ffmpegArgs() {
  return FFMPEG_DIR ? ['--ffmpeg-location', FFMPEG_DIR] : [];
}

if (!fs.existsSync(BIN_DIR) || (YTDLP === 'yt-dlp' && !FFMPEG_DIR)) {
  console.log('[SETUP] yt-dlp/ffmpeg not found in ./bin — run "npm run setup" to download them automatically,');
  console.log('        or make sure yt-dlp/ffmpeg are installed and on your PATH.');
}
// ─────────────────────────────────────────────────────────────────────────────

const DOWNLOAD_DIR = path.join(os.homedir(), 'Downloads', 'yt-downloader');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// Get video info
app.post('/api/info', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const args = [
    ...ffmpegArgs(),
    '--dump-json',
    '--no-playlist',
    url
  ];

  console.log('[INFO] Running:', YTDLP, args.join(' '));

  execFile(YTDLP, args, { timeout: 30000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[INFO ERROR]', stderr);
      return res.status(400).json({ error: stderr || 'Could not fetch video info.' });
    }
    try {
      const info = JSON.parse(stdout);
      const formats = [];

      if (info.formats) {
        const seen = new Set();
        for (const f of info.formats) {
          if (f.vcodec && f.vcodec !== 'none' && f.height) {
            const key = `${f.height}p`;
            if (!seen.has(key)) {
              seen.add(key);
              formats.push({
                id: f.format_id,
                label: `${f.height}p`,
                type: 'video',
                ext: f.ext || 'mp4',
                filesize: f.filesize || f.filesize_approx || null,
              });
            }
          }
        }
        formats.sort((a, b) => parseInt(b.label) - parseInt(a.label));
      }

      formats.push({ id: 'mp3', label: 'MP3 (audio only)', type: 'audio', ext: 'mp3' });

      res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        channel: info.channel || info.uploader,
        formats,
      });
    } catch (e) {
      console.error('[PARSE ERROR]', e.message);
      res.status(500).json({ error: 'Failed to parse video info.' });
    }
  });
});

// Download endpoint
app.post('/api/download', (req, res) => {
  const { url, formatId } = req.body;
  if (!url || !formatId) return res.status(400).json({ error: 'Missing params' });

  const isAudio = formatId === 'mp3';
  const tmpFile = path.join(DOWNLOAD_DIR, `download_${Date.now()}.%(ext)s`);

  const args = isAudio
    ? [...ffmpegArgs(), '-x', '--audio-format', 'mp3', '-o', tmpFile, '--no-playlist', url]
    : [...ffmpegArgs(), '-f', `${formatId}+bestaudio[ext=m4a]/best`, '--merge-output-format', 'mp4', '-o', tmpFile, '--no-playlist', url];

  console.log('[DOWNLOAD] Running:', YTDLP, args.join(' '));

  // Derive the final merged filename from the template (replacing %(ext)s)
  const finalMp4Path = tmpFile.replace('%(ext)s', 'mp4');
  const finalMp3Path = tmpFile.replace('%(ext)s', 'mp3');

  const proc = spawn(YTDLP, args);
  let outputPath = null;
  let stdoutBuf = '';
  let stderrBuf = '';

  const parsePaths = (line) => {
    const mergeMatch = line.match(/\[Merger\] Merging formats into "(.+?)"/);
    if (mergeMatch) outputPath = mergeMatch[1].trim();
    const mp3Match = line.match(/\[ExtractAudio\] Destination: (.+)/);
    if (mp3Match) outputPath = mp3Match[1].trim();
    // Single-file download (no merge needed)
    const destMatch = line.match(/\[download\] Destination: (.+)/);
    if (destMatch && !outputPath) outputPath = destMatch[1].trim();
  };

  proc.stderr.on('data', (data) => {
    const line = data.toString();
    stderrBuf += line;
    process.stdout.write('[yt-dlp stderr] ' + line);
    parsePaths(line);
  });

  proc.stdout.on('data', (data) => {
    const line = data.toString();
    stdoutBuf += line;
    process.stdout.write('[yt-dlp stdout] ' + line);
    parsePaths(line);
  });

  proc.on('close', (code) => {
    // Fallback: use the predictable final path if regex didn't catch it
    if (!outputPath) {
      outputPath = isAudio ? finalMp3Path : finalMp4Path;
      console.log('[DOWNLOAD] Using fallback path:', outputPath);
    }

    console.log('[DOWNLOAD] Exit code:', code, '| Output path:', outputPath);

    if (code !== 0) {
      return res.status(500).json({ error: `yt-dlp exited with code ${code}. condact dev.` });
    }
    if (!fs.existsSync(outputPath)) {
      console.error('[DOWNLOAD] File not found at:', outputPath);
      return res.status(500).json({ error: 'File not found after download.condact dev.' });
    }

    const filename = path.basename(outputPath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on('end', () => fs.unlink(outputPath, () => {}));
    stream.on('error', (e) => {
      console.error('[STREAM ERROR]', e);
      res.status(500).end();
    });
  });

  proc.on('error', (e) => {
    console.error('[SPAWN ERROR]', e);
    res.status(500).json({ error: `Failed to start yt-dlp: ${e.message}` });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n YouTube Downloader running at http://localhost:${PORT}`);
  console.log(`   yt-dlp path : ${YTDLP}`);
  console.log(`   ffmpeg dir  : ${FFMPEG_DIR || '(using system PATH)'}`);
  console.log(`   downloads   : ${DOWNLOAD_DIR}\n`);
});