// lib/downloader.js  ─  Social media download via yt-dlp

import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR   = path.join(__dirname, '..', 'tmp');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ── Supported platforms ────────────────────────────────────────
const PLATFORMS = {
  youtube:   { regex: /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)/i,   name: 'YouTube'   },
  tiktok:    { regex: /tiktok\.com\//i,                                           name: 'TikTok'    },
  instagram: { regex: /instagram\.com\/(?:p|reel|reels|tv)\//i,                   name: 'Instagram' },
  twitter:   { regex: /(?:twitter\.com|x\.com)\/\w+\/status\//i,                 name: 'Twitter/X' },
  facebook:  { regex: /(?:facebook\.com|fb\.watch)\//i,                           name: 'Facebook'  },
  reddit:    { regex: /reddit\.com\/r\/.+\/comments\//i,                          name: 'Reddit'    },
  pinterest: { regex: /pinterest\.com\/pin\//i,                                   name: 'Pinterest' },
  snapchat:  { regex: /snapchat\.com\/spotlight\//i,                              name: 'Snapchat'  },
};

/**
 * Detect if a string contains a supported social media URL.
 * Returns the URL string or null.
 */
export function detectSocialUrl(text) {
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const urls = text.match(urlRegex) || [];

  for (const url of urls) {
    for (const { regex } of Object.values(PLATFORMS)) {
      if (regex.test(url)) return url;
    }
  }
  return null;
}

/**
 * Get platform name from URL.
 */
export function getPlatform(url) {
  for (const { regex, name } of Object.values(PLATFORMS)) {
    if (regex.test(url)) return name;
  }
  return 'Unknown';
}

/**
 * Download media from a social media URL using yt-dlp.
 * Returns { path, title, platform }
 */
export async function downloadMedia(url) {
  const id       = randomBytes(6).toString('hex');
  const outTpl   = path.join(TMP_DIR, `${id}.%(ext)s`);
  const platform = getPlatform(url);

  // ── Get metadata first ─────────────────────────────────────
  let title = 'download';
  try {
    const { stdout } = await execFileAsync('yt-dlp', [
      '--no-warnings',
      '--get-title',
      '--no-playlist',
      url,
    ], { timeout: 20_000 });
    title = stdout.trim().slice(0, 100);
  } catch (_) { /* metadata optional */ }

  // ── Download ───────────────────────────────────────────────
  const ytdlpArgs = [
    '--no-warnings',
    '--no-playlist',
    '--max-filesize', `${(Number(process.env.MAX_FILE_SIZE_MB) || 50)}m`,
    '-f', 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best',
    '--merge-output-format', 'mp4',
    '-o', outTpl,
    url,
  ];

  await execFileAsync('yt-dlp', ytdlpArgs, { timeout: 120_000 });

  // ── Find the output file ───────────────────────────────────
  const files = fs.readdirSync(TMP_DIR)
    .filter(f => f.startsWith(id))
    .map(f => path.join(TMP_DIR, f));

  if (files.length === 0) {
    throw new Error('yt-dlp ran but no output file was created.');
  }

  return { path: files[0], title, platform };
}
