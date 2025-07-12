const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const P = require('pino');

// Auth state file
const { state, saveState } = useSingleFileAuthState('./auth.json');

// Start bot
async function startSock() {
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state
  });

  // Save session automatically
  sock.ev.on('creds.update', saveState);

  // Listen for incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (!messages || !messages[0]) return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    console.log(`📩 Message from ${sender}: ${body}`);

    // Commands
    if (body === '.ping') {
      await sock.sendMessage(sender, { text: '✅ Bot is active!' });
    }

    else if (body === '.menu') {
      const menu = `🤖 *Bot Command Menu*:
      
1. .ping – Check bot status
2. .vv – Send view-once photo
3. .tagall – Mention all users (Group only)
4. .menu – Show this menu`;
      await sock.sendMessage(sender, { text: menu });
    }

    else if (body === '.vv') {
      const imageBuffer = fs.readFileSync('./media/photo.jpg'); // Make sure this exists
      await sock.sendMessage(sender, {
        image: imageBuffer,
        caption: '🖼️ One-time photo',
        viewOnce: true
      });
    }

    else if (body === '.tagall' && msg.key.participant) {
      const groupMetadata = await sock.groupMetadata(sender);
      const participants = groupMetadata.participants.map(p => p.id);
      const mentions = participants.map(id => ({ tag: `@${id.split('@')[0]}`, id }));

      await sock.sendMessage(sender, {
        text: '👥 *Tagging all members!*',
        mentions: participants
      });
    }
  });

  // Handle disconnect
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('📴 Connection closed. Reconnecting...', shouldReconnect);
      if (shouldReconnect) startSock();
    } else if (connection === 'open') {
      console.log('✅ Bot connected!');
    }
  });
}

startSock();
