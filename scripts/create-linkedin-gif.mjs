import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const TARGET_URL = process.argv[2] || 'https://pcmn1000.github.io/my-side-by-side-app/';
const OUTPUT_GIF = process.argv[3] || path.resolve('docs/images/btp-agentation-demo.gif');
const TARGET_SELECTOR = process.argv[4] || '.demo-container-wrap';

const STEP_DURATION = 4200;
const TOTAL_STEPS = 4;
const RECORD_MS = STEP_DURATION * TOTAL_STEPS + 5000;
const GIF_FPS = 15;
const TRIM_START_S = 2.0;
const DPR = 2;
const VP_W = 900;
const VP_H = 500;
const GIF_OUT_W = 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const tmpDir = path.resolve('tmp-gif-recording');
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log('1/3  Recording demo at ' + VP_W + 'x' + VP_H + ' @' + DPR + 'x...');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: VP_W, height: VP_H },
    deviceScaleFactor: DPR,
    recordVideo: { dir: tmpDir, size: { width: VP_W * DPR, height: VP_H * DPR } }
  });
  const page = await ctx.newPage();
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector(TARGET_SELECTOR);

  // Scroll so target demo area is at the top of the viewport
  await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, TARGET_SELECTOR);
  await sleep(400);

  // Measure exact target position (CSS px)
  const rect = await page.evaluate((selector) => {
    const target = document.querySelector(selector);
    if (!target) return null;
    const r = target.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, TARGET_SELECTOR);
  if (!rect) throw new Error('Target selector not found: ' + TARGET_SELECTOR);
  console.log('   target rect (' + TARGET_SELECTOR + '): x=' + rect.x + ' y=' + rect.y + ' w=' + rect.w + ' h=' + rect.h);

  // Video pixel coords (2x)
  const cx = Math.max(0, Math.floor(rect.x * DPR));
  const cy = Math.max(0, Math.floor(rect.y * DPR));
  const cw = Math.floor(rect.w * DPR);
  const ch = Math.floor(rect.h * DPR);
  console.log('   Crop: ' + cw + 'x' + ch + '+' + cx + '+' + cy);

  // Force step 0
  await page.evaluate(() => {
    const dot = document.querySelector('.demo-step-dot[data-step="0"]');
    if (dot) dot.click();
  });
  await sleep(600);

  console.log('2/3  Recording ' + (RECORD_MS / 1000) + 's (steps 1-4 + Copilot)...');
  await sleep(RECORD_MS);

  const videoPath = await page.video().path();
  await ctx.close();
  await browser.close();
  console.log('     Video: ' + videoPath);

  // ffmpeg: trim + crop to target area + scale + 2-pass
  const palettePng = path.join(tmpDir, 'palette.png');
  const filters = 'fps=' + GIF_FPS + ',crop=' + cw + ':' + ch + ':' + cx + ':' + cy + ',scale=' + GIF_OUT_W + ':-1:flags=lanczos';

  console.log('3/3  ffmpeg: trim ' + TRIM_START_S + 's + crop + scale to ' + GIF_OUT_W + 'px...');
  execSync('ffmpeg -y -ss ' + TRIM_START_S + ' -i "' + videoPath + '" -vf "' + filters + ',palettegen=max_colors=256:stats_mode=diff" "' + palettePng + '"', { stdio: 'pipe' });
  execSync('ffmpeg -y -ss ' + TRIM_START_S + ' -i "' + videoPath + '" -i "' + palettePng + '" -lavfi "' + filters + '[x];[x][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 "' + OUTPUT_GIF + '"', { stdio: 'pipe' });

  fs.rmSync(tmpDir, { recursive: true, force: true });
  const stat = fs.statSync(OUTPUT_GIF);
  console.log('\nDone! ' + OUTPUT_GIF + ' (' + (stat.size / 1048576).toFixed(2) + ' MB)');
  // Verify dimensions
  try {
    const probe = execSync('ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "' + OUTPUT_GIF + '"').toString().trim();
    console.log('Output: ' + probe + ' px');
  } catch(e) {}
}

main().catch((e) => { console.error(e); process.exit(1); });
