const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const DISCORD_CLIENT_ID = '1397971356490006558';
const VERIFIED_ROLE_ID = process.env.DISCORD_VERIFIED_ROLE_ID || '1397091951504916531';
const BLINK_PROJECT_ID = process.env.BLINK_PROJECT_ID || '7tk0rize';

// API URLs - Updated to use correct function URLs
const ADMIN_API_URL = `https://${BLINK_PROJECT_ID}--admin-api.functions.blink.new`;
const VERIFICATION_URL = `https://discord-verification-bot-webpage-7tk0rize.sites.blink.new`;

client.once('ready', () => {
  console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
  console.log(`🔗 Bot is in ${client.guilds.cache.size} servers`);
  console.log(`🌐 Admin API URL: ${ADMIN_API_URL}`);
  console.log(`🔗 Verification URL: ${VERIFICATION_URL}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check if user has administrator permissions
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return;
  }

  const args = message.content.split(' ');
  const command = args[0].toLowerCase();

  try {
    switch (command) {
      case '!setup_verify':
        await handleSetupVerify(message);
        break;
      case '!pull':
        await handlePull(message, args[1]);
        break;
      case '!stats':
        await handleStats(message);
        break;
    }
  } catch (error) {
    console.error('Command error:', error);
    message.reply('❌ An error occurred while processing the command.');
  }
});

async function handleSetupVerify(message) {
  const serverId = message.guild.id;
  const serverName = message.guild.name;
  const setupBy = message.author.id;

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🔐 Server Verification')
    .setDescription('Click the button below to verify your Discord account and gain access to this server!')
    .addFields(
      { name: '📋 Instructions', value: '1. Click the "Verify with Discord" button\n2. Authorize the application\n3. You\'ll automatically get the verified role!', inline: false },
      { name: '🏠 Server', value: serverName, inline: true },
      { name: '👤 Setup by', value: `<@${setupBy}>`, inline: true }
    )
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🔗 Verify with Discord')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${VERIFICATION_URL}/api/discord/callback&response_type=code&scope=identify%20guilds.join`)
    );

  await message.reply({ embeds: [embed], components: [row] });
  await message.delete().catch(() => {}); // Delete the command message
}

async function handlePull(message, guildId) {
  if (!guildId) {
    return message.reply('❌ Please provide a guild ID: `!pull <guild_id>`');
  }

  try {
    // Get all verified users from database
    const response = await fetch(`${ADMIN_API_URL}?action=getVerifiedUsers`);
    
    if (!response.ok) {
      return message.reply(`❌ Failed to fetch verified users (Status: ${response.status})`);
    }
    
    const data = await response.json();
    const verifiedUsers = data.users || [];
    
    if (verifiedUsers.length === 0) {
      return message.reply('❌ No verified users found.');
    }

    let successCount = 0;
    let failCount = 0;
    const results = [];

    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('🔄 Pulling Verified Users...')
      .setDescription(`Processing ${verifiedUsers.length} verified users to guild ${guildId}`)
      .setTimestamp();

    const statusMessage = await message.reply({ embeds: [embed] });

    for (const userData of verifiedUsers) {
      try {
        if (!userData.has_access_token) {
          results.push(`❌ ${userData.username} - No access token`);
          failCount++;
          continue;
        }

        // For this demo, we'll just count them as processed
        // In a real implementation, you'd need the actual access tokens
        results.push(`⚠️ ${userData.username} - Processed (access token needed for actual invite)`);
        successCount++;
        
      } catch (error) {
        console.error(`Error processing user ${userData.username}:`, error);
        results.push(`❌ ${userData.username} - Error`);
        failCount++;
      }
    }

    const resultEmbed = new EmbedBuilder()
      .setColor(successCount > failCount ? '#57F287' : '#ED4245')
      .setTitle('✅ Pull Complete!')
      .addFields(
        { name: '✅ Processed', value: successCount.toString(), inline: true },
        { name: '❌ Failed', value: failCount.toString(), inline: true },
        { name: '📊 Total', value: verifiedUsers.length.toString(), inline: true },
        { name: '🎯 Target Guild', value: guildId, inline: false }
      )
      .setTimestamp();

    // Split results into chunks if too long
    const resultText = results.slice(0, 10).join('\n');
    if (resultText.length > 0) {
      resultEmbed.addFields({ name: '📋 Results (First 10)', value: resultText });
    }

    await statusMessage.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error('Pull error:', error);
    message.reply(`❌ Error pulling users: ${error.message}`);
  }
}

async function handleStats(message) {
  try {
    // Get stats from database
    const response = await fetch(`${ADMIN_API_URL}?action=getStats`);
    
    if (!response.ok) {
      return message.reply(`❌ Failed to fetch verification stats (Status: ${response.status})`);
    }
    
    const data = await response.json();
    const totalVerified = data.total || 0;
    const recentVerifications = data.recent || [];

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📊 Verification Statistics')
      .setDescription('Current verification system stats')
      .addFields(
        { name: '👥 Total Verified Users', value: totalVerified.toString(), inline: true },
        { name: '🏠 Bot Servers', value: client.guilds.cache.size.toString(), inline: true },
        { name: '🔗 Verification URL', value: `[Click Here](${VERIFICATION_URL})`, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.username}` });

    if (recentVerifications.length > 0) {
      const recentText = recentVerifications.slice(0, 5).map(user => 
        `• ${user.username} - <t:${Math.floor(new Date(user.verified_at).getTime() / 1000)}:R>`
      ).join('\n');
      embed.addFields({ name: '🕒 Recent Verifications', value: recentText, inline: false });
    }

    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    message.reply(`❌ Error fetching statistics: ${error.message}`);
  }
}

client.on('error', error => {
  console.error('Discord client error:', error);
});

client.login(process.env.DISCORD_BOT_TOKEN);