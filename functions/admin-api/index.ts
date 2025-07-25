import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk";

const blink = createClient({
  projectId: Deno.env.get('BLINK_PROJECT_ID') || '',
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
  server_id?: string;
  server_name?: string;
}

interface DiscordServer {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  botPermissions: string[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'getVerifiedUsers') {
      // Get verified users from database
      const users = await blink.db.sql(`
        SELECT * FROM verified_users 
        ORDER BY verified_at DESC
      `);

      return new Response(JSON.stringify({
        success: true,
        users: users
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (action === 'getServers') {
      // Get Discord servers the bot is in
      const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
      
      if (!botToken) {
        throw new Error('Discord bot token not configured');
      }

      // Get bot's guilds from Discord API
      const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }

      const guilds = await response.json();
      
      // Transform guild data to our server format
      const servers: DiscordServer[] = guilds.map((guild: any) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        memberCount: guild.approximate_member_count || 0,
        botPermissions: guild.permissions ? ['ADMINISTRATOR'] : ['BASIC']
      }));

      return new Response(JSON.stringify({
        success: true,
        servers: servers
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (action === 'pullUsers') {
      const body = await req.json();
      const { serverId, userIds } = body;
      
      const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
      const verifiedRoleId = Deno.env.get('DISCORD_VERIFIED_ROLE_ID');
      
      if (!botToken || !verifiedRoleId) {
        throw new Error('Bot token or verified role ID not configured');
      }

      // Get verified users data
      const users = await blink.db.sql(`
        SELECT * FROM verified_users 
        WHERE user_id IN (${userIds.map(() => '?').join(',')})
      `, userIds);

      const results = [];

      for (const user of users) {
        try {
          // Create invite to add user to server
          const inviteResponse = await fetch(`https://discord.com/api/v10/guilds/${serverId}/members/${user.user_id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: user.access_token,
              roles: [verifiedRoleId]
            }),
          });

          if (inviteResponse.ok || inviteResponse.status === 204) {
            results.push({
              userId: user.user_id,
              username: user.username,
              success: true,
              message: 'Successfully added to server'
            });
          } else {
            const errorData = await inviteResponse.text();
            results.push({
              userId: user.user_id,
              username: user.username,
              success: false,
              message: `Failed to add: ${errorData}`
            });
          }
        } catch (error) {
          results.push({
            userId: user.user_id,
            username: user.username,
            success: false,
            message: `Error: ${error.message}`
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        results: results
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (action === 'removeUser') {
      const body = await req.json();
      const { userId, adminRole } = body;
      
      // Only owners can remove users
      if (adminRole !== 'owner') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Only owners can remove users'
        }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Remove user from database
      await blink.db.sql(`
        DELETE FROM verified_users 
        WHERE user_id = ?
      `, [userId]);

      return new Response(JSON.stringify({
        success: true,
        message: 'User removed successfully'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action'
    }), {
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
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});