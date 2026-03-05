// plugins/help.js

const PREFIX = process.env.PREFIX || '.';

export default {
  name: ['help', 'menu', 'h'],
  description: 'Show all available commands',
  ownerOnly: false,

  async run({ sock, msg }) {
    const text = `
╔══════════════════════════════╗
║      *DL-Bot Commands*       ║
╚══════════════════════════════╝

*📥 Auto Download (no command!)*
Just send a link from:
  • YouTube / YouTube Shorts
  • TikTok
  • Instagram (Reels/Posts)
  • Twitter / X
  • Facebook
  • Reddit
  • Pinterest

*🔧 Commands*
${PREFIX}help     — Show this menu
${PREFIX}dl <url> — Download a specific URL
${PREFIX}ping     — Check bot response time
${PREFIX}info     — Bot information

*👑 Owner Commands*
${PREFIX}restart  — Restart the bot
${PREFIX}uptime   — Show uptime stats

_Powered by Baileys + yt-dlp_
`.trim();

    await msg.reply(text);
  },
};
