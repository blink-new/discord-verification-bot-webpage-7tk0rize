import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk";

const blink = createClient({
  projectId: Deno.env.get("BLINK_PROJECT_ID") || "",
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
    
    // Verify owner authentication
    const ownerKey = Deno.env.get("OWNER_LOGIN_KEY");
    if (!authKey || authKey !== ownerKey) {
      return new Response(JSON.stringify({
        success: false,
        error: "Unauthorized - Owner access required"
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

    // Format the export data with all information including access tokens
    const exportData = {
      success: true,
      exportedAt: new Date().toISOString(),
      count: users.length,
      users: users.map(user => ({
        userId: user.user_id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        accessToken: user.access_token, // Include access token for owner export
        verifiedAt: user.verified_at,
        email: user.email || null,
        globalName: user.global_name || null
      })),
      // Additional metadata
      metadata: {
        totalUsers: users.length,
        usersWithTokens: users.filter(u => u.access_token).length,
        exportFormat: "JSON",
        includesAccessTokens: true,
        warning: "This export contains sensitive access tokens. Keep secure!"
      }
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': `attachment; filename="verified_users_with_tokens_${new Date().toISOString().split('T')[0]}.json"`
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to export user data",
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