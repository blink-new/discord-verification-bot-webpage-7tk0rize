import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users, Server, UserCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@blinkdotnew/sdk';

const blink = createClient({
  projectId: 'discord-verification-bot-webpage-7tk0rize',
  authRequired: false
});

interface VerifiedUser {
  id: string;
  user_id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  access_token: string;
  refresh_token: string;
  verified_at: string;
  server_id: string;
  server_name: string;
  created_at: string;
  updated_at: string;
}

interface SecureAdminDashboardProps {
  userRole: 'owner' | 'admin';
  onLogout: () => void;
}

export default function SecureAdminDashboard({ userRole, onLogout }: SecureAdminDashboardProps) {
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pullGuildId, setPullGuildId] = useState('');
  const [pullLoading, setPullLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ total: 0, recent: 0 });

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load verified users
      const users = await blink.db.verified_users.list({
        orderBy: { verified_at: 'desc' }
      });
      
      setVerifiedUsers(users);
      
      // Calculate stats
      const total = users.length;
      const recent = users.filter(user => {
        const verifiedDate = new Date(user.verified_at);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return verifiedDate > dayAgo;
      }).length;
      
      setStats({ total, recent });
      
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePullUsers = async () => {
    if (!pullGuildId.trim()) {
      setMessage('Please enter a Guild ID');
      return;
    }

    setPullLoading(true);
    setMessage('');

    try {
      const response = await fetch(`https://blink-deploy.com/functions/discord-verification-bot-webpage-7tk0rize/admin-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'pull_users',
          guildId: pullGuildId.trim(),
          userRole
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Successfully pulled ${result.pulledCount} users to server ${pullGuildId}`);
        setPullGuildId('');
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error pulling users:', error);
      setMessage('❌ Error pulling users to server');
    } finally {
      setPullLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (userRole !== 'owner') {
      setMessage('❌ Only owners can remove verified users');
      return;
    }

    try {
      await blink.db.verified_users.delete(userId);
      setMessage('✅ User removed successfully');
      loadData(); // Reload data
    } catch (error) {
      console.error('Error removing user:', error);
      setMessage('❌ Error removing user');
    }
  };

  const getAvatarUrl = (user: VerifiedUser) => {
    if (!user.avatar) return '/default-avatar.png';
    const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.user_id}/${user.avatar}.${extension}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2C2F33] flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2C2F33] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">
              Logged in as: <Badge variant={userRole === 'owner' ? 'destructive' : 'secondary'}>
                {userRole.toUpperCase()}
              </Badge>
            </p>
          </div>
          <Button onClick={onLogout} variant="outline">
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-[#36393F] border-gray-600">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Verified Users</CardTitle>
              <Users className="h-4 w-4 text-[#5865F2]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#36393F] border-gray-600">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Verified Today</CardTitle>
              <UserCheck className="h-4 w-4 text-[#57F287]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.recent}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pull Users Section */}
        <Card className="bg-[#36393F] border-gray-600 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Server className="h-5 w-5" />
              Pull Verified Users to Server
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter a Guild ID to pull all verified users to that Discord server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter Guild ID (e.g., 1234567890123456789)"
                value={pullGuildId}
                onChange={(e) => setPullGuildId(e.target.value)}
                className="bg-[#2C2F33] border-gray-600 text-white flex-1"
              />
              <Button 
                onClick={handlePullUsers}
                disabled={pullLoading || !pullGuildId.trim()}
                className="bg-[#5865F2] hover:bg-[#4752C4]"
              >
                {pullLoading ? 'Pulling...' : `Pull ${stats.total} Users`}
              </Button>
            </div>
            
            {message && (
              <Alert className={`${message.includes('✅') ? 'border-green-500' : 'border-red-500'} bg-[#2C2F33]`}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-white">
                  {message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Verified Users List */}
        <Card className="bg-[#36393F] border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Verified Users ({verifiedUsers.length})</CardTitle>
            <CardDescription className="text-gray-400">
              All users who have completed Discord verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {verifiedUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No verified users found
                </div>
              ) : (
                verifiedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-[#2C2F33] rounded-lg">
                    <div className="flex items-center gap-4">
                      <img
                        src={getAvatarUrl(user)}
                        alt={`${user.username}'s avatar`}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-avatar.png';
                        }}
                      />
                      <div>
                        <div className="font-medium text-white">
                          {user.username}
                          {user.discriminator !== '0' && (
                            <span className="text-gray-400">#{user.discriminator}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          ID: {user.user_id}
                        </div>
                        <div className="text-xs text-gray-500">
                          Verified: {new Date(user.verified_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-[#57F287] text-black">
                        Verified
                      </Badge>
                      {userRole === 'owner' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveUser(user.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}