import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk";

const blink = createClient({
  projectId: Deno.env.get('BLINK_PROJECT_ID') || '',
  authRequired: false
});

interface VerifiedUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  accessToken: string;
  verifiedAt: string;
}

interface DiscordServer {
  id: string;
  name: string;
  icon: string;
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
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    
    if (!botToken) {
      throw new Error('Discord bot token not configured');
    }

    switch (action) {
      case 'getServers': {
        // Get all servers the bot is in
        const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Discord API error: ${response.status}`);
        }

        const guilds = await response.json();
        
        // Transform to our server format
        const servers: DiscordServer[] = await Promise.all(
          guilds.map(async (guild: any) => {
            // Get bot member info to check permissions
            const botMemberResponse = await fetch(
              `https://discord.com/api/v10/guilds/${guild.id}/members/@me`,
              {
                headers: {
                  'Authorization': `Bot ${botToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            const botPermissions: string[] = [];
            if (botMemberResponse.ok) {
              const botMember = await botMemberResponse.json();
              // Get guild roles to calculate permissions
              const rolesResponse = await fetch(
                `https://discord.com/api/v10/guilds/${guild.id}/roles`,
                {
                  headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (rolesResponse.ok) {
                const roles = await rolesResponse.json();
                const botRoles = roles.filter((role: any) => 
                  botMember.roles.includes(role.id)
                );
                
                // Calculate permissions (simplified)
                const permissions = botRoles.reduce((acc: number, role: any) => 
                  acc | parseInt(role.permissions), 0
                );
                
                // Check for key permissions
                if (permissions & 0x10000000) botPermissions.push('MANAGE_ROLES');
                if (permissions & 0x800) botPermissions.push('SEND_MESSAGES');
                if (permissions & 0x400) botPermissions.push('VIEW_CHANNELS');
                if (permissions & 0x1) botPermissions.push('CREATE_INSTANT_INVITE');
              }
            }

            return {
              id: guild.id,
              name: guild.name,
              icon: guild.icon || '',
              memberCount: guild.approximate_member_count || 0,
              botPermissions
            };
          })
        );

        return new Response(JSON.stringify({ servers }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      case 'getVerifiedUsers': {
        // Get verified users from database
        const users = await blink.db.verifiedUsers.list({
          orderBy: { verifiedAt: 'desc' }
        });

        // Transform to match expected format
        const transformedUsers = users.map(user => ({
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar,
          accessToken: user.accessToken,
          verifiedAt: user.verifiedAt
        }));

        return new Response(JSON.stringify({ users: transformedUsers }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      case 'pullUsers': {
        if (req.method !== 'POST') {
          throw new Error('Method not allowed');
        }

        const { serverId, userIds } = await req.json();
        
        if (!serverId || !userIds || !Array.isArray(userIds)) {
          throw new Error('Invalid request data');
        }

        const results = [];
        const verifiedRoleId = Deno.env.get('DISCORD_VERIFIED_ROLE_ID');

        for (const userId of userIds) {
          try {
            // Get user's access token from database
            const userRecord = await blink.db.verifiedUsers.list({
              where: { id: userId },
              limit: 1
            });

            if (userRecord.length === 0) {
              results.push({ userId, success: false, error: 'User not found in database' });
              continue;
            }

            const user = userRecord[0];

            // Add user to server using their access token
            const joinResponse = await fetch(
              `https://discord.com/api/v10/guilds/${serverId}/members/${userId}`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bot ${botToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  access_token: user.accessToken,
                  roles: verifiedRoleId ? [verifiedRoleId] : []
                })
              }
            );

            if (joinResponse.ok || joinResponse.status === 204) {
              results.push({ userId, success: true, error: null });
            } else {
              const errorData = await joinResponse.text();
              results.push({ 
                userId, 
                success: false, 
                error: `Discord API error: ${joinResponse.status} - ${errorData}` 
              });
            }
          } catch (error) {
            results.push({ 
              userId, 
              success: false, 
              error: error.message 
            });
          }
        }

        return new Response(JSON.stringify({ results }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      case 'removeUser': {
        if (req.method !== 'POST') {
          throw new Error('Method not allowed');
        }

        const { userId, adminRole } = await req.json();
        
        if (adminRole !== 'owner') {
          throw new Error('Only owners can remove users');
        }

        // Remove user from database
        await blink.db.verifiedUsers.delete(userId);

        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});