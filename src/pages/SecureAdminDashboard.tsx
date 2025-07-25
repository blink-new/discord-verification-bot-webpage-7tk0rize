import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Server, Trash2, UserPlus, RefreshCw, LogOut, Crown, UserCheck } from 'lucide-react';

interface VerifiedUser {
  id: string;
  user_id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  access_token: string;
  verified_at: string;
  server_id?: string;
  server_name?: string;
}

interface DiscordServer {
  id: string;
  name: string;
  icon: string;
  memberCount: number;
  botPermissions: string[];
}

interface SecureAdminDashboardProps {
  adminRole: 'owner' | 'admin';
  onLogout: () => void;
}

export default function SecureAdminDashboard({ adminRole, onLogout }: SecureAdminDashboardProps) {
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [servers, setServers] = useState<DiscordServer[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load verified users
      const usersResponse = await fetch('https://7tk0rize--admin-api.functions.blink.new?action=getVerifiedUsers');
      if (!usersResponse.ok) {
        throw new Error('Failed to load verified users');
      }
      const usersData = await usersResponse.json();
      
      // Transform the data to match our interface
      const transformedUsers = usersData.users.map((user: any) => ({
        id: user.id,
        user_id: user.user_id || user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        access_token: user.access_token,
        verified_at: user.verified_at,
        server_id: user.server_id,
        server_name: user.server_name
      }));
      
      setVerifiedUsers(transformedUsers);

      // Load Discord servers
      const serversResponse = await fetch('https://7tk0rize--admin-api.functions.blink.new?action=getServers');
      if (!serversResponse.ok) {
        throw new Error('Failed to load servers');
      }
      const serversData = await serversResponse.json();
      setServers(serversData.servers);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(verifiedUsers.map(user => user.user_id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handlePullUsers = async () => {
    if (!selectedServer || selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select a server and at least one user.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPulling(true);
      
      const response = await fetch('https://7tk0rize--admin-api.functions.blink.new?action=pullUsers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverId: selectedServer,
          userIds: selectedUsers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to pull users');
      }

      const result = await response.json();
      const successful = result.results.filter((r: any) => r.success).length;
      const failed = result.results.filter((r: any) => !r.success).length;

      toast({
        title: "Pull Complete",
        description: `Successfully pulled ${successful} users. ${failed > 0 ? `${failed} failed.` : ''}`,
      });

      // Clear selections
      setSelectedUsers([]);
      setSelectedServer('');

    } catch (error) {
      console.error('Error pulling users:', error);
      toast({
        title: "Error",
        description: "Failed to pull users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPulling(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (adminRole !== 'owner') {
      toast({
        title: "Access Denied",
        description: "Only owners can remove users.",
        variant: "destructive",
      });
      return;
    }

    try {
      setRemoving(userId);
      
      const response = await fetch('https://7tk0rize--admin-api.functions.blink.new?action=removeUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          adminRole,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove user');
      }

      toast({
        title: "Success",
        description: "User removed successfully.",
      });

      // Reload data
      await loadData();

    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemoving(null);
    }
  };

  const getAvatarUrl = (avatar: string | null, userId: string) => {
    if (!avatar) return null;
    if (avatar.startsWith('a_')) {
      return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.gif`;
    }
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const selectedServerName = servers.find(s => s.id === selectedServer)?.name || '';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2C2F33] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#5865F2] mx-auto mb-4" />
          <p className="text-gray-300">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2C2F33] text-white">
      {/* Header */}
      <div className="bg-[#23272A] border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Shield className="h-8 w-8 text-[#5865F2]" />
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-gray-400 flex items-center space-x-2">
                {adminRole === 'owner' ? (
                  <>
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span>Owner Access</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 text-blue-500" />
                    <span>Admin Access</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            className="border-gray-600 hover:bg-gray-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-[#23272A] border-gray-700">
            <TabsTrigger value="users" className="data-[state=active]:bg-[#5865F2]">
              <Users className="h-4 w-4 mr-2" />
              Verified Users ({verifiedUsers.length})
            </TabsTrigger>
            <TabsTrigger value="servers" className="data-[state=active]:bg-[#5865F2]">
              <Server className="h-4 w-4 mr-2" />
              Discord Servers ({servers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Pull Users Section */}
            <Card className="bg-[#23272A] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <UserPlus className="h-5 w-5 mr-2 text-[#57F287]" />
                  Pull Users to Server
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Select users and a server to add them with the verified role
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Server
                    </label>
                    <select
                      value={selectedServer}
                      onChange={(e) => setSelectedServer(e.target.value)}
                      className="w-full bg-[#2C2F33] border border-gray-600 rounded-md px-3 py-2 text-white"
                    >
                      <option value="">Choose a server...</option>
                      {servers.map((server) => (
                        <option key={server.id} value={server.id}>
                          {server.name} ({server.memberCount} members)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handlePullUsers}
                      disabled={!selectedServer || selectedUsers.length === 0 || pulling}
                      className="bg-[#57F287] hover:bg-[#4CAF50] text-black"
                    >
                      {pulling ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Pull {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}
                      {selectedServerName && ` to ${selectedServerName}`}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card className="bg-[#23272A] border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Verified Users</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedUsers.length === verifiedUsers.length && verifiedUsers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm text-gray-300">
                      Select All
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {verifiedUsers.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No verified users found.</p>
                  ) : (
                    verifiedUsers.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-4 bg-[#2C2F33] rounded-lg border border-gray-600"
                      >
                        <div className="flex items-center space-x-4">
                          <Checkbox
                            checked={selectedUsers.includes(user.user_id)}
                            onCheckedChange={(checked) => handleUserSelect(user.user_id, checked as boolean)}
                          />
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={getAvatarUrl(user.avatar, user.user_id) || undefined}
                              alt={user.username}
                            />
                            <AvatarFallback className="bg-[#5865F2] text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-white">
                              {user.username}
                              {user.discriminator !== '0' && (
                                <span className="text-gray-400">#{user.discriminator}</span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-400">ID: {user.user_id}</p>
                            <p className="text-xs text-gray-500">
                              Verified: {formatDate(user.verified_at)}
                            </p>
                            {user.server_name && (
                              <Badge variant="secondary" className="mt-1">
                                From: {user.server_name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {adminRole === 'owner' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={removing === user.user_id}
                              >
                                {removing === user.user_id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#23272A] border-gray-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Remove User</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  Are you sure you want to remove {user.username} from the verified users list?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-gray-600 hover:bg-gray-700 text-white border-gray-500">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveUser(user.user_id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="servers" className="space-y-6">
            <Card className="bg-[#23272A] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Discord Servers</CardTitle>
                <CardDescription className="text-gray-400">
                  Servers where the bot is currently active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {servers.length === 0 ? (
                    <p className="text-gray-400 col-span-full text-center py-8">
                      No servers found. Make sure the bot is added to Discord servers.
                    </p>
                  ) : (
                    servers.map((server) => (
                      <Card key={server.id} className="bg-[#2C2F33] border-gray-600">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            {server.icon ? (
                              <img
                                src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`}
                                alt={server.name}
                                className="w-12 h-12 rounded-full"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-[#5865F2] rounded-full flex items-center justify-center">
                                <Server className="h-6 w-6 text-white" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-white">{server.name}</h3>
                              <p className="text-sm text-gray-400">
                                {server.memberCount} members
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Bot Permissions:</p>
                            <div className="flex flex-wrap gap-1">
                              {server.botPermissions.length > 0 ? (
                                server.botPermissions.map((perm) => (
                                  <Badge key={perm} variant="outline" className="text-xs">
                                    {perm.replace(/_/g, ' ')}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  No special permissions
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}