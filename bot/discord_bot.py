import discord
from discord.ext import commands
import aiohttp
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot configuration
DISCORD_BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
DISCORD_CLIENT_ID = os.getenv('DISCORD_CLIENT_ID', '1397971356490006558')
DISCORD_VERIFIED_ROLE_ID = os.getenv('DISCORD_VERIFIED_ROLE_ID', '1397091951504916531')
VERIFICATION_URL = 'https://discord-verification-bot-webpage-7tk0rize.sites.blink.new'
API_BASE_URL = 'https://discord-verification-bot-webpage-7tk0rize-admin-api.blink-functions.com'

# Bot setup
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents)

def has_admin_permissions():
    """Check if user has administrator permissions"""
    async def predicate(ctx):
        return ctx.author.guild_permissions.administrator
    return commands.check(predicate)

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')
    print(f'Bot is in {len(bot.guilds)} guilds')
    
    # Set bot status
    activity = discord.Activity(type=discord.ActivityType.watching, name="for !setup_verify")
    await bot.change_presence(activity=activity)

@bot.command(name='setup_verify')
@has_admin_permissions()
async def setup_verify(ctx):
    """Generate verification URL for users to verify"""
    try:
        # Create embed with verification button
        embed = discord.Embed(
            title="🔐 Server Verification",
            description="Click the button below to verify your Discord account and gain access to this server.",
            color=0x5865F2
        )
        embed.add_field(
            name="How it works:",
            value="• Click 'Verify Account'\n• Authorize with Discord\n• Get verified role automatically",
            inline=False
        )
        embed.set_footer(text="This verification is secure and uses Discord OAuth2")
        
        # Create view with verification button
        view = VerificationView()
        
        await ctx.send(embed=embed, view=view)
        
        # Log the setup
        print(f"Verification setup created in {ctx.guild.name} by {ctx.author}")
        
    except Exception as e:
        await ctx.send(f"❌ Error setting up verification: {str(e)}")
        print(f"Error in setup_verify: {e}")

@bot.command(name='pull')
@has_admin_permissions()
async def pull_users(ctx, guild_id: str = None):
    """Pull verified users to the current server"""
    try:
        target_guild_id = guild_id or str(ctx.guild.id)
        
        # Get verified users from API
        async with aiohttp.ClientSession() as session:
            async with session.post(f'{API_BASE_URL}/', json={
                'action': 'getVerifiedUsers'
            }) as response:
                data = await response.json()
                
                if not data.get('success'):
                    await ctx.send("❌ Failed to fetch verified users")
                    return
                
                verified_users = data.get('users', [])
        
        if not verified_users:
            await ctx.send("📭 No verified users found")
            return
        
        # Get target guild
        target_guild = bot.get_guild(int(target_guild_id))
        if not target_guild:
            await ctx.send(f"❌ Bot is not in guild with ID: {target_guild_id}")
            return
        
        # Get verified role
        verified_role = target_guild.get_role(int(DISCORD_VERIFIED_ROLE_ID))
        if not verified_role:
            await ctx.send(f"❌ Verified role not found in {target_guild.name}")
            return
        
        added_count = 0
        already_in_server = 0
        errors = 0
        
        embed = discord.Embed(
            title="🔄 Pulling Verified Users...",
            description=f"Processing {len(verified_users)} verified users",
            color=0x57F287
        )
        status_msg = await ctx.send(embed=embed)
        
        for user_data in verified_users:
            try:
                user_id = int(user_data['userId'])
                
                # Check if user is already in the server
                member = target_guild.get_member(user_id)
                if member:
                    # User already in server, just add role
                    if verified_role not in member.roles:
                        await member.add_roles(verified_role, reason="Verified user pull")
                        added_count += 1
                    else:
                        already_in_server += 1
                else:
                    # Try to create invite and send to user
                    try:
                        # Create invite
                        invite = await target_guild.text_channels[0].create_invite(
                            max_age=86400,  # 24 hours
                            max_uses=1,
                            reason=f"Verification pull for user {user_id}"
                        )
                        
                        # Try to send DM to user
                        user = await bot.fetch_user(user_id)
                        if user:
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
                            
                            await user.send(embed=dm_embed)
                            added_count += 1
                    except:
                        errors += 1
                        
            except Exception as e:
                print(f"Error processing user {user_data.get('userId', 'unknown')}: {e}")
                errors += 1
        
        # Update status message
        final_embed = discord.Embed(
            title="✅ Pull Complete",
            color=0x57F287
        )
        final_embed.add_field(name="Processed", value=str(added_count), inline=True)
        final_embed.add_field(name="Already in server", value=str(already_in_server), inline=True)
        final_embed.add_field(name="Errors", value=str(errors), inline=True)
        final_embed.add_field(
            name="Target Server", 
            value=f"{target_guild.name} ({target_guild_id})", 
            inline=False
        )
        
        await status_msg.edit(embed=final_embed)
        
    except Exception as e:
        await ctx.send(f"❌ Error pulling users: {str(e)}")
        print(f"Error in pull_users: {e}")

@bot.command(name='stats')
@has_admin_permissions()
async def verification_stats(ctx):
    """Show verification statistics"""
    try:
        # Get stats from API
        async with aiohttp.ClientSession() as session:
            async with session.post(f'{API_BASE_URL}/', json={
                'action': 'getStats'
            }) as response:
                data = await response.json()
                
                if not data.get('success'):
                    await ctx.send("❌ Failed to fetch statistics")
                    return
                
                stats = data.get('stats', {})
        
        embed = discord.Embed(
            title="📊 Verification Statistics",
            color=0x5865F2
        )
        embed.add_field(
            name="Total Verified Users",
            value=f"**{stats.get('total', 0)}**",
            inline=True
        )
        embed.add_field(
            name="Verified Today",
            value=f"**{stats.get('today', 0)}**",
            inline=True
        )
        embed.add_field(
            name="This Week",
            value=f"**{stats.get('week', 0)}**",
            inline=True
        )
        
        embed.set_footer(text=f"Bot is active in {len(bot.guilds)} servers")
        
        await ctx.send(embed=embed)
        
    except Exception as e:
        await ctx.send(f"❌ Error fetching stats: {str(e)}")
        print(f"Error in verification_stats: {e}")

class VerificationView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
    
    @discord.ui.button(
        label='Verify Account',
        style=discord.ButtonStyle.primary,
        emoji='🔐'
    )
    async def verify_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Handle verification button click"""
        try:
            # Create verification URL with state parameter
            verification_url = f"{VERIFICATION_URL}/verify?state={interaction.user.id}"
            
            embed = discord.Embed(
                title="🔐 Account Verification",
                description="Click the link below to verify your Discord account:",
                color=0x5865F2
            )
            embed.add_field(
                name="Verification Link",
                value=f"[Verify Now]({verification_url})",
                inline=False
            )
            embed.add_field(
                name="What happens next?",
                value="• You'll be redirected to Discord OAuth\n• Authorize the application\n• Return to this server with verified status",
                inline=False
            )
            embed.set_footer(text="This link is secure and uses Discord's official OAuth2 system")
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
            
        except Exception as e:
            await interaction.response.send_message(
                f"❌ Error creating verification link: {str(e)}", 
                ephemeral=True
            )
            print(f"Error in verify_button: {e}")

@bot.event
async def on_command_error(ctx, error):
    """Handle command errors"""
    if isinstance(error, commands.CheckFailure):
        await ctx.send("❌ You need administrator permissions to use this command.")
    elif isinstance(error, commands.MissingRequiredArgument):
        await ctx.send(f"❌ Missing required argument: {error.param}")
    else:
        await ctx.send(f"❌ An error occurred: {str(error)}")
        print(f"Command error: {error}")

@bot.event
async def on_member_join(member):
    """Handle new member joins"""
    # Check if user is verified
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f'{API_BASE_URL}/', json={
                'action': 'checkVerified',
                'userId': str(member.id)
            }) as response:
                data = await response.json()
                
                if data.get('verified'):
                    # Add verified role
                    verified_role = member.guild.get_role(int(DISCORD_VERIFIED_ROLE_ID))
                    if verified_role:
                        await member.add_roles(verified_role, reason="Auto-verified on join")
                        print(f"Auto-verified {member} in {member.guild.name}")
    except Exception as e:
        print(f"Error checking verification for {member}: {e}")

if __name__ == "__main__":
    if not DISCORD_BOT_TOKEN:
        print("❌ DISCORD_BOT_TOKEN not found in environment variables")
        exit(1)
    
    print("🤖 Starting Discord Verification Bot...")
    print(f"📋 Client ID: {DISCORD_CLIENT_ID}")
    print(f"🎭 Verified Role ID: {DISCORD_VERIFIED_ROLE_ID}")
    print(f"🌐 Verification URL: {VERIFICATION_URL}")
    
    try:
        bot.run(DISCORD_BOT_TOKEN)
    except Exception as e:
        print(f"❌ Failed to start bot: {e}")