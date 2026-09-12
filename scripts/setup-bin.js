// Postinstall: copy ffmpeg/ffprobe binaries from npm packages into ./bin
// so fresh clones/forks work out of the box without committing ~150MB of
// binaries to git. Requires the ffmpeg-static + ffprobe-static dependencies.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BIN_DIR = path.join(ROOT, 'bin');
const EXE = process.platform === 'win32' ? '.exe' : '';

function resolveBin(pkgName) {
  try {
    const mod = require(pkgName);
    const p = typeof mod === 'string' ? mod : (mod && (mod.path || mod.ffprobePath));
    if (p && fs.existsSync(p)) return p;
  } catch (e) { /* fall through to error below */ }
  return null;
}

function main() {
  const ffmpegSrc = resolveBin('ffmpeg-static');
  const ffprobeSrc = resolveBin('ffprobe-static');

  if (!ffmpegSrc || !ffprobeSrc) {
    console.error('[setup-bin] Could not resolve ffmpeg/ffprobe from node_modules.');
    console.error('[setup-bin] Make sure ffmpeg-static + ffprobe-static are installed.');
    process.exit(1);
  }

  fs.mkdirSync(BIN_DIR, { recursive: true });

  const targets = [
    [ffmpegSrc, path.join(BIN_DIR, `ffmpeg${EXE}`)],
    [ffprobeSrc, path.join(BIN_DIR, `ffprobe${EXE}`)],
  ];
  for (const [src, dest] of targets) {
    fs.copyFileSync(src, dest);
    console.log(`[setup-bin] Copied ${path.basename(dest)} (${(fs.statSync(dest).size / 1048576).toFixed(1)} MB)`);
  }

  for (const exe of [`ffmpeg${EXE}`, `ffprobe${EXE}`]) {
    try {
      const out = execFileSync(path.join(BIN_DIR, exe), ['-version'], { encoding: 'utf8', timeout: 15000 });
      console.log(`[setup-bin] ${exe}: ${String(out).split('\n')[0]}`);
    } catch (e) {
      console.error(`[setup-bin] WARNING: ${exe} did not run: ${e.message}`);
    }
  }

  console.log('[setup-bin] Done. yt-dlp uses this folder via config.ytdl.ffmpegLocation');
}

main();
