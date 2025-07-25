import discord
from discord.ext import commands
import aiohttp
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot configuration
BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
CLIENT_ID = os.getenv('DISCORD_CLIENT_ID', '1397971356490006558')
VERIFIED_ROLE_ID = os.getenv('DISCORD_VERIFIED_ROLE_ID', '1397091951504916531')
API_BASE = 'https://7tk0rize--admin-api.functions.blink.new'
VERIFICATION_URL = 'https://discord-verification-bot-webpage-7tk0rize.sites.blink.new'

# Bot setup
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'✅ {bot.user} is now online!')
    print(f'📊 Connected to {len(bot.guilds)} servers')

def is_admin():
    """Check if user has administrator permissions"""
    def predicate(ctx):
        return ctx.author.guild_permissions.administrator
    return commands.check(predicate)

@bot.command(name='setup_verify')
@is_admin()
async def setup_verify(ctx):
    """Set up verification for the server"""
    try:
        # Create verification URL with server info
        verify_url = f"{VERIFICATION_URL}?guild_id={ctx.guild.id}&guild_name={ctx.guild.name}"
        
        embed = discord.Embed(
            title="🔐 Server Verification Setup",
            description="Click the button below to verify and gain access to this server!",
            color=0x5865F2
        )
        embed.add_field(
            name="How it works:",
            value="1. Click 'Verify with Discord'\n2. Authorize the application\n3. Get the verified role automatically",
            inline=False
        )
        embed.add_field(
            name="Verification URL:",
            value=f"[Click here to verify]({verify_url})",
            inline=False
        )
        embed.set_footer(text=f"Server ID: {ctx.guild.id}")
        
        # Create view with button
        view = VerificationView(verify_url)
        
        await ctx.send(embed=embed, view=view)
        await ctx.message.delete()  # Delete the command message
        
    except Exception as e:
        await ctx.send(f"❌ Error setting up verification: {str(e)}")

@bot.command(name='stats')
@is_admin()
async def stats(ctx):
    """Show verification statistics"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_BASE}?action=getVerifiedUsers") as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('success'):
                        users = data.get('users', [])
                        total_verified = len(users)
                        
                        # Count users from this server
                        server_verified = len([u for u in users if u.get('server_id') == str(ctx.guild.id)])
                        
                        embed = discord.Embed(
                            title="📊 Verification Statistics",
                            color=0x57F287
                        )
                        embed.add_field(name="Total Verified Users", value=f"{total_verified}", inline=True)
                        embed.add_field(name="From This Server", value=f"{server_verified}", inline=True)
                        embed.add_field(name="Server ID", value=f"{ctx.guild.id}", inline=True)
                        embed.set_footer(text=f"Requested by {ctx.author}")
                        
                        await ctx.send(embed=embed)
                    else:
                        await ctx.send(f"❌ Error fetching stats: {data.get('message', 'Unknown error')}")
                else:
                    await ctx.send(f"❌ Error fetching stats: HTTP {response.status}")
                    
    except Exception as e:
        await ctx.send(f"❌ Error fetching stats: {str(e)}")

@bot.command(name='pull')
@is_admin()
async def pull_users(ctx, limit: int = None):
    """Pull verified users to this server"""
    try:
        # Get verified users
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_BASE}?action=getVerifiedUsers") as response:
                if response.status != 200:
                    await ctx.send(f"❌ Error fetching verified users: HTTP {response.status}")
                    return
                
                data = await response.json()
                if not data.get('success'):
                    await ctx.send(f"❌ Error fetching verified users: {data.get('message', 'Unknown error')}")
                    return
                
                users = data.get('users', [])
                if not users:
                    await ctx.send("❌ No verified users found")
                    return
                
                # Apply limit if specified
                if limit and limit > 0:
                    users = users[:limit]
                
                # Extract user IDs
                user_ids = [user['user_id'] for user in users]
                
                # Pull users using admin API
                pull_data = {
                    'guildId': str(ctx.guild.id),
                    'userIds': user_ids
                }
                
                async with session.post(
                    f"{API_BASE}?action=pullUsers",
                    json=pull_data,
                    headers={'Content-Type': 'application/json'}
                ) as pull_response:
                    if pull_response.status == 200:
                        result = await pull_response.json()
                        if result.get('success'):
                            embed = discord.Embed(
                                title="✅ Pull Operation Complete",
                                description=result.get('message', 'Users pulled successfully'),
                                color=0x57F287
                            )
                            
                            # Show results if available
                            if 'results' in result:
                                success_count = len([r for r in result['results'] if r.get('success')])
                                total_count = len(result['results'])
                                embed.add_field(
                                    name="Results",
                                    value=f"✅ {success_count}/{total_count} users added successfully",
                                    inline=False
                                )
                            
                            await ctx.send(embed=embed)
                        else:
                            await ctx.send(f"❌ Pull failed: {result.get('message', 'Unknown error')}")
                    else:
                        await ctx.send(f"❌ Pull failed: HTTP {pull_response.status}")
                        
    except Exception as e:
        await ctx.send(f"❌ Error pulling users: {str(e)}")

class VerificationView(discord.ui.View):
    def __init__(self, verify_url):
        super().__init__(timeout=None)
        self.verify_url = verify_url
        
        # Add verification button
        button = discord.ui.Button(
            label="Verify with Discord",
            style=discord.ButtonStyle.primary,
            emoji="🔐",
            url=verify_url
        )
        self.add_item(button)

@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.CheckFailure):
        await ctx.send("❌ You need administrator permissions to use this command!")
    elif isinstance(error, commands.CommandNotFound):
        pass  # Ignore unknown commands
    else:
        await ctx.send(f"❌ An error occurred: {str(error)}")
        print(f"Error in command {ctx.command}: {error}")

# Help command
@bot.command(name='help_verify')
async def help_verify(ctx):
    """Show help for verification commands"""
    embed = discord.Embed(
        title="🤖 Discord Verification Bot Help",
        description="Commands for server verification system",
        color=0x5865F2
    )
    
    embed.add_field(
        name="!setup_verify",
        value="Set up verification for your server (Admin only)",
        inline=False
    )
    embed.add_field(
        name="!stats",
        value="Show verification statistics (Admin only)",
        inline=False
    )
    embed.add_field(
        name="!pull [limit]",
        value="Pull verified users to this server (Admin only)\nOptional limit parameter to limit number of users",
        inline=False
    )
    embed.add_field(
        name="!help_verify",
        value="Show this help message",
        inline=False
    )
    
    embed.set_footer(text="All admin commands require Administrator permission")
    await ctx.send(embed=embed)

if __name__ == "__main__":
    if not BOT_TOKEN:
        print("❌ Error: DISCORD_BOT_TOKEN not found in environment variables")
        print("Please set your bot token in the .env file")
    else:
        try:
            bot.run(BOT_TOKEN)
        except discord.LoginFailure:
            print("❌ Error: Invalid bot token")
        except Exception as e:
            print(f"❌ Error starting bot: {e}")