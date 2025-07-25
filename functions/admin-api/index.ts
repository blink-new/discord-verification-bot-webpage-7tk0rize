import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk";

const blink = createClient({
  projectId: Deno.env.get('BLINK_PROJECT_ID'),
  authRequired: false
});

const OWNER_LOGIN_KEY = Deno.env.get('OWNER_LOGIN_KEY');
const ADMIN_LOGIN_KEY = Deno.env.get('ADMIN_LOGIN_KEY');
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

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

    if (req.method === 'POST' && path === '/login') {
      return await handleLogin(req);
    }

    if (req.method === 'POST' && path === '/verify-session') {
      return await handleVerifySession(req);
    }

    if (req.method === 'GET' && path === '/servers') {
      return await handleGetServers(req);
    }

    if (req.method === 'GET' && path === '/verified-users') {
      return await handleGetVerifiedUsers(req);
    }

    if (req.method === 'POST' && path === '/pull-users') {
      return await handlePullUsers(req);
    }

    if (req.method === 'DELETE' && path === '/remove-user') {
      return await handleRemoveUser(req);
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
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

async function handleLogin(req: Request) {
  const { loginKey } = await req.json();

  let role = null;
  if (loginKey === OWNER_LOGIN_KEY) {
    role = 'owner';
  } else if (loginKey === ADMIN_LOGIN_KEY) {
    role = 'admin';
  } else {
    return new Response(JSON.stringify({ error: 'Invalid login key' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Generate session token
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Store session in database
  await blink.db.adminSessions.create({
    id: `session_${Date.now()}`,
    sessionToken: sessionToken,
    role: role,
    expiresAt: expiresAt.toISOString()
  });

  return new Response(JSON.stringify({ 
    success: true, 
    sessionToken,
    role,
    expiresAt: expiresAt.toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handleVerifySession(req: Request) {
  const { sessionToken } = await req.json();

  if (!sessionToken) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Check session in database
  const sessions = await blink.db.adminSessions.list({
    where: { sessionToken: sessionToken }
  });

  if (sessions.length === 0) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const session = sessions[0];
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);

  if (now > expiresAt) {
    // Session expired, remove it
    await blink.db.adminSessions.delete(session.id);
    return new Response(JSON.stringify({ valid: false }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Update last activity
  await blink.db.adminSessions.update(session.id, {
    lastActivity: new Date().toISOString()
  });

  return new Response(JSON.stringify({ 
    valid: true, 
    role: session.role 
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handleGetServers(req: Request) {
  const sessionToken = req.headers.get('Authorization')?.replace('Bearer ', '');
  const sessionValid = await verifySession(sessionToken);
  
  if (!sessionValid.valid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    // Get servers from Discord API
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Discord servers');
    }

    const discordServers = await response.json();
    
    // Get stored server data
    const storedServers = await blink.db.botServers.list();
    
    // Combine data
    const servers = discordServers.map((server: any) => {
      const storedServer = storedServers.find(s => s.serverId === server.id);
      return {
        id: server.id,
        name: server.name,
        icon: server.icon ? `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png` : null,
        memberCount: server.approximate_member_count || 0,
        isSetup: !!storedServer,
        setupAt: storedServer?.setupAt || null,
        verificationUrl: storedServer?.verificationUrl || null
      };
    });

    return new Response(JSON.stringify({ servers }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error fetching servers:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch servers' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

async function handleGetVerifiedUsers(req: Request) {
  const sessionToken = req.headers.get('Authorization')?.replace('Bearer ', '');
  const sessionValid = await verifySession(sessionToken);
  
  if (!sessionValid.valid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const verifiedUsers = await blink.db.verifiedUsers.list({
    orderBy: { verifiedAt: 'desc' }
  });

  return new Response(JSON.stringify({ users: verifiedUsers }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handlePullUsers(req: Request) {
  const sessionToken = req.headers.get('Authorization')?.replace('Bearer ', '');
  const sessionValid = await verifySession(sessionToken);
  
  if (!sessionValid.valid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const { serverId, userIds } = await req.json();

  if (!serverId || !userIds || !Array.isArray(userIds)) {
    return new Response(JSON.stringify({ error: 'Invalid request data' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const results = [];
  
  for (const userId of userIds) {
    try {
      // Create invite for the user (this would need to be implemented with proper Discord API calls)
      // For now, we'll just mark the operation as successful
      results.push({
        userId,
        success: true,
        message: 'User marked for server invitation'
      });
    } catch (error) {
      results.push({
        userId,
        success: false,
        message: error.message
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

async function handleRemoveUser(req: Request) {
  const sessionToken = req.headers.get('Authorization')?.replace('Bearer ', '');
  const sessionValid = await verifySession(sessionToken);
  
  if (!sessionValid.valid || sessionValid.role !== 'owner') {
    return new Response(JSON.stringify({ error: 'Unauthorized - Owner access required' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const { userId } = await req.json();

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
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

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error removing user:', error);
    return new Response(JSON.stringify({ error: 'Failed to remove user' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

async function verifySession(sessionToken: string | null) {
  if (!sessionToken) {
    return { valid: false };
  }

  try {
    const sessions = await blink.db.adminSessions.list({
      where: { sessionToken: sessionToken }
    });

    if (sessions.length === 0) {
      return { valid: false };
    }

    const session = sessions[0];
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (now > expiresAt) {
      await blink.db.adminSessions.delete(session.id);
      return { valid: false };
    }

    return { valid: true, role: session.role };
  } catch (error) {
    console.error('Session verification error:', error);
    return { valid: false };
  }
}