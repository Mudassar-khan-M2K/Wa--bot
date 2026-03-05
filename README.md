# 📱 WhatsApp Downloader Bot

A clean, modular WhatsApp bot powered by **Baileys** with **Pair Code** authentication.  
Send any social media URL and it auto-downloads + sends the media back to the chat.

Inspired by the architecture of **WASI-MD-V7**.

---

## ✨ Features

- 🔑 **Pair Code auth** — no QR scanning, just enter a 8-digit code in WhatsApp
- 📥 **Auto URL detection** — just paste a link, no command needed
- 🎬 **Multi-platform** — YouTube, TikTok, Instagram, Twitter/X, Facebook, Reddit, Pinterest
- 🔌 **Plugin system** — drop a `.js` file in `/plugins` to add commands
- 🧹 **Auto cleanup** — temp files deleted after sending
- 📦 **No database needed** — lightweight in-memory session

---

## 📋 Requirements

| Tool       | Version    | Install                                      |
|------------|-----------|----------------------------------------------|
| Node.js    | ≥ 20      | https://nodejs.org                           |
| yt-dlp     | latest    | `pip install yt-dlp` or `brew install yt-dlp` |
| ffmpeg     | any       | `sudo apt install ffmpeg` / `brew install ffmpeg` |

---

## 🚀 Setup

### 1. Clone & install

```bash
git clone <your-repo>
cd whatsapp-downloader-bot
npm install
```

### 2. Configure

```bash
cp .env.example .env
nano .env
```

Set at minimum:
```env
PHONE_NUMBER=923001234567   # your WhatsApp number
OWNER_NUMBER=923001234567
```

### 3. Start

```bash
npm start
```

On first run, the bot will print an **8-digit pair code** in the terminal.

```
🔑  YOUR PAIR CODE: ABC1-DEF2
   Go to WhatsApp → Linked Devices → Link a Device → Enter code
```

Once you enter it in WhatsApp, the bot connects and saves the session.  
Future restarts won't need a code.

---

## 💬 Usage

### Auto-download (no command needed)
Just send a social media link in any chat:
```
https://www.tiktok.com/@user/video/123456
https://www.instagram.com/reel/Abc123/
https://youtu.be/dQw4w9WgXcQ
```
The bot detects the URL, downloads the media, and sends it back.

### Commands
| Command        | Description                    |
|----------------|-------------------------------|
| `.help`        | Show all commands              |
| `.dl <url>`    | Download a specific URL        |
| `.ping`        | Check bot latency              |
| `.info`        | Show bot information           |
| `.uptime`      | Show uptime (owner only)       |

---

## 🔌 Adding Plugins

Create a file in `/plugins/`:

```js
// plugins/hello.js
export default {
  name: 'hello',          // command name (without prefix)
  description: 'Say hi',
  ownerOnly: false,

  async run({ sock, msg, args }) {
    await msg.reply('👋 Hello, ' + msg.pushName + '!');
  },
};
```

Restart the bot and `.hello` works immediately.

---

## 🌍 Supported Platforms

| Platform     | Videos | Images | Audio |
|-------------|--------|--------|-------|
| YouTube     | ✅      | —      | ✅    |
| YouTube Shorts | ✅   | —      | ✅    |
| TikTok      | ✅      | ✅      | ✅    |
| Instagram   | ✅      | ✅      | —     |
| Twitter / X | ✅      | ✅      | —     |
| Facebook    | ✅      | —      | —     |
| Reddit      | ✅      | ✅      | —     |
| Pinterest   | —      | ✅      | —     |

> yt-dlp supports 1000+ sites — any URL it recognizes will work.

---

## 📁 Project Structure

```
.
├── index.js              # Entry point — WhatsApp connection
├── .env                  # Your config (gitignored)
├── .env.example          # Config template
├── lib/
│   ├── handler.js        # Message router
│   ├── serialize.js      # Message normalizer
│   ├── downloader.js     # yt-dlp wrapper
│   └── loader.js         # Plugin auto-loader
├── plugins/
│   ├── help.js           # Help menu
│   ├── download.js       # .dl command
│   └── utility.js        # ping, info, uptime
├── session/              # Auth session (auto-created)
└── tmp/                  # Temp download files (auto-cleaned)
```

---

## ⚠️ Disclaimer

This bot is for **personal & educational use only**.  
- Do not use it to download copyright-protected content without permission.  
- Using unofficial WhatsApp clients may violate WhatsApp's Terms of Service.  
- Use responsibly.

---

## 🙏 Credits

- [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [WASI-MD-V7](https://github.com/Itxxwasi/WASI-MD-V7) — architecture inspiration
