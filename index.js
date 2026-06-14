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

// ================= KÜFÜR =================

const badWords = [
  "salak",
  "mal",
  "aptal",
  "gerizekalı",
  "embesil",
  "dangalak",
  "yavşak",
  "pezevenk",
  "şerefsiz",
  "piç",
  "pic",
  "oç",
  "oc",
  "amk",
  "aq",
  "amq",
  "siktir",
  "sikik",
  "sikim",
  "sikeyim",
  "göt",
  "götveren",
  "kahpe",
  "orospu",
  "oruspu",
  "ibne",
  "lavuk",
  "gerizeka",
  "mk",
  "sg"
];

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/\$/g, "s")
    .replace(/@/g, "a")
    .replace(/\*/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, "");
}

// ================= LEVEL ROLLERİ =================

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

// ================= READY =================

client.on("ready", () => {
  console.log(`Bot hazır: ${client.user.tag}`);
});

// ================= MESSAGE =================

client.on("messageCreate", async (msg) => {

  if (msg.author.bot) return;

  const user = getUser(msg.author.id);

  const content = normalize(msg.content);

  const now = Date.now();

  // ================= XP =================

  user.xp += 10;
  user.coins += 5;

  const lvl = level(user.xp);

  // 🎉 LEVEL ATLAMA

  if (user.xp % 100 === 0) {

    msg.channel.send(
      `🎉 ${msg.author} level atladı! Level: **${lvl}**`
    );

    const roleName = levelRoles[lvl];

    if (roleName) {

      const role =
        msg.guild.roles.cache.find(
          r => r.name === roleName
        );

      if (role) {

        msg.member.roles.add(role)
          .catch(() => {});
      }
    }
  }

  // ================= KÜFÜR =================

  if (badWords.some(w => content.includes(w))) {

    user.warns += 1;

    await msg.delete().catch(() => {});

    msg.channel.send(
      `⚠️ ${msg.author} küfür yasak! (${user.warns}/3)`
    );

    // 🚫 3 WARN = 1 SAAT MUTE

    if (user.warns >= 3) {

      const muteRole =
        msg.guild.roles.cache.find(
          r => r.name === "Muted"
        );

      if (muteRole) {

        msg.member.roles.add(muteRole)
          .catch(() => {});

        msg.channel.send(
          `🚫 ${msg.author} 1 saat mute yedi!`
        );

        setTimeout(() => {

          msg.member.roles.remove(muteRole)
            .catch(() => {});

        }, 3600000);
      }

      user.warns = 0;
    }

    save();
    return;
  }

  // ================= SPAM =================

  if (now - user.lastMsg < 2000) {

    user.spam += 1;

    if (user.spam >= 4) {

      const muteRole =
        msg.guild.roles.cache.find(
          r => r.name === "Muted"
        );

      if (muteRole) {

        msg.member.roles.add(muteRole)
          .catch(() => {});

        msg.channel.send(
          `🚫 ${msg.author} spam nedeniyle 10 dakika mute yedi!`
        );

        setTimeout(() => {

          msg.member.roles.remove(muteRole)
            .catch(() => {});

        }, 600000);
      }

      user.spam = 0;
    }

  } else {

    user.spam = 0;
  }

  user.lastMsg = now;

  // ================= !rank =================

  if (content === "!rank") {

    return msg.reply(
      `📊 Level: ${lvl} | XP: ${user.xp} | 💰 Coin: ${user.coins}`
    );
  }

  // ================= !top =================

  if (content === "!top") {

    const top = Object.entries(data)
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, 10);

    let text = "🏆 TOP XP\n\n";

    top.forEach((u, i) => {

      text +=
        `#${i + 1} <@${u[0]}> - XP: ${u[1].xp}\n`;

    });

    msg.channel.send(text);
  }

  // ================= !daily =================

  if (content === "!daily") {

    if (now - user.daily < 86400000) {

      return msg.reply(
        "⏳ Günlük ödülünü almak için beklemelisin!"
      );
    }

    user.coins += 500;

    user.daily = now;

    msg.reply(
      "🎁 500 coin kazandın!"
    );
  }

  // ================= !coinflip =================

  if (content === "!coinflip") {

    const result =
      Math.random() < 0.5
        ? "TURA"
        : "YAZI";

    msg.reply(
      `🪙 Sonuç: ${result}`
    );
  }

  // ================= !sestop =================

  if (content === "!sestop") {

    const count =
      msg.guild.members.cache.filter(
        m => m.voice.channel
      ).size;

    msg.channel.send(
      `🔊 Seste bulunan kişi sayısı: ${count}`
    );
  }

  // ================= !shop =================

  if (content === "!shop") {

    msg.channel.send(
      "🛒 SHOP\n\n" +
      Object.entries(shop)
        .map(
          ([k, v]) =>
            `• ${k} → ${v.price} coin`
        )
        .join("\n")
    );
  }

  // ================= !buy =================

  if (content.startsWith("!buy")) {

    const item =
      content.split(" ")[1];

    const product =
      shop[item];

    if (!product)
      return msg.reply(
        "❌ item bulunamadı!"
      );

    if (user.coins < product.price)
      return msg.reply(
        "❌ yeterli coin yok!"
      );

    const role =
      msg.guild.roles.cache.find(
        r => r.name === product.role
      );

    if (!role)
      return msg.reply(
        "❌ rol bulunamadı!"
      );

    user.coins -= product.price;

    msg.member.roles.add(role)
      .catch(() => {});

    msg.reply(
      `✅ ${product.role} rolünü satın aldın!`
    );
  }

  // ================= ADMIN XP =================

  if (content.startsWith("!addxp")) {

    // 1003708560728920165

    if (msg.author.id !== "BURAYA_ID")
      return;

    const args =
      msg.content.split(" ");

    const target =
      msg.mentions.users.first();

    const amount =
      parseInt(args[2]);

    if (!target || isNaN(amount)) {

      return msg.reply(
        "!addxp @user 100"
      );
    }

    const targetUser =
      getUser(target.id);

    targetUser.xp += amount;

    msg.channel.send(
      `💎 ${target} kullanıcısına ${amount} XP verildi!`
    );
  }

  save();
});

client.login(process.env.TOKEN);
