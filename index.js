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

// VERİ TABANI (basit RAM - Railway restartta sıfırlanır, istersen sonra Mongo yaparız)
let xp = {};
let lastXP = {};
let muted = {};

// KÜFÜR LİSTESİ (istersen büyütürüz)
const badWords = [
  "amk", "aq", "orospu", "siktir", "piç", "fuck", "shit"
];

// LINK CHECK
function isLink(msg) {
  return msg.includes("http://") || msg.includes("https://") || msg.includes("discord.gg");
}

// LEVEL HESAP
function getLevel(userXp) {
  let level = 0;
  let required = 1000;

  while (userXp >= required) {
    level++;
    userXp -= required;
    required += 500;
  }

  return level;
}

// ROL VERME
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
    if (role) member.roles.add(role);
  }
}

// MESSAGE EVENT
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const content = message.content.toLowerCase();

  // KÜFÜR ENGEL
  if (badWords.some(w => content.includes(w))) {
    await message.delete();

    const member = message.member;
    member.timeout(5 * 60 * 1000, "Küfür");

    return message.channel.send(`${message.author} Küfür yasak! 5 dk mute yedin.`);
  }

  // LINK ENGEL
  if (isLink(content)) {
    await message.delete();

    const member = message.member;
    member.timeout(60 * 60 * 1000, "Link");

    return message.channel.send(`${message.author} Link yasak! 1 saat mute yedin.`);
  }

  // XP COOLDOWN (2 dk)
  const now = Date.now();
  if (!lastXP[userId] || now - lastXP[userId] > 120000) {
    const gain = Math.floor(Math.random() * 21) + 10;

    if (!xp[userId]) xp[userId] = 0;
    xp[userId] += gain;
    lastXP[userId] = now;

    const level = getLevel(xp[userId]);

    updateRoles(message.member, level);
  }

  // !cekilis
  if (message.content.startsWith("!cekilis")) {
    if (!message.member.permissions.has("Administrator")) return;

    const args = message.content.split(" ");
    const duration = 10000; // test için 10 sn (istersen 7 gün yaparız)
    const prize = args.slice(1).join(" ");

    message.channel.send(`🎉 ÇEKİLİŞ BAŞLADI: **${prize}**`);

    setTimeout(async () => {
      const msgs = await message.channel.messages.fetch({ limit: 50 });
      const users = msgs.map(m => m.author).filter(u => !u.bot);

      const winner = users[Math.floor(Math.random() * users.length)];

      message.channel.send(`🏆 Kazanan: ${winner}`);
    }, duration);
  }
});

client.login(process.env.TOKEN);
