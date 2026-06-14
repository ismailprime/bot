const { Client, GatewayIntentBits, Partials } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// DATA
let xp = {};
let lastXP = {};
let xpCooldown = {};

// KÜFÜR LİSTESİ
const badWords = [
  "amk","aq","orospu","oç","oc","piç","siktir","sik",
  "fuck","shit","bitch","motherfucker"
];

// LINK CHECK
function isLink(text) {
  return text.includes("http://") ||
         text.includes("https://") ||
         text.includes("discord.gg");
}

// NORMALIZE (bypass engel)
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[\W_]+/g, "")
    .replace(/\s+/g, "");
}

// LEVEL SYSTEM
function getLevel(userXp) {
  let level = 0;
  let required = 1000;

  while (userXp >= required) {
    userXp -= required;
    required += 500;
    level++;
  }
  return level;
}

// ROLE SYSTEM
async function updateRoles(member, level) {
  const roles = {
    1: "Çaylak Üye",
    10: "Aktif Üye",
    20: "Sadık Üye",
    30: "Daimi Üye",
    40: "Special",
    50: "Elit"
  };

  if (roles[level]) {
    const role = member.guild.roles.cache.find(r => r.name === roles[level]);
    if (role) member.roles.add(role).catch(() => {});
  }
}

// 👋 HOŞ GELDİN + OTOMATİK ROL
client.on("guildMemberAdd", async (member) => {
  const role = member.guild.roles.cache.find(r => r.name === "Üye");
  if (role) member.roles.add(role).catch(() => {});

  const channel = member.guild.channels.cache.find(c => c.name === "💬・sohbet");
  if (channel) {
    channel.send(`👋 Hoş geldin ${member}! Sunucuya katıldın 🎉`);
  }
});

// 💬 MESSAGE SYSTEM
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const raw = message.content;
  const clean = normalizeText(raw);

  // 🚫 KÜFÜR
  if (badWords.some(w => clean.includes(w))) {
    await message.delete().catch(() => {});
    message.member.timeout(5 * 60 * 1000, "Küfür");
    return message.channel.send(`${message.author} Küfür yasak! 5 dk mute.`);
  }

  // 🔗 LINK
  if (isLink(raw)) {
    await message.delete().catch(() => {});
    message.member.timeout(60 * 60 * 1000, "Link");
    return message.channel.send(`${message.author} Link yasak! 1 saat mute.`);
  }

  // ⭐ XP SYSTEM
  const now = Date.now();
  if (!xp[userId]) xp[userId] = 0;

  if (!xpCooldown[userId] || now - xpCooldown[userId] > 120000) {
    const gain = Math.floor(Math.random() * 21) + 10;

    xp[userId] += gain;
    xpCooldown[userId] = now;

    const level = getLevel(xp[userId]);
    updateRoles(message.member, level);
  }

  // 🎉 ÇEKİLİŞ
  if (message.content.startsWith("!cekilis")) {
    if (!message.member.permissions.has("Administrator")) return;

    const prize = message.content.split(" ").slice(1).join(" ");
    message.channel.send(`🎉 ÇEKİLİŞ: **${prize}**`);

    setTimeout(async () => {
      const msgs = await message.channel.messages.fetch({ limit: 50 });
      const users = msgs.map(m => m.author).filter(u => !u.bot);

      const winner = users[Math.floor(Math.random() * users.length)];
      message.channel.send(`🏆 Kazanan: ${winner}`);
    }, 10000);
  }

  // 👑 ADMIN XP VER
  if (message.content.startsWith("!xpver")) {
    if (!message.member.permissions.has("Administrator")) return;

    const args = message.content.split(" ");
    const user = message.mentions.members.first();
    const amount = parseInt(args[2]);

    if (!user || isNaN(amount)) {
      return message.reply("Kullanım: !xpver @kişi 500");
    }

    if (!xp[user.id]) xp[user.id] = 0;

    xp[user.id] += amount;

    const level = getLevel(xp[user.id]);
    updateRoles(user, level);

    message.channel.send(`⭐ ${user} +${amount} XP aldı!`);
  }
});

client.login(process.env.TOKEN);
