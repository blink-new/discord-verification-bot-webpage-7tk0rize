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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
      console.error('Missing authorization code');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/verification-failed?error=missing_code`,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log('Processing Discord OAuth callback...');

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('DISCORD_CLIENT_ID')!,
        client_secret: Deno.env.get('DISCORD_CLIENT_SECRET')!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${url.origin}/api/discord/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/verification-failed?error=token_exchange`,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('User fetch failed:', errorText);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/verification-failed?error=user_fetch`,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const userData = await userResponse.json();
    console.log('User data fetched:', userData.username);

    // Store verified user in database
    const verifiedUser = {
      id: `verified_${userData.id}_${Date.now()}`,
      userId: userData.id,
      username: userData.username,
      discriminator: userData.discriminator || '0',
      avatarUrl: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await blink.db.verifiedUsers.create(verifiedUser);
    console.log('User stored in database:', userData.username);

    // Redirect to success page
    const redirectUrl = `${url.origin}/verification-success?user=${encodeURIComponent(userData.username)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Discord callback error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${url.origin}/verification-failed?error=server_error`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});