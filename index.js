const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ================= OWNER =================
const OWNER_ID = "1003708560728920165";

// ================= DATA =================

const file = "./data.json";

let data = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file))
  : {};

function save() {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getUser(id) {
  if (!data[id]) {
    data[id] = {
      xp: 0,
      coins: 0,
      warns: 0,
      spam: 0,
      lastMsg: 0,
      daily: 0
    };
  }
  return data[id];
}

function level(xp) {
  return Math.floor(xp / 100);
}

// ================= MODERATION =================

const badWords = [
  "salak","mal","aptal","gerizekalı","oç","amk","aq",
  "siktir","göt","orospu","piç","kahpe","ibne"
];

function hasLink(text) {
  return /(https?:\/\/|www\.|discord\.gg)/i.test(text);
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/\$/g, "s")
    .replace(/\s+/g, "");
}

// ================= LEVEL ROLLER =================

const levelRoles = {
  15: "Çaylak",
  30: "Gelişmiş",
  45: "Usta",
  60: "Sadık",
  75: "Profesyonel",
  90: "Elit"
};

// ================= SHOP =================

const shop = {
  prime: {
    price: 50000,
    role: "PRIME"
  }
};

// ================= BOT =================

client.on("ready", () => {
  console.log("Bot hazır:", client.user.tag);
});

client.on("messageCreate", async (msg) => {

  if (msg.author.bot) return;

  const user = getUser(msg.author.id);
  const content = normalize(msg.content);
  const now = Date.now();

  const muteRole = msg.guild.roles.cache.find(
    r => r.name === "Muted"
  );

  // ================= LINK =================
  if (hasLink(msg.content)) {

    await msg.delete().catch(() => {});

    if (muteRole) {
      msg.member.roles.add(muteRole).catch(() => {});

      msg.channel.send(
        `🚫 ${msg.author} link attı! (1 saat mute)`
      );

      setTimeout(() => {
        msg.member.roles.remove(muteRole).catch(() => {});
      }, 3600000);
    }

    return;
  }

  // ================= KÜFÜR =================
  if (badWords.some(w => content.includes(w))) {

    await msg.delete().catch(() => {});

    msg.channel.send(
      `⚠️ ${msg.author} küfür etti! (5 dk mute)`
    );

    if (muteRole) {
      msg.member.roles.add(muteRole).catch(() => {});

      setTimeout(() => {
        msg.member.roles.remove(muteRole).catch(() => {});
      }, 300000);
    }

    save();
    return;
  }

  // ================= XP =================
  user.xp += 10;
  user.coins += 5;

  const lvl = level(user.xp);

  if (user.xp % 100 === 0) {

    msg.channel.send(
      `🎉 ${msg.author} level atladı! Level: ${lvl}`
    );

    const roleName = levelRoles[lvl];

    if (roleName) {
      const role = msg.guild.roles.cache.find(
        r => r.name === roleName
      );

      if (role) {
        msg.member.roles.add(role).catch(() => {});
      }
    }
  }

  user.lastMsg = now;

  // ================= !rank =================
  if (msg.content === "!rank") {
    return msg.reply(
      `📊 Level: ${lvl} | XP: ${user.xp} | 💰 Coin: ${user.coins}`
    );
  }

  // ================= !daily =================
  if (msg.content === "!daily") {

    if (now - user.daily < 86400000) {
      return msg.reply("⏳ 24 saat bekle!");
    }

    user.coins += 500;
    user.daily = now;

    msg.reply("🎁 500 coin aldın!");
  }

  // ================= !shop =================
  if (msg.content === "!shop") {
    msg.channel.send(
      "🛒 SHOP:\n" +
      Object.entries(shop)
        .map(([k,v]) => `${k} → ${v.price}`)
        .join("\n")
    );
  }

  // ================= !buy =================
  if (msg.content.startsWith("!buy")) {

    const item = msg.content.split(" ")[1];
    const product = shop[item];

    if (!product) return msg.reply("Yok!");
    if (user.coins < product.price)
      return msg.reply("Yetersiz coin!");

    const role = msg.guild.roles.cache.find(
      r => r.name === product.role
    );

    if (!role) return msg.reply("Rol yok!");

    user.coins -= product.price;

    msg.member.roles.add(role).catch(() => {});

    msg.reply("Satın alındı!");
  }

  // ================= !addxp (SADECE SEN) =================
  if (msg.content.startsWith("!addxp")) {

    if (msg.author.id !== OWNER_ID) return;

    const args = msg.content.split(" ");
    const target = msg.mentions.users.first();
    const amount = parseInt(args[2]);

    if (!target || isNaN(amount))
      return msg.reply("!addxp @user 100");

    const u = getUser(target.id);
    u.xp += amount;

    msg.channel.send(
      `💎 ${target} +${amount} XP aldı!`
    );

    save();
  }

  save();
});

client.login(process.env.TOKEN);
