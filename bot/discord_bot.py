import discord
from discord.ext import commands
import aiohttp
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot configuration
DISCORD_BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
DISCORD_CLIENT_ID = os.getenv('DISCORD_CLIENT_ID', '1397971356490006558')
DISCORD_VERIFIED_ROLE_ID = int(os.getenv('DISCORD_VERIFIED_ROLE_ID', '1397091951504916531'))
BLINK_PROJECT_ID = os.getenv('BLINK_PROJECT_ID', '7tk0rize')

# Bot setup
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents)

# API URLs - Updated to use correct function URLs
ADMIN_API_URL = f"https://{BLINK_PROJECT_ID}--admin-api.functions.blink.new"
VERIFICATION_URL = f"https://discord-verification-bot-webpage-7tk0rize.sites.blink.new"

@bot.event
async def on_ready():
    print(f'✅ {bot.user} has connected to Discord!')
    print(f'🔗 Bot is in {len(bot.guilds)} servers')
    print(f'🌐 Admin API URL: {ADMIN_API_URL}')
    print(f'🔗 Verification URL: {VERIFICATION_URL}')

def is_admin():
    """Check if user has administrator permissions"""
    def predicate(ctx):
        return ctx.author.guild_permissions.administrator
    return commands.check(predicate)

@bot.command(name='setup_verify')
@is_admin()
async def setup_verify(ctx):
    """Generate verification URL for users"""
    try:
        # Create embed with verification button
        embed = discord.Embed(
            title="🔐 Server Verification",
            description="Click the button below to verify your Discord account and gain access to this server!",
            color=0x5865F2
        )
        embed.add_field(
            name="📋 Instructions",
            value="1. Click the 'Verify with Discord' button\n2. Authorize the application\n3. You'll automatically get the verified role!",
            inline=False
        )
        embed.set_footer(text=f"Server: {ctx.guild.name}")
        
        # Create view with verification button
        view = VerificationView()
        
        await ctx.send(embed=embed, view=view)
        await ctx.message.delete()  # Delete the command message
        
    except Exception as e:
        await ctx.send(f"❌ Error setting up verification: {str(e)}")

@bot.command(name='pull')
@is_admin()
async def pull_verified_users(ctx, guild_id: str = None):
    """Pull verified users to the specified server"""
    try:
        if not guild_id:
            await ctx.send("❌ Please provide a guild ID: `!pull <guild_id>`")
            return
            
        # Get verified users from database
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{ADMIN_API_URL}?action=getVerifiedUsers") as response:
                if response.status != 200:
                    await ctx.send(f"❌ Failed to fetch verified users from database (Status: {response.status})")
                    return
                
                data = await response.json()
                verified_users = data.get('users', [])
        
        if not verified_users:
            await ctx.send("❌ No verified users found in database")
            return
        
        success_count = 0
        already_in_server = 0
        failed_count = 0
        
        embed = discord.Embed(
            title="🔄 Pulling Verified Users...",
            description=f"Processing {len(verified_users)} verified users to guild {guild_id}",
            color=0x57F287
        )
        status_message = await ctx.send(embed=embed)
        
        for user_data in verified_users:
            try:
                user_id = int(user_data['user_id'])
                access_token = user_data.get('has_access_token', False)
                
                if not access_token:
                    failed_count += 1
                    continue
                
                # Try to add user to the specified guild using Discord API
                headers = {
                    'Authorization': f'Bot {DISCORD_BOT_TOKEN}',
                    'Content-Type': 'application/json'
                }
                
                payload = {
                    'access_token': user_data.get('access_token', ''),  # This would need to be retrieved properly
                    'roles': [str(DISCORD_VERIFIED_ROLE_ID)]
                }
                
                async with aiohttp.ClientSession() as session:
                    async with session.put(
                        f'https://discord.com/api/v10/guilds/{guild_id}/members/{user_id}',
                        headers=headers,
                        json=payload
                    ) as response:
                        if response.status in [200, 201, 204]:
                            success_count += 1
                        elif response.status == 204:
                            already_in_server += 1
                        else:
                            failed_count += 1
                            
            except Exception as e:
                failed_count += 1
                print(f"Error processing user {user_data.get('username', 'unknown')}: {e}")
        
        # Update status message with results
        result_embed = discord.Embed(
            title="✅ Pull Complete!",
            color=0x57F287
        )
        result_embed.add_field(name="✅ Successfully Added", value=str(success_count), inline=True)
        result_embed.add_field(name="👥 Already in Server", value=str(already_in_server), inline=True)
        result_embed.add_field(name="❌ Failed", value=str(failed_count), inline=True)
        result_embed.add_field(name="📊 Total Processed", value=str(len(verified_users)), inline=False)
        result_embed.add_field(name="🎯 Target Guild", value=guild_id, inline=False)
        
        await status_message.edit(embed=result_embed)
        
    except Exception as e:
        await ctx.send(f"❌ Error pulling users: {str(e)}")

@bot.command(name='stats')
@is_admin()
async def verification_stats(ctx):
    """Show verification statistics"""
    try:
        # Get stats from database
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{ADMIN_API_URL}?action=getStats") as response:
                if response.status != 200:
                    await ctx.send(f"❌ Failed to fetch verification stats (Status: {response.status})")
                    return
                
                data = await response.json()
                total_verified = data.get('total', 0)
                recent_verifications = data.get('recent', [])
        
        embed = discord.Embed(
            title="📊 Verification Statistics",
            color=0x5865F2
        )
        embed.add_field(name="👥 Total Verified Users", value=str(total_verified), inline=True)
        embed.add_field(name="🏠 Bot Servers", value=str(len(bot.guilds)), inline=True)
        embed.add_field(name="🔗 Verification URL", value=f"[Click Here]({VERIFICATION_URL})", inline=False)
        
        if recent_verifications:
            recent_text = "\n".join([
                f"• {user['username']} - <t:{int(user['verified_at'])}:R>"
                for user in recent_verifications[:5]
            ])
            embed.add_field(name="🕒 Recent Verifications", value=recent_text, inline=False)
        
        embed.set_footer(text=f"Server: {ctx.guild.name}")
        
        await ctx.send(embed=embed)
        
    except Exception as e:
        print(f"❌ Error fetching stats: {e}")
        await ctx.send(f"❌ Error fetching stats: {str(e)}")

class VerificationView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
    
    @discord.ui.button(label='Verify with Discord', style=discord.ButtonStyle.primary, emoji='🔐')
    async def verify_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        # Create OAuth URL
        oauth_url = f"https://discord.com/api/oauth2/authorize?client_id={DISCORD_CLIENT_ID}&redirect_uri={VERIFICATION_URL}/api/discord/callback&response_type=code&scope=identify%20guilds.join"
        
        embed = discord.Embed(
            title="🔐 Verify Your Account",
            description=f"[Click here to verify with Discord]({oauth_url})",
            color=0x5865F2
        )
        embed.add_field(
            name="📋 What happens next?",
            value="1. You'll be redirected to Discord\n2. Authorize the application\n3. You'll get the verified role automatically!",
            inline=False
        )
        
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.CheckFailure):
        await ctx.send("❌ You need administrator permissions to use this command!")
    else:
        print(f"Command error: {error}")
        await ctx.send(f"❌ An error occurred: {str(error)}")

if __name__ == "__main__":
    if not DISCORD_BOT_TOKEN:
        print("❌ DISCORD_BOT_TOKEN not found in environment variables!")
        exit(1)
    
    try:
        bot.run(DISCORD_BOT_TOKEN)
    except Exception as e:
        print(f"❌ Failed to start bot: {e}")