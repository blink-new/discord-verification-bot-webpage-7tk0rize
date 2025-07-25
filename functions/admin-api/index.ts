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
    const path = url.pathname;

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const ownerKey = Deno.env.get('OWNER_LOGIN_KEY');
    const adminKey = Deno.env.get('ADMIN_LOGIN_KEY');
    
    const isOwner = token === ownerKey;
    const isAdmin = token === adminKey || isOwner;

    if (!isAdmin) {
      return new Response('Invalid credentials', { status: 403 });
    }

    if (path === '/stats' && req.method === 'GET') {
      // Get verification statistics
      const verifiedUsers = await blink.db.verifiedUsers.list();
      
      return new Response(JSON.stringify({
        total_verified: verifiedUsers.length,
        recent_verifications: verifiedUsers.slice(-10).map(user => ({
          username: user.username,
          verified_at: user.verified_at
        }))
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (path === '/verified-users' && req.method === 'GET') {
      // Get all verified users
      const verifiedUsers = await blink.db.verifiedUsers.list({
        orderBy: { verified_at: 'desc' }
      });
      
      return new Response(JSON.stringify({
        users: verifiedUsers.map(user => ({
          id: user.id,
          user_id: user.user_id,
          username: user.username,
          avatar_url: user.avatar_url,
          verified_at: user.verified_at,
          has_access_token: !!user.access_token
        }))
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (path === '/pull-users' && req.method === 'POST') {
      // Pull verified users to a Discord server
      const body = await req.json();
      const { guild_id } = body;

      if (!guild_id) {
        return new Response('Guild ID is required', { status: 400 });
      }

      const verifiedUsers = await blink.db.verifiedUsers.list();
      const results = [];

      for (const user of verifiedUsers) {
        if (!user.access_token) {
          results.push({
            user_id: user.user_id,
            username: user.username,
            success: false,
            error: 'No access token available'
          });
          continue;
        }

        try {
          // Add user to guild using their access token
          const response = await fetch(`https://discord.com/api/guilds/${guild_id}/members/${user.user_id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bot ${Deno.env.get('DISCORD_BOT_TOKEN')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: user.access_token,
              roles: [Deno.env.get('DISCORD_VERIFIED_ROLE_ID')]
            }),
          });

          if (response.ok || response.status === 204) {
            results.push({
              user_id: user.user_id,
              username: user.username,
              success: true,
              error: null
            });
          } else {
            const errorText = await response.text();
            results.push({
              user_id: user.user_id,
              username: user.username,
              success: false,
              error: `Discord API error: ${response.status} - ${errorText}`
            });
          }
        } catch (error) {
          results.push({
            user_id: user.user_id,
            username: user.username,
            success: false,
            error: error.message
          });
        }

        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return new Response(JSON.stringify({
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

    if (path === '/remove-user' && req.method === 'DELETE') {
      // Remove verified user (owner only)
      if (!isOwner) {
        return new Response('Owner access required', { status: 403 });
      }

      const body = await req.json();
      const { user_id } = body;

      if (!user_id) {
        return new Response('User ID is required', { status: 400 });
      }

      // Find and delete the user
      const verifiedUsers = await blink.db.verifiedUsers.list({
        where: { user_id }
      });

      if (verifiedUsers.length === 0) {
        return new Response('User not found', { status: 404 });
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

    return new Response('Not found', { status: 404 });

  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(`Internal server error: ${error.message}`, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});