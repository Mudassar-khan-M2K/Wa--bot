// ═══════════════════════════════════════════════════════════════
//  WhatsApp Downloader Bot  ·  Powered by Baileys (Pair Code)
//  Inspired by WASI-MD-V7 architecture
// ═══════════════════════════════════════════════════════════════

import 'dotenv/config';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  jidDecode,
  proto,
  getContentType,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import readline from 'readline';
import chalk from 'chalk';
import NodeCache from 'node-cache';
import { messageHandler } from './lib/handler.js';

// ── Logger (quiet in production, noisy in dev) ──────────────────
const logger = pino({
  level: process.env.LOG_LEVEL || 'silent',
});

// ── In-memory message store ────────────────────────────────────
const store = makeInMemoryStore({ logger });
store.readFromFile?.('./tmp/store.json');
setInterval(() => store.writeToFile?.('./tmp/store.json'), 10_000);

// ── Retry message cache ─────────────────────────────────────────
const msgRetryCounterCache = new NodeCache();

// ── Helpers ─────────────────────────────────────────────────────
const banner = () => {
  console.log(chalk.cyan(`
╔══════════════════════════════════════╗
║   WhatsApp Downloader Bot  v1.0      ║
║   Powered by Baileys + yt-dlp        ║
║   Inspired by WASI-MD-V7             ║
╚══════════════════════════════════════╝
`));
};

const askQuestion = (q) =>
  new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (ans) => { rl.close(); res(ans.trim()); });
  });

// ── Main connection function ────────────────────────────────────
async function connectToWhatsApp() {
  banner();

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(chalk.gray(`Using WA v${version.join('.')} — latest: ${isLatest}`));

  const { state, saveCreds } = await useMultiFileAuthState(
    process.env.SESSION_NAME || 'session'
  );

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,          // we use pair code, not QR
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg?.message || undefined;
      }
      return proto.Message.fromObject({});
    },
  });

  // Bind store to socket events
  store?.bind(sock.ev);

  // ── Pair Code Auth ───────────────────────────────────────────
  if (!sock.authState.creds.registered) {
    let phone = process.env.PHONE_NUMBER;
    if (!phone) {
      phone = await askQuestion(
        chalk.yellow('📱 Enter your WhatsApp number (with country code, no +): ')
      );
    }
    phone = phone.replace(/[^0-9]/g, '');

    console.log(chalk.yellow('\n⏳  Requesting pair code...\n'));
    await new Promise(r => setTimeout(r, 3000));

    const code = await sock.requestPairingCode(phone);
    console.log(chalk.green(`\n🔑  YOUR PAIR CODE: `) + chalk.bold.white(code));
    console.log(chalk.gray('   Go to WhatsApp → Linked Devices → Link a Device → Enter code\n'));
  }

  // ── Connection events ────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;

      console.log(chalk.red(`❌  Connection closed (${code}). Reconnect: ${shouldReconnect}`));

      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 5000);
      } else {
        console.log(chalk.red('🚫  Logged out. Delete the session folder and restart.'));
        process.exit(0);
      }
    } else if (connection === 'connecting') {
      console.log(chalk.yellow('🔄  Connecting to WhatsApp...'));
    } else if (connection === 'open') {
      console.log(chalk.green(`\n✅  Connected as ${sock.user?.name || sock.user?.id}`));
      console.log(chalk.cyan(`📌  Prefix: ${process.env.PREFIX || '.'}`));
      console.log(chalk.cyan(`🌍  Mode:   ${process.env.MODE || 'public'}\n`));
      console.log(chalk.gray('  Send a social media URL to any chat to download it.'));
      console.log(chalk.gray(`  Or use commands: ${process.env.PREFIX || '.'}help\n`));
    }
  });

  // ── Save credentials ─────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Message handler ──────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;       // ignore own messages

      try {
        await messageHandler(sock, msg, store);
      } catch (err) {
        console.error(chalk.red('Handler error:'), err.message);
      }
    }
  });

  return sock;
}

connectToWhatsApp().catch(console.error);
