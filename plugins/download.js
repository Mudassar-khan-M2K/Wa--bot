// plugins/download.js  ─  Explicit .dl <url> command

import { downloadMedia, getPlatform } from '../lib/downloader.js';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

export default {
  name: ['dl', 'download', 'get'],
  description: 'Download media from a social media URL',
  ownerOnly: false,

  async run({ sock, msg, args }) {
    const url = args[0];

    if (!url || !url.startsWith('http')) {
      return msg.reply(
        `❌ Please provide a valid URL.\n\nUsage: *${process.env.PREFIX || '.'}dl <url>*\n\nExample:\n.dl https://www.tiktok.com/@user/video/123`
      );
    }

    await msg.react('⏳');
    await msg.reply(`⬇️ Downloading from *${getPlatform(url)}*...`);

    let filePath;
    try {
      const result = await downloadMedia(url);
      filePath = result.path;

      const size     = fs.statSync(filePath).size;
      const maxBytes = (Number(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024;

      if (size > maxBytes) {
        await msg.react('❌');
        fs.unlinkSync(filePath);
        return msg.reply(
          `⚠️ File is too large (${(size / 1024 / 1024).toFixed(1)} MB).\nWhatsApp limit is ${process.env.MAX_FILE_SIZE_MB || 50} MB.`
        );
      }

      const mimeType = mime.lookup(filePath) || 'application/octet-stream';
      const isVideo  = mimeType.startsWith('video/');
      const isAudio  = mimeType.startsWith('audio/');
      const isImage  = mimeType.startsWith('image/');
      const caption  = `*${result.title || 'Downloaded'}*\n📥 ${result.platform}\n_DL-Bot_`;

      const fileBuffer = fs.readFileSync(filePath);

      if (isVideo) {
        await sock.sendMessage(msg.from, { video: fileBuffer, caption, mimetype: mimeType }, { quoted: msg });
      } else if (isAudio) {
        await sock.sendMessage(msg.from, { audio: fileBuffer, mimetype: mimeType, ptt: false }, { quoted: msg });
      } else if (isImage) {
        await sock.sendMessage(msg.from, { image: fileBuffer, caption, mimetype: mimeType }, { quoted: msg });
      } else {
        await sock.sendMessage(msg.from, {
          document: fileBuffer,
          mimetype: mimeType,
          fileName: path.basename(filePath),
          caption,
        }, { quoted: msg });
      }

      await msg.react('✅');

    } catch (err) {
      await msg.react('❌');
      await msg.reply(`❌ Download failed:\n${err.message}`);
    } finally {
      if (filePath && process.env.AUTO_CLEANUP !== 'false') {
        fs.existsSync(filePath) && fs.unlinkSync(filePath);
      }
    }
  },
};
