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

// ---------------- XP SYSTEM ----------------
function getData() {
  if (!fs.existsSync(XP_FILE)) return {};
  return JSON.parse(fs.readFileSync(XP_FILE));
}

function saveData(data) {
  fs.writeFileSync(XP_FILE, JSON.stringify(data, null, 2));
}

// ---------------- FILTERS ----------------
const badWords = ["amk", "orospu", "siktir", "aq"];
const linkRegex = /(https?:\/\/|discord\.gg)/i;

// ---------------- MUTE ----------------
async function mute(member, ms) {
  if (!member) return;
  await member.timeout(ms).catch(() => {});
}

// ---------------- EVENTS ----------------

// JOIN
client.on("guildMemberAdd", (member) => {
  member.roles.add(config.memberRole).catch(() => {});

  const channel = member.guild.channels.cache.get(config.welcomeChannel);
  if (channel) {
    channel.send(`👋 Hoşgeldin ${member.user}`);
  }
});

// MESSAGE
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  const data = getData();
  const id = message.author.id;

  if (!data[id]) {
    data[id] = { xp: 0, level: 0, lastXp: 0 };
  }

  const user = data[id];
  const now = Date.now();

  // küfür
  if (badWords.some(w => message.content.toLowerCase().includes(w))) {
    message.delete().catch(() => {});
    mute(message.member, 5 * 60 * 1000);

    return message.channel.send(`⚠️ ${message.author} 5 dk mute`);
  }

  // link
  if (linkRegex.test(message.content)) {
    message.delete().catch(() => {});
    mute(message.member, 60 * 60 * 1000);

    return message.channel.send(`🔗 ${message.author} 1 saat mute`);
  }

  // XP cooldown
  if (now - user.lastXp < 60000) return;

  const gain = Math.floor(Math.random() * 21) + 10;
  user.xp += gain;
  user.lastXp = now;

  let needed = 1000 + user.level * 500;

  if (user.level < 50 && user.xp >= needed) {
    user.level++;
    user.xp = 0;

    const roleId = config.roles[user.level];
    if (roleId) {
      message.member.roles.add(roleId).catch(() => {});
    }
  }

  saveData(data);
});

// MESSAGE DELETE LOG
client.on("messageDelete", (message) => {
  const log = message.guild.channels.cache.get(config.logChannel);
  if (!log) return;

  log.send(
    `🗑️ Mesaj silindi
👤 ${message.author?.tag}
💬 ${message.content || "yok"}`
  );
});

// LOGIN (TOKEN YOK — RAILWAY ENV)
client.login(process.env.TOKEN);
