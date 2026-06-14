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

// ---------------- DAHA GÜÇLÜ KÜFÜR FİLTRESİ ----------------
const badWords = [
  "amk","aq","a.q","a m k",
  "orospu","oç","oc",
  "siktir","sik","sikeyim",
  "yarrak","yarak",
  "piç","pic",
  "kahpe",
  "fuck","shit","bitch"
];

function containsBadWord(text) {
  const clean = text
    .toLowerCase()
    .replace(/[\s\.\-\_]/g, "");

  return badWords.some(word =>
    clean.includes(word.replace(/[\s\.\-\_]/g, ""))
  );
}

// ---------------- LINK ----------------
const linkRegex = /(https?:\/\/|discord\.gg)/i;

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
    data[id] = { xp: 0, level: 0, lastXp: 0 };
  }

  const user = data[id];
  const now = Date.now();

  // ---------------- KÜFÜR ----------------
  if (containsBadWord(message.content)) {
    message.delete().catch(() => {}); // MESAJ SİL

    mute(message.member, 5 * 60 * 1000); // 5 dk mute

    return message.channel.send(`⚠️ ${message.author} küfür ettiği için 5 dk mute yedi`);
  }

  // ---------------- LINK ----------------
  if (linkRegex.test(message.content)) {
    message.delete().catch(() => {});
    mute(message.member, 60 * 60 * 1000);

    return message.channel.send(`🔗 ${message.author} link attığı için 1 saat mute`);
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

    let text = "🏆 TOP 10 LEADERBOARD\n\n";

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
    `🗑️ Mesaj silindi\n👤 ${message.author?.tag}\n💬 ${message.content || "yok"}`
  );
});

// ---------------- LOGIN ----------------
client.login(process.env.TOKEN);
