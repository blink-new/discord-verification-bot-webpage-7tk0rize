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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const authKey = url.searchParams.get('key');

    // Verify authentication
    const ownerKey = Deno.env.get('OWNER_LOGIN_KEY');
    if (!authKey || authKey !== ownerKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized - Owner access required'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get all verified users with access tokens
    const users = await blink.db.verifiedUsers.list({
      orderBy: { verifiedAt: 'desc' }
    });

    // Format the data for export
    const exportData = {
      success: true,
      exportedAt: new Date().toISOString(),
      count: users.length,
      users: users.map(user => ({
        userId: user.user_id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        accessToken: user.access_token,
        verifiedAt: user.verified_at,
        // Additional metadata
        discordTag: user.discriminator !== '0' ? `${user.username}#${user.discriminator}` : user.username,
        avatarUrl: user.avatar ? 
          `https://cdn.discordapp.com/avatars/${user.user_id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}` : 
          null
      })),
      // Summary statistics
      stats: {
        totalUsers: users.length,
        usersWithAvatars: users.filter(u => u.avatar).length,
        oldestVerification: users.length > 0 ? users[users.length - 1].verified_at : null,
        newestVerification: users.length > 0 ? users[0].verified_at : null
      },
      // Instructions for using the data
      instructions: {
        accessTokenUsage: "Use the accessToken field to make Discord API calls on behalf of the user",
        discordApiBase: "https://discord.com/api/v10",
        exampleApiCall: "GET /users/@me with Authorization: Bearer {accessToken}",
        note: "Keep access tokens secure and never expose them publicly"
      }
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to export data: ' + error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});