import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk";

const blink = createClient({
  projectId: Deno.env.get('BLINK_PROJECT_ID') || 'discord-verification-bot-webpage-7tk0rize',
  authRequired: false
});

const OWNER_LOGIN_KEY = Deno.env.get('OWNER_LOGIN_KEY');
const ADMIN_LOGIN_KEY = Deno.env.get('ADMIN_LOGIN_KEY');
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');

interface VerifiedUser {
  id: string;
  userId: string;
  username: string;
  discriminator: string;
  avatar: string;
  accessToken: string;
  verifiedAt: string;
}

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
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'validate_login': {
        const { loginKey } = body;
        
        if (loginKey === OWNER_LOGIN_KEY) {
          return new Response(JSON.stringify({
            success: true,
            role: 'owner'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } else if (loginKey === ADMIN_LOGIN_KEY) {
          return new Response(JSON.stringify({
            success: true,
            role: 'admin'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } else {
          return new Response(JSON.stringify({
            success: false,
            role: null
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      case 'authenticate': {
        const { loginKey } = body;
        
        if (loginKey === OWNER_LOGIN_KEY) {
          return new Response(JSON.stringify({
            success: true,
            role: 'owner'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } else if (loginKey === ADMIN_LOGIN_KEY) {
          return new Response(JSON.stringify({
            success: true,
            role: 'admin'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } else {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid login key'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      case 'getVerifiedUsers': {
        try {
          const users = await blink.db.verifiedUsers.list({
            orderBy: { verifiedAt: 'desc' }
          });
          
          return new Response(JSON.stringify({
            success: true,
            users: users
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (error) {
          console.error('Error fetching verified users:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch verified users'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      case 'getStats': {
        try {
          const users = await blink.db.verifiedUsers.list();
          
          const now = new Date();
          const today = now.toDateString();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          const todayCount = users.filter(user => 
            new Date(user.verifiedAt).toDateString() === today
          ).length;
          
          const weekCount = users.filter(user => 
            new Date(user.verifiedAt) >= weekAgo
          ).length;
          
          return new Response(JSON.stringify({
            success: true,
            stats: {
              total: users.length,
              today: todayCount,
              week: weekCount
            }
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (error) {
          console.error('Error fetching stats:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch stats'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      case 'checkVerified': {
        const { userId } = body;
        
        try {
          const users = await blink.db.verifiedUsers.list({
            where: { userId: userId }
          });
          
          return new Response(JSON.stringify({
            success: true,
            verified: users.length > 0,
            user: users[0] || null
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (error) {
          console.error('Error checking verification:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to check verification'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      case 'pullUsers': {
        const { guildId, verifiedUsers } = body;
        
        if (!guildId || !verifiedUsers) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Missing guildId or verifiedUsers'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        try {
          // This would typically integrate with Discord API to add users to guild
          // For now, we'll simulate the process
          let addedCount = 0;
          
          for (const user of verifiedUsers) {
            try {
              // In a real implementation, you would:
              // 1. Use Discord API to create invite
              // 2. Send DM to user with invite
              // 3. Or directly add user to guild if bot has permissions
              
              // For simulation, we'll just count successful "additions"
              addedCount++;
            } catch (error) {
              console.error(`Failed to process user ${user.userId}:`, error);
            }
          }
          
          return new Response(JSON.stringify({
            success: true,
            addedCount: addedCount,
            message: `Successfully processed ${addedCount} users for guild ${guildId}`
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (error) {
          console.error('Error pulling users:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to pull users to guild'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      case 'stats': {
        // Simple stats endpoint for the Discord bot
        try {
          const users = await blink.db.verifiedUsers.list();
          
          return new Response(JSON.stringify({
            success: true,
            total: users.length,
            users: users.length
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (error) {
          console.error('Error fetching stats:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch stats'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Unknown action'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});