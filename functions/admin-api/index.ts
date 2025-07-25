import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk";

const blink = createClient({
  projectId: Deno.env.get('BLINK_PROJECT_ID') || 'discord-verification-bot-webpage-7tk0rize',
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

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // Get verification statistics
    if (path === '/stats' && req.method === 'GET') {
      const totalResult = await blink.db.verifiedUsers.list({
        select: ['id']
      });
      
      const today = new Date().toISOString().split('T')[0];
      const todayResult = await blink.db.verifiedUsers.list({
        where: { verifiedAt: { gte: today } },
        select: ['id']
      });
      
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const weekResult = await blink.db.verifiedUsers.list({
        where: { verifiedAt: { gte: weekAgo } },
        select: ['id']
      });
      
      const recentResult = await blink.db.verifiedUsers.list({
        orderBy: { verifiedAt: 'desc' },
        limit: 5,
        select: ['username', 'verifiedAt']
      });

      return new Response(JSON.stringify({
        total: totalResult.length,
        today: todayResult.length,
        week: weekResult.length,
        recent: recentResult
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get all verified users
    if (path === '/verified-users' && req.method === 'GET') {
      const users = await blink.db.verifiedUsers.list({
        orderBy: { verifiedAt: 'desc' }
      });

      return new Response(JSON.stringify({
        users: users
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Check if specific user is verified
    if (path.startsWith('/check-user/') && req.method === 'GET') {
      const userId = path.split('/')[2];
      
      const user = await blink.db.verifiedUsers.list({
        where: { userId: userId },
        limit: 1
      });

      return new Response(JSON.stringify({
        verified: user.length > 0,
        user: user[0] || null
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Admin authentication and management
    if (path === '/admin/auth' && req.method === 'POST') {
      const body = await req.json();
      const { loginKey } = body;

      const ownerKey = Deno.env.get('OWNER_LOGIN_KEY');
      const adminKey = Deno.env.get('ADMIN_LOGIN_KEY');

      let role = null;
      if (loginKey === ownerKey) {
        role = 'OWNER';
      } else if (loginKey === adminKey) {
        role = 'ADMIN';
      }

      if (!role) {
        return new Response(JSON.stringify({ error: 'Invalid login key' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        role: role,
        token: `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get admin dashboard data
    if (path === '/admin/dashboard' && req.method === 'GET') {
      const users = await blink.db.verifiedUsers.list({
        orderBy: { verifiedAt: 'desc' }
      });

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const todayCount = users.filter(u => u.verifiedAt?.startsWith(today)).length;
      const weekCount = users.filter(u => u.verifiedAt && u.verifiedAt >= weekAgo).length;

      return new Response(JSON.stringify({
        stats: {
          total: users.length,
          today: todayCount,
          week: weekCount
        },
        users: users
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Pull users to server
    if (path === '/admin/pull' && req.method === 'POST') {
      const body = await req.json();
      const { guildId, selectedUsers } = body;

      if (!guildId) {
        return new Response(JSON.stringify({ error: 'Guild ID is required' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Get users to pull (either selected users or all verified users)
      let usersToPull;
      if (selectedUsers && selectedUsers.length > 0) {
        usersToPull = await blink.db.verifiedUsers.list({
          where: { 
            userId: { in: selectedUsers }
          }
        });
      } else {
        usersToPull = await blink.db.verifiedUsers.list();
      }

      // In a real implementation, you would use Discord API to create invites
      // For now, we'll return the users that would be pulled
      return new Response(JSON.stringify({
        success: true,
        message: `Would pull ${usersToPull.length} users to guild ${guildId}`,
        users: usersToPull,
        guildId: guildId
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Delete verified user (OWNER only)
    if (path.startsWith('/admin/users/') && req.method === 'DELETE') {
      const userId = path.split('/')[3];
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader || !authHeader.startsWith('OWNER-')) {
        return new Response(JSON.stringify({ error: 'Owner access required' }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Find and delete the user
      const users = await blink.db.verifiedUsers.list({
        where: { userId: userId }
      });

      if (users.length === 0) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      await blink.db.verifiedUsers.delete(users[0].id);

      return new Response(JSON.stringify({
        success: true,
        message: 'User deleted successfully'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});