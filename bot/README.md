# Discord Verification Bot (Python)

A Python Discord bot for user verification with OAuth2 integration.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set your bot token as an environment variable:
```bash
export DISCORD_BOT_TOKEN="your_bot_token_here"
```

3. Run the bot:
```bash
python discord_bot.py
```

## Commands

- `!setup_verify` - Creates a verification button for users (Admin only)
- `!pull <guild_id>` - Pulls verified users to the current server (Admin only)
- `!stats` - Shows verification statistics (Admin only)
- `!verify_user @user` - Manually verify a user (Admin only)
- `!unverify @user` - Remove verification from a user (Admin only)

## Features

- ✅ Discord OAuth2 integration
- ✅ Administrator-only commands
- ✅ Verified user data storage (verified.json)
- ✅ Cross-server verification system
- ✅ Manual verification/unverification
- ✅ Statistics tracking
- ✅ Error handling and user feedback

## Configuration

The bot uses these settings:
- Client ID: `1397971356490006558`
- Verified Role ID: `1397091951504916531`
- Verification URL: `https://discord-verification-bot-webpage-7tk0rize.sites.blink.new`

## File Structure

- `discord_bot.py` - Main bot file
- `requirements.txt` - Python dependencies
- `verified.json` - Verified users data (auto-created)
- `.env` - Environment variables (create this file)