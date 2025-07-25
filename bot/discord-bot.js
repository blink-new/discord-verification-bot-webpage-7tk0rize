const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createClient } = require('@blinkdotnew/sdk');

// Initialize Blink client
const blink = createClient({
  projectId: process.env.BLINK_PROJECT_ID,
  authRequired: false
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const DISCORD_CLIENT_ID = '1397971356490006558';
const VERIFIED_ROLE_ID = process.env.DISCORD_VERIFIED_ROLE_ID;

client.once('ready', () => {
  console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
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
        await handlePull(message);
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
  
  // Store server info in database
  await blink.db.botServers.create({
    id: `server_${serverId}`,
    serverId: serverId,
    serverName: serverName,
    setupBy: setupBy,
    verificationUrl: `https://discord-verification-bot-webpage-7tk0rize.sites.blink.new/verify?server=${serverId}`,
    isActive: 1
  });

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🔐 Verification System Setup')
    .setDescription('Click the button below to get the verification link for your server!')
    .addFields(
      { name: '📋 Server', value: serverName, inline: true },
      { name: '👤 Setup by', value: `<@${setupBy}>`, inline: true }
    )
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🔗 Get Verification Link')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord-verification-bot-webpage-7tk0rize.sites.blink.new/verify?server=${serverId}`)
    );

  await message.reply({ embeds: [embed], components: [row] });
}

async function handlePull(message) {
  const serverId = message.guild.id;
  
  // Get all verified users from database
  const verifiedUsers = await blink.db.verifiedUsers.list();
  
  if (verifiedUsers.length === 0) {
    return message.reply('❌ No verified users found.');
  }

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const userData of verifiedUsers) {
    try {
      // Try to add user to the server
      const member = await message.guild.members.fetch(userData.userId).catch(() => null);
      
      if (member) {
        // User is already in the server, just add the role
        if (VERIFIED_ROLE_ID) {
          await member.roles.add(VERIFIED_ROLE_ID);
        }
        results.push(`✅ <@${userData.userId}> - Added role`);
        successCount++;
      } else {
        // User needs to be invited to the server
        results.push(`⚠️ <@${userData.userId}> - Not in server (needs invite)`);
        failCount++;
      }
    } catch (error) {
      console.error(`Error processing user ${userData.userId}:`, error);
      results.push(`❌ <@${userData.userId}> - Error`);
      failCount++;
    }
  }

  const embed = new EmbedBuilder()
    .setColor(successCount > failCount ? '#57F287' : '#ED4245')
    .setTitle('📥 Pull Results')
    .setDescription(`Processed ${verifiedUsers.length} verified users`)
    .addFields(
      { name: '✅ Success', value: successCount.toString(), inline: true },
      { name: '❌ Failed', value: failCount.toString(), inline: true },
      { name: '📊 Total', value: verifiedUsers.length.toString(), inline: true }
    )
    .setTimestamp();

  // Split results into chunks if too long
  const resultText = results.slice(0, 10).join('\n');
  if (resultText.length > 0) {
    embed.addFields({ name: '📋 Results (First 10)', value: resultText });
  }

  await message.reply({ embeds: [embed] });
}

async function handleStats(message) {
  try {
    // Get verified users count using the API
    const response = await fetch('https://7tk0rize--admin-api.functions.blink.new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'stats' })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch stats');
    }

    const totalVerified = data.total;
    
    // Get server count
    const servers = await blink.db.botServers.list();
    const totalServers = servers.length;
    
    // Get recent verifications (last 24 hours) - simplified for now
    const recentVerifications = 0; // Will be calculated properly later

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📊 Verification Statistics')
      .setDescription('Current verification system stats')
      .addFields(
        { name: '👥 Total Verified Users', value: totalVerified.toString(), inline: true },
        { name: '🏠 Active Servers', value: totalServers.toString(), inline: true },
        { name: '🕐 Last 24h', value: recentVerifications.toString(), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.username}` });

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    message.reply('❌ Error fetching statistics.');
  }
}

// Handle user joining servers
client.on('guildMemberAdd', async (member) => {
  try {
    // Check if user is verified
    const verifiedUsers = await blink.db.verifiedUsers.list({
      where: { userId: member.user.id }
    });
    
    if (verifiedUsers.length > 0 && VERIFIED_ROLE_ID) {
      // Add verified role
      await member.roles.add(VERIFIED_ROLE_ID);
      console.log(`✅ Added verified role to ${member.user.tag}`);
    }
  } catch (error) {
    console.error('Error handling member join:', error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);