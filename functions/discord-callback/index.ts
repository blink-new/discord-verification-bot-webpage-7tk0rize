import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk";

const blink = createClient({
  projectId: Deno.env.get('BLINK_PROJECT_ID'),
  authRequired: false
});

const DISCORD_CLIENT_ID = '1397971356490006558';
const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET');
const REDIRECT_URI = 'https://discord-verification-bot-webpage-7tk0rize.sites.blink.new/callback';

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
    const serverId = url.searchParams.get('state'); // Server ID passed as state

    if (!code) {
      return new Response(JSON.stringify({ error: 'No authorization code provided' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user information
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data');
    }

    const userData = await userResponse.json();

    // Store verified user in database
    await blink.db.verifiedUsers.create({
      id: `user_${userData.id}`,
      userId: userData.id,
      username: userData.username,
      avatarUrl: userData.avatar 
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
        : null,
      accessToken: accessToken,
      verifiedAt: new Date().toISOString()
    });

    // Return success response with redirect
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Successful</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #5865F2 0%, #57F287 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            margin: 1rem;
          }
          .success-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            color: #2C2F33;
            margin-bottom: 1rem;
            font-size: 1.5rem;
          }
          p {
            color: #72767D;
            margin-bottom: 1.5rem;
            line-height: 1.5;
          }
          .user-info {
            background: #F2F3F5;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
          }
          .avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            margin-bottom: 0.5rem;
          }
          .close-btn {
            background: #5865F2;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s;
          }
          .close-btn:hover {
            background: #4752C4;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Verification Successful!</h1>
          <div class="user-info">
            ${userData.avatar ? `<img src="https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png" alt="Avatar" class="avatar">` : ''}
            <div><strong>${userData.username}</strong></div>
            <div style="font-size: 0.9em; color: #72767D;">ID: ${userData.id}</div>
          </div>
          <p>You have been successfully verified! You can now close this window and return to Discord.</p>
          <button class="close-btn" onclick="window.close()">Close Window</button>
        </div>
        <script>
          // Auto-close after 5 seconds
          setTimeout(() => {
            window.close();
          }, 5000);
        </script>
      </body>
      </html>
    `;

    return new Response(successHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Callback error:', error);
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Failed</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #ED4245 0%, #FEE75C 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            margin: 1rem;
          }
          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            color: #2C2F33;
            margin-bottom: 1rem;
            font-size: 1.5rem;
          }
          p {
            color: #72767D;
            margin-bottom: 1.5rem;
            line-height: 1.5;
          }
          .retry-btn {
            background: #ED4245;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            text-decoration: none;
            display: inline-block;
            transition: background 0.2s;
          }
          .retry-btn:hover {
            background: #C73E3E;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">❌</div>
          <h1>Verification Failed</h1>
          <p>There was an error during the verification process. Please try again.</p>
          <a href="/" class="retry-btn">Try Again</a>
        </div>
      </body>
      </html>
    `;

    return new Response(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});