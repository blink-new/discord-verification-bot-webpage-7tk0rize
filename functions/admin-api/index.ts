import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk";

const blink = createClient({
  projectId: Deno.env.get('BLINK_PROJECT_ID') || '',
  authRequired: false
});

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
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'login') {
      const { key } = await req.json();
      const ownerKey = Deno.env.get('OWNER_LOGIN_KEY');
      const adminKey = Deno.env.get('ADMIN_LOGIN_KEY');

      if (key === ownerKey) {
        return new Response(JSON.stringify({ 
          success: true, 
          role: 'owner',
          message: 'Owner login successful'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else if (key === adminKey) {
        return new Response(JSON.stringify({ 
          success: true, 
          role: 'admin',
          message: 'Admin login successful'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Invalid login key'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    if (action === 'getVerifiedUsers') {
      // Get all verified users from database using snake_case field names
      const users = await blink.db.verifiedUsers.list({
        orderBy: { verified_at: 'desc' }
      });

      // Convert snake_case to camelCase for frontend
      const formattedUsers = users.map(user => ({
        id: user.id,
        userId: user.user_id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        accessToken: user.access_token,
        refreshToken: user.refresh_token,
        verifiedAt: user.verified_at,
        serverId: user.server_id,
        serverName: user.server_name
      }));

      return new Response(JSON.stringify({ 
        success: true, 
        users: formattedUsers || [],
        count: formattedUsers?.length || 0
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (action === 'removeUser') {
      const { userId, role } = await req.json();
      
      // Only owners can remove users
      if (role !== 'owner') {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Only owners can remove verified users'
        }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Find user by user_id and delete
      const users = await blink.db.verifiedUsers.list({
        where: { user_id: userId },
        limit: 1
      });

      if (users && users.length > 0) {
        await blink.db.verifiedUsers.delete(users[0].id);
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'User removed successfully'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'User not found'
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    if (action === 'pullUsers') {
      const { guildId, userIds } = await req.json();
      
      if (!guildId || !userIds || !Array.isArray(userIds)) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Guild ID and user IDs are required'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
      const verifiedRoleId = Deno.env.get('DISCORD_VERIFIED_ROLE_ID');
      
      if (!botToken) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Bot token not configured'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const results = [];
      
      for (const userId of userIds) {
        try {
          // Get user data from database using snake_case field name
          const userData = await blink.db.verifiedUsers.list({
            where: { user_id: userId },
            limit: 1
          });

          if (!userData || userData.length === 0) {
            results.push({ userId, success: false, error: 'User not found in database' });
            continue;
          }

          const user = userData[0];
          
          // Add user to guild using their access token
          const addResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: user.access_token,
              roles: verifiedRoleId ? [verifiedRoleId] : []
            }),
          });

          if (addResponse.ok || addResponse.status === 204) {
            results.push({ userId, success: true, username: user.username });
          } else if (addResponse.status === 409) {
            // User already in server - try to add role
            const roleResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${verifiedRoleId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bot ${botToken}`,
              },
            });
            
            if (roleResponse.ok || roleResponse.status === 204) {
              results.push({ userId, success: true, username: user.username, note: 'Role added (user already in server)' });
            } else {
              results.push({ userId, success: false, error: 'User already in server, failed to add role' });
            }
          } else {
            const errorText = await addResponse.text();
            results.push({ 
              userId, 
              success: false, 
              error: `Discord API error: ${addResponse.status} - ${errorText}` 
            });
          }
        } catch (error) {
          results.push({ 
            userId, 
            success: false, 
            error: `Error: ${error.message}` 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Successfully pulled ${successCount}/${userIds.length} users to server`,
        results
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Invalid action'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Admin API Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: `Server error: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});