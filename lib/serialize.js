// lib/serialize.js  ─  Normalize Baileys messages into clean objects

import { getContentType, jidDecode, proto } from '@whiskeysockets/baileys';

/**
 * Returns the plain text body of any message type.
 */
export function getBody(msg) {
  const type = getContentType(msg.message);
  const m = msg.message;

  if (!type) return '';

  if (type === 'conversation') return m.conversation;
  if (type === 'extendedTextMessage') return m.extendedTextMessage?.text || '';
  if (type === 'imageMessage') return m.imageMessage?.caption || '';
  if (type === 'videoMessage') return m.videoMessage?.caption || '';
  if (type === 'documentMessage') return m.documentMessage?.caption || '';
  if (type === 'buttonsResponseMessage') return m.buttonsResponseMessage?.selectedButtonId || '';
  if (type === 'listResponseMessage') return m.listResponseMessage?.singleSelectReply?.selectedRowId || '';
  if (type === 'templateButtonReplyMessage') return m.templateButtonReplyMessage?.selectedId || '';

  return '';
}

/**
 * Enriches the raw Baileys message object with convenient helpers.
 */
export function serialize(msg, sock) {
  const type = getContentType(msg.message) || 'unknown';
  const body = getBody(msg);
  const from = msg.key.remoteJid;
  const isGroup = from?.endsWith('@g.us') ?? false;
  const sender = isGroup
    ? msg.key.participant || msg.participant
    : from;

  const pushName = msg.pushName || '';
  const isOwner = (process.env.OWNER_NUMBER || '') === (sender?.replace(/[^0-9]/g, '') || '');

  // Quoted message helper
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    ? {
        type: getContentType(msg.message.extendedTextMessage.contextInfo.quotedMessage),
        message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
        sender: msg.message.extendedTextMessage.contextInfo.participant,
        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
      }
    : null;

  return {
    ...msg,
    type,
    body,
    from,
    sender,
    isGroup,
    pushName,
    isOwner,
    quoted,

    // Reply helper
    reply: (text, options = {}) =>
      sock.sendMessage(from, { text, ...options }, { quoted: msg }),

    // React helper
    react: (emoji) =>
      sock.sendMessage(from, {
        react: { text: emoji, key: msg.key },
      }),
  };
}
