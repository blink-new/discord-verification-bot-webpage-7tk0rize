import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk";

const blink = createClient({
  projectId: Deno.env.get('BLINK_PROJECT_ID') || 'discord-verification-bot-webpage-7tk0rize',
  authRequired: false
});

interface VerifiedUser {
  id: string;
  user_id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  access_token: string;
  refresh_token: string;
  verified_at: string;
  server_id: string;
  server_name: string;
  created_at: string;
  updated_at: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const { action, guildId, userRole } = await req.json();

    if (action === 'pull_users') {
      if (!guildId) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Guild ID is required' 
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Get all verified users
      const verifiedUsers = await blink.db.verified_users.list() as VerifiedUser[];
      
      if (verifiedUsers.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'No verified users found' 
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Get Discord bot token
      const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
      if (!botToken) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Discord bot token not configured' 
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      let pulledCount = 0;
      const errors: string[] = [];

      // Try to add each verified user to the guild
      for (const user of verifiedUsers) {
        try {
          // Use Discord API to add user to guild
          const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${user.user_id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: user.access_token,
              roles: [Deno.env.get('DISCORD_VERIFIED_ROLE_ID')].filter(Boolean), // Add verified role if configured
            }),
          });

          if (response.ok || response.status === 204) {
            pulledCount++;
            console.log(`Successfully added user ${user.username} (${user.user_id}) to guild ${guildId}`);
          } else {
            const errorData = await response.text();
            console.error(`Failed to add user ${user.username} (${user.user_id}):`, response.status, errorData);
            
            // Don't count common errors as failures
            if (response.status !== 403 && response.status !== 400) {
              errors.push(`${user.username}: ${response.status}`);
            }
          }
        } catch (error) {
          console.error(`Error adding user ${user.username} (${user.user_id}):`, error);
          errors.push(`${user.username}: ${error.message}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return new Response(JSON.stringify({ 
        success: true, 
        pulledCount,
        totalUsers: verifiedUsers.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully processed ${pulledCount}/${verifiedUsers.length} users`
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});