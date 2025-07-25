const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Discord OAuth2 configuration
const DISCORD_CLIENT_ID = '1397971356490006558';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_API_BASE = 'https://discord.com/api/v10';

// Path to verified users data
const VERIFIED_DATA_PATH = path.join(__dirname, '../bot/verified.json');

// Helper function to load verified users
async function loadVerifiedUsers() {
  try {
    const data = await fs.readFile(VERIFIED_DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Helper function to save verified users
async function saveVerifiedUsers(users) {
  await fs.writeFile(VERIFIED_DATA_PATH, JSON.stringify(users, null, 2));
}

// Discord OAuth2 callback endpoint
app.post('/api/discord/callback', async (req, res) => {
  try {
    const { code, redirectUri, serverInfo } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return res.status(400).json({ error: 'Failed to exchange authorization code' });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token } = tokenData;

    // Get user information
    const userResponse = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch user information' });
    }

    const userData = await userResponse.json();

    // Prepare user data for storage
    const verificationData = {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator || '0',
      avatar: userData.avatar,
      accessToken: access_token,
      refreshToken: refresh_token,
      verifiedAt: new Date().toISOString(),
      serverId: serverInfo?.serverId,
      serverName: serverInfo?.serverName,
    };

    // Load existing verified users
    const verifiedUsers = await loadVerifiedUsers();
    
    // Check if user already exists (update if so)
    const existingIndex = verifiedUsers.findIndex(user => user.id === userData.id);
    
    if (existingIndex !== -1) {
      verifiedUsers[existingIndex] = { ...verifiedUsers[existingIndex], ...verificationData };
    } else {
      verifiedUsers.push(verificationData);
    }

    // Save updated data
    await saveVerifiedUsers(verifiedUsers);

    console.log(`✅ User verified: ${userData.username}#${userData.discriminator}`);

    res.json({
      success: true,
      user: {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator || '0',
        avatar: userData.avatar,
      },
      serverInfo: serverInfo,
    });

  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints
app.get('/api/admin/verified-users', async (req, res) => {
  try {
    const verifiedUsers = await loadVerifiedUsers();
    
    // Remove sensitive data before sending
    const sanitizedUsers = verifiedUsers.map(user => ({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      verifiedAt: user.verifiedAt,
      serverId: user.serverId,
      serverName: user.serverName,
    }));

    res.json(sanitizedUsers);
  } catch (error) {
    console.error('Failed to load verified users:', error);
    res.status(500).json({ error: 'Failed to load verified users' });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const verifiedUsers = await loadVerifiedUsers();
    const totalVerified = verifiedUsers.length;
    
    // Calculate recent verifications (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentVerifications = verifiedUsers.filter(user => 
      new Date(user.verifiedAt).getTime() > oneDayAgo
    ).length;

    // Count users who haven't been pulled to any server yet
    const pendingInvites = verifiedUsers.filter(user => user.accessToken).length;

    res.json({
      totalVerified,
      recentVerifications,
      pendingInvites,
    });
  } catch (error) {
    console.error('Failed to load stats:', error);
    res.status(500).json({ error: 'Failed to load statistics' });
  }
});

app.post('/api/admin/pull-users', async (req, res) => {
  try {
    const { serverId, serverName } = req.body;

    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }

    const verifiedUsers = await loadVerifiedUsers();
    
    if (verifiedUsers.length === 0) {
      return res.json({ invitedCount: 0, message: 'No verified users to pull' });
    }

    // In a real implementation, you would use the Discord bot instance
    // to add users to the server. For now, we'll simulate the process.
    
    // Filter users with valid access tokens
    const usersWithTokens = verifiedUsers.filter(user => user.accessToken);
    
    console.log(`📤 Pull request for server ${serverId} (${serverName})`);
    console.log(`👥 ${usersWithTokens.length} users with valid tokens`);

    // Simulate successful invitations
    // In reality, this would call the Discord API to add users
    const invitedCount = usersWithTokens.length;

    res.json({
      success: true,
      invitedCount,
      message: `Successfully processed ${invitedCount} users for server ${serverName}`,
    });

  } catch (error) {
    console.error('Pull users error:', error);
    res.status(500).json({ error: 'Failed to pull users' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
  console.log(`🔧 Admin dashboard: http://localhost:${PORT}/admin`);
  
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.warn('⚠️  Discord OAuth2 credentials not configured');
    console.warn('   Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET environment variables');
  }
});

module.exports = app;