// plugins/utility.js  ─  Ping, info, uptime

const startTime = Date.now();

const ping = {
  name: 'ping',
  description: 'Check bot latency',
  ownerOnly: false,
  async run({ msg }) {
    const start = Date.now();
    await msg.reply('🏓 Pong!');
    const latency = Date.now() - start;
    await msg.reply(`⚡ Latency: *${latency}ms*`);
  },
};

const info = {
  name: ['info', 'botinfo'],
  description: 'Show bot information',
  ownerOnly: false,
  async run({ msg }) {
    const memMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    await msg.reply(
      `*🤖 DL-Bot Info*\n\n` +
      `• Version: 1.0.0\n` +
      `• Prefix: ${process.env.PREFIX || '.'}\n` +
      `• Mode: ${process.env.MODE || 'public'}\n` +
      `• Node: ${process.version}\n` +
      `• Memory: ${memMB} MB\n` +
      `• Platform: Baileys MD\n\n` +
      `_Inspired by WASI-MD-V7_`
    );
  },
};

const uptime = {
  name: 'uptime',
  description: 'Show bot uptime',
  ownerOnly: true,
  async run({ msg }) {
    const ms  = Date.now() - startTime;
    const s   = Math.floor(ms / 1000);
    const m   = Math.floor(s  / 60);
    const h   = Math.floor(m  / 60);
    const d   = Math.floor(h  / 24);

    await msg.reply(
      `⏱ *Uptime*\n${d}d ${h % 24}h ${m % 60}m ${s % 60}s`
    );
  },
};

export default [ping, info, uptime];
