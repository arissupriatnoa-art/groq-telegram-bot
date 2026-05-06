const TelegramBot = require('node-telegram-bot-api');
const Groq = require('groq-sdk');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const sessions = new Map();

const KATEGORI = {
  bisnis: 'Buat 3 prompt bisnis dan marketing yang sedang viral dan trending',
  konten: 'Buat 3 prompt untuk membuat konten media sosial yang viral',
  coding: 'Buat 3 prompt untuk membantu programmer lebih produktif',
  ai: 'Buat 3 prompt unik dan kreatif untuk eksplorasi AI',
};

async function tanyaAI(messages) {
  const res = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [
      { role: 'system', content: 'Kamu asisten AI yang ramah dan menjawab dalam Bahasa Indonesia.' },
      ...messages
    ],
    max_tokens: 1024,
  });
  return res.choices[0].message.content;
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `👋 Halo *${msg.from.first_name}*!\n\nAku bot AI gratis pakai Groq 🚀\n\n*Perintah:*\n/chat [pesan] — Tanya apa saja\n/prompt [topik] — Buat prompt trending\n/bisnis — Prompt bisnis\n/konten — Prompt konten\n/coding — Prompt coding\n/ai — Prompt AI kreatif\n/clear — Reset chat`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/chat (.+)/, async (msg, match) => {
  const userId = msg.from.id;
  const teks = match[1];
  if (!sessions.has(userId)) sessions.set(userId, []);
  const history = sessions.get(userId);
  history.push({ role: 'user', content: teks });
  try {
    await bot.sendChatAction(msg.chat.id, 'typing');
    const jawaban = await tanyaAI(history);
    history.push({ role: 'assistant', content: jawaban });
    if (history.length > 20) history.splice(0, 2);
    bot.sendMessage(msg.chat.id, jawaban, { parse_mode: 'Markdown' });
  } catch (e) {
    bot.sendMessage(msg.chat.id, '❌ Error: ' + e.message);
  }
});

bot.onText(/\/prompt (.+)/, async (msg, match) => {
  const topik = match[1];
  await bot.sendMessage(msg.chat.id, `⏳ Membuat prompt *${topik}*...`, { parse_mode: 'Markdown' });
  try {
    const jawaban = await tanyaAI([{
      role: 'user',
      content: `Buat 3 trending prompt bertema "${topik}". Format:\n\n🔥 PROMPT #1: [Judul]\n[Isi prompt]\n\n🔥 PROMPT #2: [Judul]\n[Isi prompt]\n\n🔥 PROMPT #3: [Judul]\n[Isi prompt]`
    }]);
    bot.sendMessage(msg.chat.id, jawaban, { parse_mode: 'Markdown' });
  } catch (e) {
    bot.sendMessage(msg.chat.id, '❌ Error: ' + e.message);
  }
});

['bisnis', 'konten', 'coding', 'ai'].forEach(kat => {
  bot.onText(new RegExp(`\\/${kat}`), async (msg) => {
    await bot.sendMessage(msg.chat.id, `⏳ Membuat prompt *${kat}*...`, { parse_mode: 'Markdown' });
    try {
      const jawaban = await tanyaAI([{ role: 'user', content: KATEGORI[kat] }]);
      bot.sendMessage(msg.chat.id, jawaban, { parse_mode: 'Markdown' });
    } catch (e) {
      bot.sendMessage(msg.chat.id, '❌ Error: ' + e.message);
    }
  });
});

bot.onText(/\/clear/, (msg) => {
  sessions.delete(msg.from.id);
  bot.sendMessage(msg.chat.id, '✅ Chat direset!');
});

console.log('🤖 Bot aktif!');
