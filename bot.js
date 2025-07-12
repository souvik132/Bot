const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  makeInMemoryStore
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const { state, saveState } = useSingleFileAuthState('./auth.json');
  default: makeWASocket,
  useSingleFileAuthState,
  downloadContentFromMessage
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const os = require('os');

const { state, saveState } = useSingleFileAuthState('./auth.json');
let savedVVBuffer = null;

async function startBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const m = msg.message;
    const text =
      m?.conversation || m?.extendedTextMessage?.text || '';
    const input = text.trim().toLowerCase();

    // View Once image capture
    if (m?.imageMessage?.viewOnce) {
      try {
        const stream = await downloadContentFromMessage(m.imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        savedVVBuffer = buffer;
        console.log('✅ View Once ফটো সেভ হয়েছে!');
      } catch (err) {
        console.log('❌ VV সেভ সমস্যা:', err);
      }
    }

    // .vv command to send saved photo
    if (input === '.vv') {
      if (savedVVBuffer) {
        await sock.sendMessage(from, {
          image: savedVVBuffer,
          caption: '🖼️ View Once ফটো বারবার দেখা যাবে!'
        });
      } else {
        await sock.sendMessage(from, {
          text: '❗ এখনও কোনো View Once ফটো সেভ হয়নি!'
        });
      }
    }

    // .menu command
    if (input === '.menu') {
      const helpText = `
📜 *Available Commands:*
-------------------------
✅ .ping - Server status
✅ .menu - Show all commands
✅ .vv - View-once ফটো দেখতে
✅ hi - Greet the bot
✅ music [name] - Download YouTube audio
✅ joke / quote / time / date
-------------------------
Type any above 👆
      `;
      await sock.sendMessage(from, { text: helpText });
    }

    // .ping command
    if (input === '.ping') {
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      const totalMem = os.totalmem() / 1024 / 1024;
      const freemem = os.freemem() / 1024 / 1024;
      const cpu = os.cpus()[0].model;
      const platform = os.platform();
      const uptime = os.uptime();

      const pingText = `
🏓 *PONG! Server Info:*
-------------------------
🧠 CPU: ${cpu}
🖥️ Platform: ${platform}
📊 RAM Used: ${used.toFixed(2)} MB
💾 Free RAM: ${freemem.toFixed(2)} MB
📈 Uptime: ${Math.floor(uptime / 60)} mins
📂 Total RAM: ${totalMem.toFixed(2)} MB
⏱️ Time: ${new Date().toLocaleTimeString()}
      `;
      await sock.sendMessage(from, { text: pingText });
    }

    // hi
    if (input === 'hi') {
      await sock.sendMessage(from, { text: '👋 Hello! Type `.menu` to see all commands.' });
    }
  });
}

startBot();
