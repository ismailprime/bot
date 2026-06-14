const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= SETTINGS =================
const MUTE_ROLE = "Muted";
const AUTO_ROLE = "Üye";

const WELCOME_CHANNEL = "💬・sohbet";
const LOG_CHANNEL = "loglar";

// ================= BAD WORDS =================
const badWords = [
  "salak","mal","aptal","gerizekalı","embesil","dangalak",
  "yavşak","pezevenk","şerefsiz","piç","oç","amk","aq","mk",
  "siktir","sik","göt","orospu","kahpe","ibne","yarrak","amcık"
];

// ================= SIMPLE NORMALIZE (NO REPLACE HEAVY) =================
function normalize(text) {
  return text.toLowerCase();
}

// ================= LINK CHECK =================
function hasLink(text) {
  return /(https?:\/\/|www\.|discord\.gg|\.com|\.net)/i.test(text);
}

// ================= SPAM =================
const cooldown = new Map();

// ================= BOT =================
client.on("ready", () => {
  console.log("🛡️ Bot aktif:", client.user.tag);
});

// ================= MESSAGE =================
client.on("messageCreate", async (msg) => {

  if (msg.author.bot) return;

  const guild = msg.guild;
  const member = msg.member;

  const clean = normalize(msg.content);
  const now = Date.now();

  const muteRole = guild.roles.cache.find(r => r.name === MUTE_ROLE);
  const logChannel = guild.channels.cache.find(c => c.name === LOG_CHANNEL);

  async function log(text) {
    if (logChannel) logChannel.send(text);
  }

  async function deleteMsg() {
    if (msg.deletable) await msg.delete().catch(() => {});
  }

  async function mute(duration, reason) {
    if (!muteRole || !member.manageable) return;

    await member.roles.add(muteRole).catch(() => {});

    setTimeout(() => {
      member.roles.remove(muteRole).catch(() => {});
    }, duration);

    log(`🔇 ${msg.author.tag} → ${reason}`);
  }

  // ================= SPAM =================
  if (cooldown.has(msg.author.id)) {
    const last = cooldown.get(msg.author.id);

    if (now - last < 2000) {
      await deleteMsg();
      await mute(10 * 60 * 1000, "SPAM");
      return;
    }
  }

  cooldown.set(msg.author.id, now);

  // ================= LINK =================
  if (hasLink(msg.content)) {
    await deleteMsg();
    await mute(60 * 60 * 1000, "LINK");
    return;
  }

  // ================= KÜFÜR =================
  for (let i = 0; i < badWords.length; i++) {
    if (clean.includes(badWords[i])) {
      await deleteMsg();
      await mute(5 * 60 * 1000, "KÜFÜR");
      return;
    }
  }
});

// ================= WELCOME =================
client.on("guildMemberAdd", async (member) => {

  const channel = member.guild.channels.cache.find(
    c => c.name === WELCOME_CHANNEL
  );

  const role = member.guild.roles.cache.find(
    r => r.name === AUTO_ROLE
  );

  // AUTO ROLE
  if (role && member.manageable) {
    member.roles.add(role).catch(() => {});
  }

  // WELCOME
  if (channel) {
    const count = member.guild.memberCount;

    channel.send(
      `👋 Hoş geldin ${member}!\n🎉 Sen ${count}. üyesin`
    );
  }
});

client.login(process.env.TOKEN);
