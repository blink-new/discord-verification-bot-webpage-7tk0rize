import discord
from discord.ext import commands
import aiohttp
import asyncio
import json
import os
from datetime import datetime

# Bot configuration
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents)

# Configuration
DISCORD_BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
DISCORD_CLIENT_ID = os.getenv('DISCORD_CLIENT_ID', '1397971356490006558')
DISCORD_CLIENT_SECRET = os.getenv('DISCORD_CLIENT_SECRET')
VERIFIED_ROLE_ID = int(os.getenv('DISCORD_VERIFIED_ROLE_ID', '1397091951504916531'))
API_BASE_URL = 'https://7tk0rize--admin-api.functions.blink.new'

@bot.event
async def on_ready():
    print(f'✅ {bot.user} has connected to Discord!')
    print(f'🔗 Bot is in {len(bot.guilds)} servers')
    for guild in bot.guilds:
        print(f'   - {guild.name} (ID: {guild.id})')

def is_admin():
    """Check if user has administrator permissions"""
    async def predicate(ctx):
        return ctx.author.guild_permissions.administrator
    return commands.check(predicate)

@bot.command(name='setup_verify')
@is_admin()
async def setup_verify(ctx):
    """Generate verification URL for users to verify"""
    try:
        verification_url = f"https://discord-verification-bot-webpage-7tk0rize.sites.blink.new/verify"
        
        embed = discord.Embed(
            title="🔐 Server Verification",
            description="Click the button below to verify your Discord account!",
            color=0x5865F2
        )
        embed.add_field(
            name="Why verify?",
            value="Verification helps keep our server secure and gives you access to all channels.",
            inline=False
        )
        embed.set_footer(text="Verification is quick and secure through Discord OAuth2")
        
        # Create a view with a button
        view = discord.ui.View()
        button = discord.ui.Button(
            label="🔗 Verify Now",
            style=discord.ButtonStyle.link,
            url=verification_url
        )
        view.add_item(button)
        
        await ctx.send(embed=embed, view=view)
        await ctx.message.delete()  # Delete the command message
        
    except Exception as e:
        await ctx.send(f"❌ Error setting up verification: {str(e)}")

@bot.command(name='pull')
@is_admin()
async def pull_verified_users(ctx, guild_id: str = None):
    """Pull verified users to the current server or specified guild"""
    try:
        target_guild_id = guild_id if guild_id else str(ctx.guild.id)
        target_guild = bot.get_guild(int(target_guild_id))
        
        if not target_guild:
            await ctx.send(f"❌ Bot is not in guild with ID: {target_guild_id}")
            return
        
        # Check if bot has permissions in target guild
        bot_member = target_guild.get_member(bot.user.id)
        if not bot_member.guild_permissions.create_instant_invite:
            await ctx.send(f"❌ Bot lacks invite permissions in {target_guild.name}")
            return
        
        # Get verified users from database
        async with aiohttp.ClientSession() as session:
            async with session.get(f'{API_BASE_URL}/verified-users') as response:
                if response.status != 200:
                    await ctx.send("❌ Failed to fetch verified users from database")
                    return
                
                data = await response.json()
                verified_users = data.get('users', [])
        
        if not verified_users:
            await ctx.send("📭 No verified users found in database")
            return
        
        # Create invite to target guild
        try:
            invite = await target_guild.text_channels[0].create_invite(
                max_age=3600,  # 1 hour
                max_uses=len(verified_users),
                unique=True,
                reason=f"Pulling verified users - requested by {ctx.author}"
            )
        except Exception as e:
            await ctx.send(f"❌ Failed to create invite: {str(e)}")
            return
        
        successful_invites = 0
        failed_invites = 0
        already_in_server = 0
        
        embed = discord.Embed(
            title="🔄 Pulling Verified Users...",
            description=f"Attempting to invite {len(verified_users)} verified users to **{target_guild.name}**",
            color=0x57F287
        )
        
        status_message = await ctx.send(embed=embed)
        
        for user_data in verified_users:
            try:
                user_id = int(user_data['user_id'])
                user = bot.get_user(user_id)
                
                # Check if user is already in target guild
                if target_guild.get_member(user_id):
                    already_in_server += 1
                    continue
                
                if user:
                    try:
                        # Send invite via DM
                        dm_embed = discord.Embed(
                            title="🎉 Server Invitation",
                            description=f"You've been invited to join **{target_guild.name}** as a verified member!",
                            color=0x5865F2
                        )
                        dm_embed.add_field(
                            name="Join Server",
                            value=f"[Click here to join]({invite.url})",
                            inline=False
                        )
                        dm_embed.set_footer(text="This invite expires in 1 hour")
                        
                        await user.send(embed=dm_embed)
                        successful_invites += 1
                        
                    except discord.Forbidden:
                        # User has DMs disabled, try alternative method
                        failed_invites += 1
                        
                else:
                    failed_invites += 1
                
                # Rate limiting
                await asyncio.sleep(1)
                
            except Exception as e:
                failed_invites += 1
                print(f"Error inviting user {user_data.get('user_id')}: {e}")
        
        # Update status message with results
        result_embed = discord.Embed(
            title="✅ Pull Operation Complete",
            color=0x57F287
        )
        result_embed.add_field(
            name="📊 Results",
            value=f"**Invites Sent:** {successful_invites}\n"
                  f"**Failed:** {failed_invites}\n"
                  f"**Already in Server:** {already_in_server}\n"
                  f"**Total Verified Users:** {len(verified_users)}",
            inline=False
        )
        result_embed.add_field(
            name="🔗 Invite Link",
            value=f"[{invite.url}]({invite.url})",
            inline=False
        )
        result_embed.set_footer(text=f"Target Server: {target_guild.name}")
        
        await status_message.edit(embed=result_embed)
        
    except Exception as e:
        await ctx.send(f"❌ Error during pull operation: {str(e)}")

@bot.command(name='stats')
@is_admin()
async def verification_stats(ctx):
    """Show verification statistics"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f'{API_BASE_URL}/stats') as response:
                if response.status != 200:
                    await ctx.send("❌ Failed to fetch verification stats")
                    return
                
                data = await response.json()
        
        embed = discord.Embed(
            title="📊 Verification Statistics",
            color=0x5865F2
        )
        
        embed.add_field(
            name="👥 Total Verified",
            value=f"**{data.get('total', 0)}** users",
            inline=True
        )
        
        embed.add_field(
            name="📅 Today",
            value=f"**{data.get('today', 0)}** new",
            inline=True
        )
        
        embed.add_field(
            name="📈 This Week",
            value=f"**{data.get('week', 0)}** total",
            inline=True
        )
        
        # Add recent verifications
        recent = data.get('recent', [])
        if recent:
            recent_text = "\n".join([
                f"• {user['username']} - {user['verified_at'][:10]}"
                for user in recent[:5]
            ])
            embed.add_field(
                name="🕒 Recent Verifications",
                value=recent_text,
                inline=False
            )
        
        embed.set_footer(text=f"Bot is active in {len(bot.guilds)} servers")
        embed.timestamp = datetime.utcnow()
        
        await ctx.send(embed=embed)
        
    except Exception as e:
        await ctx.send(f"❌ Error fetching stats: {str(e)}")

@bot.command(name='servers')
@is_admin()
async def list_servers(ctx):
    """List all servers the bot is in"""
    try:
        embed = discord.Embed(
            title="🏠 Bot Server List",
            description=f"Bot is currently active in {len(bot.guilds)} servers:",
            color=0x5865F2
        )
        
        for guild in bot.guilds:
            member_count = guild.member_count
            embed.add_field(
                name=f"🏛️ {guild.name}",
                value=f"ID: `{guild.id}`\nMembers: {member_count}",
                inline=True
            )
        
        await ctx.send(embed=embed)
        
    except Exception as e:
        await ctx.send(f"❌ Error listing servers: {str(e)}")

@bot.event
async def on_member_join(member):
    """Auto-assign verified role if user is in verified database"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f'{API_BASE_URL}/check-user/{member.id}') as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('verified'):
                        # User is verified, assign role
                        role = member.guild.get_role(VERIFIED_ROLE_ID)
                        if role:
                            await member.add_roles(role, reason="Auto-verified from database")
                            print(f"✅ Auto-assigned verified role to {member.name}")
    except Exception as e:
        print(f"Error checking verification status for {member.name}: {e}")

@bot.event
async def on_command_error(ctx, error):
    """Handle command errors"""
    if isinstance(error, commands.CheckFailure):
        await ctx.send("❌ You need administrator permissions to use this command!")
    elif isinstance(error, commands.MissingRequiredArgument):
        await ctx.send(f"❌ Missing required argument: {error.param}")
    else:
        await ctx.send(f"❌ An error occurred: {str(error)}")
        print(f"Command error: {error}")

if __name__ == "__main__":
    if not DISCORD_BOT_TOKEN:
        print("❌ DISCORD_BOT_TOKEN environment variable is required!")
        exit(1)
    
    print("🚀 Starting Discord Verification Bot...")
    bot.run(DISCORD_BOT_TOKEN)