import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Trash2, Users, Server, Shield, LogOut, Download } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

interface VerifiedUser {
  id: string;
  userId: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  accessToken: string;
  verifiedAt: string;
  serverName?: string;
}

interface SecureAdminDashboardProps {
  role: 'owner' | 'admin';
  onLogout: () => void;
}

export default function SecureAdminDashboard({ role, onLogout }: SecureAdminDashboardProps) {
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [guildId, setGuildId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const API_BASE = 'https://7tk0rize--admin-api.functions.blink.new';

  const showMessage = useCallback((msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  }, []);

  const loadVerifiedUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}?action=getVerifiedUsers`);
      const data = await response.json();
      
      if (data.success) {
        setVerifiedUsers(data.users || []);
        showMessage(`Loaded ${data.count || 0} verified users`, 'success');
      } else {
        showMessage(`Failed to load users: ${data.message}`, 'error');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showMessage('Failed to connect to admin API', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage, API_BASE]);

  useEffect(() => {
    loadVerifiedUsers();
  }, [loadVerifiedUsers]);

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === verifiedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(verifiedUsers.map(u => u.userId)));
    }
  };

  const removeUser = async (userId: string) => {
    if (role !== 'owner') {
      showMessage('Only owners can remove users', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}?action=removeUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });

      const data = await response.json();
      if (data.success) {
        setVerifiedUsers(prev => prev.filter(u => u.userId !== userId));
        setSelectedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        showMessage('User removed successfully', 'success');
      } else {
        showMessage(`Failed to remove user: ${data.message}`, 'error');
      }
    } catch (error) {
      showMessage('Error removing user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pullUsersToServer = async () => {
    if (!guildId.trim()) {
      showMessage('Please enter a Guild ID', 'error');
      return;
    }

    if (selectedUsers.size === 0) {
      showMessage('Please select users to pull', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}?action=pullUsers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: guildId.trim(),
          userIds: Array.from(selectedUsers)
        })
      });

      const data = await response.json();
      if (data.success) {
        showMessage(data.message, 'success');
        setSelectedUsers(new Set());
        setGuildId('');
      } else {
        showMessage(`Failed to pull users: ${data.message}`, 'error');
      }
    } catch (error) {
      showMessage('Error pulling users to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async () => {
    if (role !== 'owner') {
      showMessage('Only owners can export user data', 'error');
      return;
    }

    try {
      setLoading(true);
      const authKey = sessionStorage.getItem('adminAuthKey');
      const response = await fetch(`https://7tk0rize--export-data.functions.blink.new?key=${authKey}`);
      const data = await response.json();
      
      if (data.success) {
        // Create downloadable JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `verified_users_with_tokens_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage(`Exported ${data.count} verified users with access tokens!`, 'success');
      } else {
        showMessage(`Export failed: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showMessage('Failed to export data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (user: VerifiedUser) => {
    if (!user.avatar) return '/default-avatar.png';
    const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.${extension}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Shield className="h-8 w-8 text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-purple-300">
                Logged in as {role === 'owner' ? 'Owner' : 'Admin'}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            {role === 'owner' && (
              <Button 
                onClick={exportUserData}
                variant="outline"
                disabled={loading}
                className="border-green-500 text-green-300 hover:bg-green-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            )}
            <Button 
              onClick={onLogout}
              variant="outline"
              className="border-purple-500 text-purple-300 hover:bg-purple-800"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <Alert className={`mb-6 ${messageType === 'error' ? 'border-red-500 bg-red-900/20' : 'border-green-500 bg-green-900/20'}`}>
            <AlertDescription className={messageType === 'error' ? 'text-red-300' : 'text-green-300'}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800/50 border-purple-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-300">Total Verified Users</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{verifiedUsers.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-purple-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-300">Selected Users</CardTitle>
              <Server className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{selectedUsers.size}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-purple-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-300">Your Role</CardTitle>
              <Shield className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white capitalize">{role}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pull Users Section */}
        <Card className="bg-gray-800/50 border-purple-500/30 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Pull Users to Server</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <Input
                placeholder="Enter Guild/Server ID"
                value={guildId}
                onChange={(e) => setGuildId(e.target.value)}
                className="bg-gray-700 border-purple-500/30 text-white placeholder-gray-400"
              />
              <Button
                onClick={pullUsersToServer}
                disabled={loading || selectedUsers.size === 0 || !guildId.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Pull {selectedUsers.size} Users
              </Button>
            </div>
            <p className="text-sm text-purple-300">
              Select users below and enter a Guild ID to add them to that server with the verified role.
            </p>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-gray-800/50 border-purple-500/30">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">Verified Users</CardTitle>
              <div className="flex space-x-2">
                <Button
                  onClick={selectAllUsers}
                  variant="outline"
                  size="sm"
                  className="border-purple-500 text-purple-300 hover:bg-purple-800"
                >
                  {selectedUsers.size === verifiedUsers.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  onClick={loadVerifiedUsers}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="border-purple-500 text-purple-300 hover:bg-purple-800"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && verifiedUsers.length === 0 ? (
              <div className="text-center py-8 text-purple-300">Loading verified users...</div>
            ) : verifiedUsers.length === 0 ? (
              <div className="text-center py-8 text-purple-300">No verified users found</div>
            ) : (
              <div className="space-y-3">
                {verifiedUsers.map((user) => (
                  <div
                    key={user.userId}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${
                      selectedUsers.has(user.userId)
                        ? 'bg-purple-900/30 border-purple-500'
                        : 'bg-gray-700/30 border-gray-600 hover:border-purple-500/50'
                    }`}
                    onClick={() => toggleUserSelection(user.userId)}
                  >
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.userId)}
                        onChange={() => toggleUserSelection(user.userId)}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                      />
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
                        <div className="text-sm text-gray-400">ID: {user.userId}</div>
                        {user.serverName && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {user.serverName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-400">
                        {new Date(user.verifiedAt).toLocaleDateString()}
                      </div>
                      {role === 'owner' && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeUser(user.userId);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-red-500 text-red-400 hover:bg-red-900/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}