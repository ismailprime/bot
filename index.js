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

// ---------------- AKILLI FİLTRE ----------------
const badWords = [
  "amk","aq","a.q","a m k","amq",
  "orospu","oç","oc",
  "siktir","sik","sikeyim",
  "yarrak","yarak",
  "piç","pic",
  "kahpe",
  "ibne",
  "fuck","shit","bitch","asshole","dick"
];

// daha güçlü yakalama
function containsBadWord(text) {
  const clean = text
    .toLowerCase()
    .replace(/[\s\.\-\_]/g, "")
    .replace(/[^a-zğüşöçı0-9]/gi, "");

  return badWords.some(w =>
    clean.includes(w.replace(/[\s\.\-\_]/g, ""))
  );
}

// ---------------- SPAM SYSTEM ----------------
const spamMap = new Map();

function isSpam(userId) {
  const now = Date.now();
  const data = spamMap.get(userId) || [];

  const filtered = data.filter(t => now - t < 5000);
  filtered.push(now);

  spamMap.set(userId, filtered);

  return filtered.length >= 6; // 5 saniyede 6 mesaj = spam
}

// ---------------- MUTE ----------------
async function mute(member, ms) {
  if (!member) return;
  await member.timeout(ms).catch(() => {});
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
    data[id] = { xp: 0, level: 0, lastXp: 0, warns: 0 };
  }

  const user = data[id];
  const now = Date.now();

  // ---------------- SPAM ----------------
  if (isSpam(id)) {
    message.delete().catch(() => {});
    mute(message.member, 10 * 60 * 1000);
    return message.channel.send(`⚠️ ${message.author} spam yaptığı için 10 dk mute`);
  }

  // ---------------- KÜFÜR ----------------
  if (containsBadWord(message.content)) {
    message.delete().catch(() => {});
    user.warns++;

    if (user.warns >= 3) {
      mute(message.member, 60 * 60 * 1000);
      user.warns = 0;
      return message.channel.send(`⛔ ${message.author} 3 uyarı → 1 saat mute`);
    }

    mute(message.member, 5 * 60 * 1000);
    return message.channel.send(`⚠️ ${message.author} küfür → 5 dk mute`);
  }

  // ---------------- LINK ----------------
  if (/(https?:\/\/|discord\.gg)/i.test(message.content)) {
    message.delete().catch(() => {});
    mute(message.member, 60 * 60 * 1000);
    return message.channel.send(`🔗 ${message.author} link → 1 saat mute`);
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

    const roleId = config.roles[user.level];
    if (roleId) message.member.roles.add(roleId).catch(() => {});
  }

  saveData(data);

  // ---------------- KOMUTLAR ----------------
  if (message.content === "!rank") {
    return message.reply(`📊 Level: ${user.level}\n⭐ XP: ${user.xp}`);
  }

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

// ---------------- LOG ----------------
client.on("messageDelete", (message) => {
  const log = message.guild.channels.cache.get(config.logChannel);
  if (!log) return;

  log.send(
    `🗑️ Mesaj silindi
👤 ${message.author?.tag}
💬 ${message.content || "yok"}`
  );
});

// ---------------- LOGIN ----------------
client.login(process.env.TOKEN);
