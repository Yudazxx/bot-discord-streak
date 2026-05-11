const path = require('node:path');
const {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Partials,
} = require('discord.js');
const { StreakManager } = require('./streakManager');
const { loadJson, saveJson } = require('./storage');

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = process.env.PREFIX || '!';
const TIME_ZONE = process.env.STREAK_TIMEZONE || 'UTC';
const DATA_FILE = process.env.STREAK_DATA_FILE || path.join(process.cwd(), 'data', 'streaks.json');
const MILESTONES = [7, 14, 30, 50, 100, 365];

if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN environment variable.');
  process.exit(1);
}

let manager;

function memberDisplayName(member, user) {
  return member?.displayName || user?.globalName || user?.username || user?.id;
}

function buildStreakEmbed(author, partner, result) {
  const current = result.pair.current;
  const title = MILESTONES.includes(current) ? '🔥 Streak Nyala!' : '🔥 Streak Updated';

  return new EmbedBuilder()
    .setColor(0xff6a00)
    .setTitle(title)
    .setDescription(`${author} and ${partner} now have a **${current} day** streak.`)
    .addFields(
      { name: 'Current', value: `${current}`, inline: true },
      { name: 'Best', value: `${result.pair.best}`, inline: true },
      { name: 'Total', value: `${result.pair.total}`, inline: true },
    )
    .setFooter({ text: `Counted for ${result.today} (${TIME_ZONE})` })
    .setTimestamp();
}

function buildInfoEmbed(user, info) {
  const partners = info.partners.length
    ? info.partners.slice(0, 10).map((partner, index) => (
        `#${index + 1} ${partner.partnerName} — **${partner.current}** 🔥`
      )).join('\n')
    : 'No streak partners yet. Mention someone with `!streak @user` to start.';

  return new EmbedBuilder()
    .setColor(0x2f9bff)
    .setTitle(`Streak Info — ${info.name}`)
    .setDescription(partners)
    .addFields({ name: 'Total streak days', value: `${info.total}`, inline: true })
    .setFooter({ text: `Requested by ${user.username}` })
    .setTimestamp();
}

async function persist() {
  await saveJson(DATA_FILE, manager.toJSON());
}

async function handleStreakCommand(message) {
  const partner = message.mentions.users.first();
  if (!partner) {
    await message.reply(`Use \`${PREFIX}streak @user\` to add today's streak.`);
    return;
  }

  const result = manager.recordStreak({
    authorId: message.author.id,
    authorName: memberDisplayName(message.member, message.author),
    partnerId: partner.id,
    partnerName: memberDisplayName(message.mentions.members?.get(partner.id), partner),
    at: message.createdAt,
    timeZone: TIME_ZONE,
  });

  if (!result.changed) {
    await message.reply('That streak was already counted today. Come back tomorrow! 🔥');
    return;
  }

  await persist();
  await message.reply({ embeds: [buildStreakEmbed(message.author, partner, result)] });
}

async function handleInfoCommand(message) {
  const target = message.mentions.users.first() || message.author;
  const info = manager.getUserInfo(target.id);
  await message.reply({ embeds: [buildInfoEmbed(message.author, info)] });
}

async function main() {
  manager = new StreakManager(await loadJson(DATA_FILE, {}));

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}. Prefix: ${PREFIX}`);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const commandText = content.startsWith(PREFIX) ? content.slice(PREFIX.length).trim() : content;
    const [command] = commandText.split(/\s+/);
    const normalizedCommand = command?.toLowerCase();
    if (!['streak', 'istreak'].includes(normalizedCommand)) return;

    try {
      if (normalizedCommand === 'streak') await handleStreakCommand(message);
      if (normalizedCommand === 'istreak') await handleInfoCommand(message);
    } catch (error) {
      console.error(error);
      await message.reply('Sorry, I could not update the streak. Check the bot logs.');
    }
  });

  await client.login(TOKEN);
}

main();
