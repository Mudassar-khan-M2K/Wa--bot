// lib/handler.js  ─  Central message router

import { serialize } from './serialize.js';
import { loadPlugins } from './loader.js';
import { detectSocialUrl, downloadMedia } from './downloader.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

const PREFIX = process.env.PREFIX || '.';
const MODE   = process.env.MODE   || 'public';

// ── Load all plugins once at startup ─────────────────────────────
const plugins = await loadPlugins();
console.log(chalk.gray(`  Loaded ${plugins.size} plugin(s)\n`));

// ── Typing indicator helper ───────────────────────────────────────
async function sendTyping(sock, jid) {
  if (process.env.AUTO_TYPING !== 'false') {
    await sock.sendPresenceUpdate('composing', jid).catch(() => {});
  }
}

// ── Main handler ──────────────────────────────────────────────────
export async function messageHandler(sock, rawMsg, store) {
  const msg = serialize(rawMsg, sock);

  if (!msg.body) return;

  const body    = msg.body.trim();
  const isCmd   = body.startsWith(PREFIX);
  const isOwner = msg.isOwner;

  // Private mode gate
  if (MODE === 'private' && !isOwner) return;

  // ─── Command handling ──────────────────────────────────────────
  if (isCmd) {
    const [rawCmd, ...args] = body.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = rawCmd.toLowerCase();

    const plugin = plugins.get(cmd);
    if (!plugin) {
      return msg.reply(`❓ Unknown command *${PREFIX}${cmd}*\nType *${PREFIX}help* to see all commands.`);
    }

    // Owner-only guard
    if (plugin.ownerOnly && !isOwner) {
      return msg.reply('🔒 This command is for the bot owner only.');
    }

    await sendTyping(sock, msg.from);
    try {
      await plugin.run({ sock, msg, args, store });
    } catch (err) {
      console.error(chalk.red(`[${cmd}] error:`), err.message);
      msg.reply(`⚠️ Error running *${PREFIX}${cmd}*:\n${err.message}`);
    }
    return;
  }

  // ─── Auto URL detection (no prefix needed) ────────────────────
  const socialUrl = detectSocialUrl(body);
  if (socialUrl) {
    await sendTyping(sock, msg.from);
    await msg.react('⏳');

    let filePath;
    try {
      const result = await downloadMedia(socialUrl);
      filePath = result.path;
      const ext  = path.extname(filePath).toLowerCase();
      const size = fs.statSync(filePath).size;
      const maxBytes = (Number(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024;

      if (size > maxBytes) {
        await msg.react('❌');
        await msg.reply(`⚠️ File too large (${(size / 1024 / 1024).toFixed(1)} MB). WhatsApp limit is ${process.env.MAX_FILE_SIZE_MB || 50} MB.`);
        fs.unlinkSync(filePath);
        return;
      }

      const mimeType = mime.lookup(filePath) || 'application/octet-stream';
      const isVideo  = mimeType.startsWith('video/');
      const isAudio  = mimeType.startsWith('audio/');
      const isImage  = mimeType.startsWith('image/');

      const caption = `*${result.title || 'Downloaded'}*\n\n📥 via ${result.platform || 'URL'}\n_Powered by DL-Bot_`;

      if (isVideo) {
        await sock.sendMessage(msg.from, {
          video: fs.readFileSync(filePath),
          caption,
          mimetype: mimeType,
        }, { quoted: rawMsg });
      } else if (isAudio) {
        await sock.sendMessage(msg.from, {
          audio: fs.readFileSync(filePath),
          mimetype: mimeType,
          ptt: false,
        }, { quoted: rawMsg });
      } else if (isImage) {
        await sock.sendMessage(msg.from, {
          image: fs.readFileSync(filePath),
          caption,
          mimetype: mimeType,
        }, { quoted: rawMsg });
      } else {
        await sock.sendMessage(msg.from, {
          document: fs.readFileSync(filePath),
          mimetype: mimeType,
          fileName: path.basename(filePath),
          caption,
        }, { quoted: rawMsg });
      }

      await msg.react('✅');

    } catch (err) {
      console.error(chalk.red('[downloader] error:'), err.message);
      await msg.react('❌');
      await msg.reply(`❌ Download failed:\n${err.message}`);
    } finally {
      if (filePath && process.env.AUTO_CLEANUP !== 'false') {
        fs.existsSync(filePath) && fs.unlinkSync(filePath);
      }
    }
  }
}
