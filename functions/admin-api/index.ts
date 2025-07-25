import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk";

const blink = createClient({
  projectId: Deno.env.get('BLINK_PROJECT_ID')!,
  authRequired: false
});

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(req.url);
    
    if (req.method === 'GET') {
      // Handle GET requests for stats and verified users
      const action = url.searchParams.get('action');
      
      if (action === 'getStats') {
        const verifiedUsers = await blink.db.verifiedUsers.list();
        return new Response(JSON.stringify({
          total: verifiedUsers.length,
          recent: verifiedUsers.slice(-10).map(user => ({
            user_id: user.userId,
            username: user.username,
            verified_at: user.verifiedAt
          }))
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      if (action === 'getVerifiedUsers') {
        const verifiedUsers = await blink.db.verifiedUsers.list({
          orderBy: { verifiedAt: 'desc' }
        });
        
        return new Response(JSON.stringify({
          users: verifiedUsers.map(user => ({
            id: user.id,
            user_id: user.userId,
            username: user.username,
            avatar_url: user.avatarUrl,
            verified_at: user.verifiedAt,
            has_access_token: !!user.accessToken
          }))
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();
      
      // Verify admin authentication for POST requests
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const ownerKey = Deno.env.get('OWNER_LOGIN_KEY');
      const adminKey = Deno.env.get('ADMIN_LOGIN_KEY');
      
      const isOwner = token === ownerKey;
      const isAdmin = token === adminKey || isOwner;

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      if (body.action === 'stats') {
        const verifiedUsers = await blink.db.verifiedUsers.list();
        return new Response(JSON.stringify({
          success: true,
          total: verifiedUsers.length,
          recent_verifications: verifiedUsers.slice(-10).map(user => ({
            username: user.username,
            verified_at: user.verifiedAt
          }))
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      if (body.action === 'getVerifiedUsers') {
        const verifiedUsers = await blink.db.verifiedUsers.list({
          orderBy: { verifiedAt: 'desc' }
        });
        
        return new Response(JSON.stringify({
          success: true,
          users: verifiedUsers.map(user => ({
            id: user.id,
            user_id: user.userId,
            username: user.username,
            avatar_url: user.avatarUrl,
            verified_at: user.verifiedAt,
            has_access_token: !!user.accessToken
          }))
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      if (body.action === 'pullUsers') {
        const { guild_id } = body;

        if (!guild_id) {
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

        const verifiedUsers = await blink.db.verifiedUsers.list();
        const results = [];

        for (const user of verifiedUsers) {
          if (!user.accessToken) {
            results.push({
              user_id: user.userId,
              username: user.username,
              success: false,
              error: 'No access token available'
            });
            continue;
          }

          try {
            // Add user to guild using their access token
            const response = await fetch(`https://discord.com/api/guilds/${guild_id}/members/${user.userId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bot ${Deno.env.get('DISCORD_BOT_TOKEN')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                access_token: user.accessToken,
                roles: [Deno.env.get('DISCORD_VERIFIED_ROLE_ID')]
              }),
            });

            if (response.ok || response.status === 204) {
              results.push({
                user_id: user.userId,
                username: user.username,
                success: true,
                error: null
              });
            } else {
              const errorText = await response.text();
              results.push({
                user_id: user.userId,
                username: user.username,
                success: false,
                error: `Discord API error: ${response.status} - ${errorText}`
              });
            }
          } catch (error) {
            results.push({
              user_id: user.userId,
              username: user.username,
              success: false,
              error: error.message
            });
          }

          // Rate limiting - wait between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return new Response(JSON.stringify({
          success: true,
          guild_id,
          total_users: verifiedUsers.length,
          successful_pulls: results.filter(r => r.success).length,
          failed_pulls: results.filter(r => !r.success).length,
          results
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      if (body.action === 'removeUser') {
        // Remove verified user (owner only)
        if (!isOwner) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Owner access required' 
          }), { 
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        const { user_id } = body;

        if (!user_id) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'User ID is required' 
          }), { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        // Find and delete the user
        const verifiedUsers = await blink.db.verifiedUsers.list({
          where: { userId: user_id }
        });

        if (verifiedUsers.length === 0) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'User not found' 
          }), { 
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        await blink.db.verifiedUsers.delete(verifiedUsers[0].id);

        return new Response(JSON.stringify({
          success: true,
          message: `Removed user ${user_id}`
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { 
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Internal server error: ${error.message}` 
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});