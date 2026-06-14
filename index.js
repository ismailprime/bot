const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const fs = require("fs");
const config = require("./config");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel]
});

const XP_FILE = "./xp.json";

// ---------------- DATA ----------------
function getData() {
  if (!fs.existsSync(XP_FILE)) return {};
  return JSON.parse(fs.readFileSync(XP_FILE));
}

function saveData(data) {
  fs.writeFileSync(XP_FILE, JSON.stringify(data, null, 2));
}

// ---------------- SAFE DELETE (FIX) ----------------
async function safeDelete(message) {
  try {
    if (!message.deletable) return;
    await message.delete();
  } catch (err) {
    console.log("Silme hatası:", err.message);
  }
}

// ---------------- FILTER ----------------
const badWords = [
  "amk","aq","orospu","siktir","piç","yarrak",
  "fuck","shit","bitch"
];

function containsBadWord(text) {
  const clean = text.toLowerCase().replace(/[\s\.\-\_]/g, "");
  return badWords.some(w => clean.includes(w));
}

const linkRegex = /(https?:\/\/|discord\.gg)/i;

// ---------------- MUTE ----------------
async function mute(member, ms) {
  if (!member) return;
  try {
    await member.timeout(ms);
  } catch (err) {
    console.log("Mute hatası:", err.message);
  }
}

// ---------------- JOIN ----------------
client.on("guildMemberAdd", (member) => {
  member.roles.add(config.memberRole).catch(() => {});

  const channel = member.guild.channels.cache.get(config.welcomeChannel);
  if (channel) channel.send(`👋 Hoşgeldin ${member.user}`);
});

// ---------------- MESSAGE ----------------
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  const data = getData();
  const id = message.author.id;

  if (!data[id]) {
    data[id] = { xp: 0, level: 0, lastXp: 0 };
  }

  const user = data[id];
  const now = Date.now();

  // ---------------- KÜFÜR ----------------
  if (containsBadWord(message.content)) {
    safeDelete(message);
    mute(message.member, 5 * 60 * 1000);
    return message.channel.send(`⚠️ ${message.author} 5 dk mute`);
  }

  // ---------------- LINK ----------------
  if (linkRegex.test(message.content)) {
    safeDelete(message);
    mute(message.member, 60 * 60 * 1000);
    return message.channel.send(`🔗 ${message.author} 1 saat mute`);
  }

  // ---------------- XP ----------------
  if (now - user.lastXp < 60000) return;

  const gain = Math.floor(Math.random() * 21) + 10;
  user.xp += gain;
  user.lastXp = now;

  let needed = 1000 + user.level * 500;

  if (user.level < 50 && user.xp >= needed) {
    user.level++;
    user.xp = 0;
  }

  saveData(data);

  // ---------------- RANK ----------------
  if (message.content === "!rank") {
    return message.reply(`📊 Level: ${user.level}\n⭐ XP: ${user.xp}`);
  }

  // ---------------- TOPRANK ----------------
  if (message.content === "!toprank") {
    const sorted = Object.entries(data)
      .sort((a, b) => b[1].level - a[1].level || b[1].xp - a[1].xp)
      .slice(0, 10);

    let text = "🏆 TOP 10\n\n";

    sorted.forEach((u, i) => {
      text += `#${i + 1} <@${u[0]}> — Level ${u[1].level} | XP ${u[1].xp}\n`;
    });

    return message.channel.send(text);
  }
});

// ---------------- DELETE LOG ----------------
client.on("messageDelete", (message) => {
  const log = message.guild.channels.cache.get(config.logChannel);
  if (!log) return;

  log.send(
    `🗑️ Mesaj silindi\n👤 ${message.author?.tag}\n💬 ${message.content || "yok"}`
  );
});

// ---------------- LOGIN ----------------
client.login(process.env.TOKEN);
