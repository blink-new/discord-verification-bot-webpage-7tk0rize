# Discord Verification Bot & Webpage

A comprehensive Discord verification system that allows server administrators to set up a verification process using Discord OAuth2. Users verify through a web interface, and their data is stored for later server invitations.

## 🚀 Features

- **Admin Commands**: `!setup_verify`, `!pull`, `!stats` (administrator-only)
- **Discord OAuth2 Integration**: Secure verification with proper callback handling
- **Web Interface**: Beautiful verification page with Discord-style UI
- **Cross-Server Support**: Verified users can be pulled into any server
- **Role Assignment**: Automatically assigns verified role when users join
- **Admin Dashboard**: Web-based management interface
- **Real-time Statistics**: Track verification metrics

## 🔧 Setup Instructions

### 1. Discord Application Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or use existing one
3. Note your **Client ID**: `1397971356490006558`
4. Go to "OAuth2" → "General" and add redirect URI:
   ```
   https://discord-verification-bot-webpage-7tk0rize.sites.blink.new/callback
   ```
5. Go to "Bot" section and create a bot
6. Copy the **Bot Token**
7. Enable required bot permissions:
   - `Send Messages`
   - `Create Instant Invite`
   - `Manage Roles`
   - `Add Members to Guild`

### 2. Server Setup

1. Create or identify the role for verified users
2. Your verified role ID: `1397091951504916531`
3. Invite the bot to your server with proper permissions:
   ```
   https://discord.com/api/oauth2/authorize?client_id=1397971356490006558&permissions=268435456&scope=bot
   ```

### 3. Environment Variables

The following secrets are already configured in your Blink project:
- `DISCORD_CLIENT_SECRET`: Your Discord application client secret
- `DISCORD_BOT_TOKEN`: Your Discord bot token
- `DISCORD_VERIFIED_ROLE_ID`: Role ID to assign to verified users (`1397091951504916531`)

## 📖 Usage Guide

### For Server Administrators

#### Setting Up Verification
1. In your Discord server, type: `!setup_verify`
2. The bot will respond with a verification URL
3. Share this URL with users who need to verify

#### Adding Verified Users
1. Type: `!pull` in your Discord server
2. The bot will add all verified users to your server
3. Users will automatically receive the verified role

#### Checking Statistics
1. Type: `!stats` to see verification metrics
2. View total verified users, recent activity, and more

### For Users

#### Verification Process
1. Click the verification URL provided by server admins
2. Click "Verify with Discord"
3. Authorize the application on Discord
4. You'll be redirected back with confirmation
5. Wait for server admins to use `!pull` command

## 🌐 Web Interface

### Verification Page
- **URL**: `https://discord-verification-bot-webpage-7tk0rize.sites.blink.new/verify`
- Clean, Discord-styled interface
- Secure OAuth2 flow
- Real-time status updates

### Admin Dashboard
- **URL**: `https://discord-verification-bot-webpage-7tk0rize.sites.blink.new/admin`
- Generate verification URLs
- View verified users list
- Pull users to servers
- Real-time statistics

## 🔒 Security Features

- **OAuth2 Compliance**: Proper Discord OAuth2 implementation
- **Token Security**: Access tokens stored securely in database
- **Admin-Only Commands**: All bot commands require administrator permissions
- **CORS Protection**: Proper cross-origin request handling
- **Rate Limiting**: Built-in protection against API abuse

## 🛠️ Technical Details

### Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Blink Edge Functions (Deno)
- **Database**: Blink SQL Database (SQLite)
- **Bot**: Discord.js v14
- **Authentication**: Discord OAuth2

### API Endpoints
- `POST /discord-callback`: Handles OAuth2 callback
- `GET /admin-api/verified-users`: Lists verified users
- `GET /admin-api/stats`: Returns verification statistics
- `POST /admin-api/pull-users`: Adds users to Discord server

### Database Schema
```sql
CREATE TABLE verified_users (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  discriminator TEXT NOT NULL,
  avatar TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  verified_at TEXT NOT NULL,
  server_id TEXT,
  server_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## 🚨 Troubleshooting

### Common Issues

**Bot not responding to commands:**
- Ensure bot has proper permissions in your server
- Check that you have administrator permissions
- Verify bot is online and properly configured

**Verification fails:**
- Check Discord application OAuth2 settings
- Ensure redirect URI is correctly configured
- Verify client secret is properly set

**Users can't join server:**
- Bot needs "Create Instant Invite" permission
- Users must have completed verification first
- Check server member limits and restrictions

**Role not assigned:**
- Verify role ID is correct: `1397091951504916531`
- Bot needs "Manage Roles" permission
- Bot's role must be higher than the verified role

### Support

For technical support or questions:
1. Check the admin dashboard for error messages
2. Review bot logs in your hosting environment
3. Ensure all environment variables are properly configured

## 📝 Command Reference

| Command | Description | Permission Required |
|---------|-------------|-------------------|
| `!setup_verify` | Generate verification URL for current server | Administrator |
| `!pull` | Add all verified users to current server | Administrator |
| `!stats` | Display verification statistics | Administrator |

## 🔗 Links

- **Verification Page**: https://discord-verification-bot-webpage-7tk0rize.sites.blink.new/verify
- **Admin Dashboard**: https://discord-verification-bot-webpage-7tk0rize.sites.blink.new/admin
- **Bot Setup Guide**: https://discord-verification-bot-webpage-7tk0rize.sites.blink.new/setup

---

Built with ❤️ using Blink AI Platform