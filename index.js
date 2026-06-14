const { Client, GatewayIntentBits, Events } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// ================= SETTINGS =================
const TOKEN = process.env.TOKEN;

const MUTE_ROLE = "Muted";
const AUTO_ROLE = "Üye";

const WELCOME_CHANNEL = "💬・sohbet";
const LOG_CHANNEL = "loglar";

// ================= LEVEL ROLES =================
const levelRoles = {
  1: "Çaylak",
  10: "Aktif",
  20: "Sadık",
  40: "Dost",
  50: "Special"
};

// ================= BAD WORDS =================
const badWords = [
  "salak","mal","aptal","gerizekalı","embesil","dangalak",
  "yavşak","pezevenk","şerefsiz","piç","oç","amk","aq","mk",
  "siktir","sik","göt","orospu","kahpe","ibne","yarrak","amcık"
];

// ================= DATA =================
const data = {};
const cooldown = new Map();

// ================= UTIL =================
function hasLink(text) {
  return /(https?:\/\/|www\.|discord\.gg|\.com|\.net)/i.test(text);
}

function getLevel(xp) {
  return Math.min(50, Math.floor(xp / 1000));
}

// ================= BOT READY =================
client.on("ready", () => {
  console.log("Bot aktif:", client.user.tag);
});

// ================= WELCOME =================
client.on("guildMemberAdd", async (member) => {

  const channel = member.guild.channels.cache.find(
    c => c.name === WELCOME_CHANNEL
  );

  const role = member.guild.roles.cache.find(
    r => r.name === AUTO_ROLE
  );

  if (role && member.manageable) {
    member.roles.add(role).catch(() => {});
  }

  if (channel) {
    channel.send(`👋 Hoş geldin ${member}! 🎉`);
  }
});

// ================= MESSAGE =================
client.on("messageCreate", async (msg) => {

  if (msg.author.bot) return;

  const guild = msg.guild;
  const member = msg.member;
  const userId = msg.author.id;

  const muteRole = guild.roles.cache.find(r => r.name === MUTE_ROLE);
  const logChannel = guild.channels.cache.find(c => c.name === LOG_CHANNEL);

  if (!data[userId]) {
    data[userId] = {
      xp: 0,
      level: 0,
      lastXP: 0
    };
  }

  const user = data[userId];
  const now = Date.now();

  async function log(text) {
    if (logChannel) logChannel.send(text);
  }

  async function deleteMsg() {
    if (msg.deletable) await msg.delete().catch(() => {});
  }

  async function mute(time, reason) {
    if (!muteRole || !member.manageable) return;

    await member.roles.add(muteRole).catch(() => {});

    setTimeout(() => {
      member.roles.remove(muteRole).catch(() => {});
    }, time);

    log(`🔇 ${msg.author.tag} → ${reason}`);
  }

  // ================= XP COOLDOWN =================
  if (!cooldown.has(userId)) cooldown.set(userId, 0);

  if (now - cooldown.get(userId) > 60000) {

    const gain = Math.floor(Math.random() * 21) + 10; // 10-30 XP
    user.xp += gain;
    cooldown.set(userId, now);

    let newLevel = Math.floor(user.xp / 1000);

    if (newLevel > 50) newLevel = 50;

    if (newLevel > user.level) {
      user.level = newLevel;

      log(`📈 ${msg.author.tag} level atladı: ${newLevel}`);

      // ROLE SYSTEM
      const roleName = levelRoles[newLevel];
      if (roleName) {
        const role = guild.roles.cache.find(r => r.name === roleName);
        if (role && member.manageable) {
          member.roles.add(role).catch(() => {});
        }
      }
    }
  }

  // ================= LINK =================
  if (hasLink(msg.content)) {
    await deleteMsg();
    await mute(60 * 60 * 1000, "LINK (1 saat)");
    return;
  }

  // ================= KÜFÜR =================
  const content = msg.content.toLowerCase();

  for (let w of badWords) {
    if (content.includes(w)) {
      await deleteMsg();
      await mute(5 * 60 * 1000, "KÜFÜR (5 dk)");
      return;
    }
  }
});

// ================= MESSAGE DELETE LOG =================
client.on("messageDelete", async (msg) => {

  if (!msg.guild) return;

  const logChannel = msg.guild.channels.cache.find(c => c.name === LOG_CHANNEL);

  if (!logChannel) return;

  logChannel.send(
    `🗑️ Mesaj silindi\n👤 ${msg.author?.tag}\n💬 ${msg.content || "Bilinmiyor"}`
  );
});

client.login(TOKEN);
