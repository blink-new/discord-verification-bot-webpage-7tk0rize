import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { 
  Shield, 
  Users, 
  Server, 
  UserPlus, 
  Trash2, 
  LogOut, 
  Crown, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface AdminSession {
  role: 'owner' | 'admin'
  authenticated: boolean
  timestamp: number
}

interface VerifiedUser {
  id: string
  username: string
  discriminator: string
  avatar: string
  accessToken: string
  verifiedAt: string
}

interface DiscordServer {
  id: string
  name: string
  icon: string
  memberCount: number
  botPermissions: string[]
}

export default function SecureAdminDashboard() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([])
  const [servers, setServers] = useState<DiscordServer[]>([])
  const [selectedServer, setSelectedServer] = useState<string>('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string>('')
  const [removeUserId, setRemoveUserId] = useState('')
  const navigate = useNavigate()

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Get verified users
      const usersResponse = await fetch('https://7tk0rize--admin-api.functions.blink.new?action=getVerifiedUsers')
      const usersData = await usersResponse.json()
      
      if (usersData.error) {
        throw new Error(usersData.error)
      }
      
      // Get Discord servers
      const serversResponse = await fetch('https://7tk0rize--admin-api.functions.blink.new?action=getServers')
      const serversData = await serversResponse.json()
      
      if (serversData.error) {
        throw new Error(serversData.error)
      }
      
      setVerifiedUsers(usersData.users || [])
      setServers(serversData.servers || [])
    } catch (error) {
      console.error('Failed to load admin data:', error)
      toast.error('Failed to load admin data: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Check authentication on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('admin_session')
    if (!savedSession) {
      navigate('/admin')
      return
    }

    try {
      const parsedSession: AdminSession = JSON.parse(savedSession)
      const now = Date.now()
      const sessionAge = now - parsedSession.timestamp
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours

      if (sessionAge >= maxAge || !parsedSession.authenticated) {
        localStorage.removeItem('admin_session')
        navigate('/admin')
        return
      }

      setSession(parsedSession)
      loadData()
    } catch (e) {
      localStorage.removeItem('admin_session')
      navigate('/admin')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('admin_session')
    setSession(null)
    toast.success('Logged out successfully')
    navigate('/admin')
  }

  const handlePullUsers = async () => {
    if (!selectedServer || selectedUsers.length === 0) {
      toast.error('Please select a server and at least one user')
      return
    }

    setActionLoading('pulling')
    try {
      const response = await fetch('https://7tk0rize--admin-api.functions.blink.new?action=pullUsers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverId: selectedServer,
          userIds: selectedUsers
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      const successCount = data.results.filter((r: any) => r.success).length
      const failCount = data.results.filter((r: any) => !r.success).length

      if (successCount > 0) {
        toast.success(`Successfully pulled ${successCount} users to server`)
      }
      
      if (failCount > 0) {
        toast.error(`Failed to pull ${failCount} users. Check console for details.`)
        console.error('Pull failures:', data.results.filter((r: any) => !r.success))
      }

      setSelectedUsers([])
    } catch (error) {
      console.error('Error pulling users:', error)
      toast.error('Error pulling users to server: ' + error.message)
    } finally {
      setActionLoading('')
    }
  }

  const handleRemoveUser = async () => {
    if (!removeUserId || session?.role !== 'owner') {
      toast.error('Only owners can remove verified users')
      return
    }

    setActionLoading('removing')
    try {
      const response = await fetch('https://7tk0rize--admin-api.functions.blink.new?action=removeUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: removeUserId,
          adminRole: session.role
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      toast.success('User removed from verification database')
      setVerifiedUsers(prev => prev.filter(user => user.id !== removeUserId))
      setRemoveUserId('')
    } catch (error) {
      console.error('Error removing user:', error)
      toast.error('Error removing user: ' + error.message)
    } finally {
      setActionLoading('')
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  if (!session) {
    return <div>Redirecting...</div>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#23272A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#B9BBBE]">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#23272A] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#5865F2] rounded-lg">
              {session.role === 'owner' ? (
                <Crown className="h-6 w-6 text-white" />
              ) : (
                <Shield className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-[#B9BBBE]">
                Logged in as <Badge variant={session.role === 'owner' ? 'default' : 'secondary'}>
                  {session.role.toUpperCase()}
                </Badge>
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-[#40444B] text-[#B9BBBE] hover:bg-[#40444B]"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-[#2C2F33] border-[#40444B]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-[#57F287]" />
                <div>
                  <p className="text-2xl font-bold text-white">{verifiedUsers.length}</p>
                  <p className="text-[#B9BBBE] text-sm">Verified Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2C2F33] border-[#40444B]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Server className="h-8 w-8 text-[#5865F2]" />
                <div>
                  <p className="text-2xl font-bold text-white">{servers.length}</p>
                  <p className="text-[#B9BBBE] text-sm">Connected Servers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2C2F33] border-[#40444B]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <UserPlus className="h-8 w-8 text-[#FEE75C]" />
                <div>
                  <p className="text-2xl font-bold text-white">{selectedUsers.length}</p>
                  <p className="text-[#B9BBBE] text-sm">Selected for Pull</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pull" className="space-y-4">
          <TabsList className="bg-[#2C2F33] border-[#40444B]">
            <TabsTrigger value="pull" className="data-[state=active]:bg-[#5865F2]">
              Pull Users
            </TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-[#5865F2]">
              Manage Users
            </TabsTrigger>
            <TabsTrigger value="servers" className="data-[state=active]:bg-[#5865F2]">
              Server Status
            </TabsTrigger>
          </TabsList>

          {/* Pull Users Tab */}
          <TabsContent value="pull" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Server Selection */}
              <Card className="bg-[#2C2F33] border-[#40444B]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Server className="h-5 w-5 mr-2" />
                    Select Target Server
                  </CardTitle>
                  <CardDescription className="text-[#B9BBBE]">
                    Choose which server to pull verified users to
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {servers.map((server) => (
                    <div
                      key={server.id}
                      onClick={() => setSelectedServer(server.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedServer === server.id
                          ? 'border-[#5865F2] bg-[#5865F2]/10'
                          : 'border-[#40444B] hover:border-[#5865F2]/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center">
                          <Server className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{server.name}</p>
                          <p className="text-[#B9BBBE] text-sm">{server.memberCount} members</p>
                        </div>
                        {selectedServer === server.id && (
                          <CheckCircle className="h-5 w-5 text-[#57F287]" />
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* User Selection */}
              <Card className="bg-[#2C2F33] border-[#40444B]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Select Users to Pull
                  </CardTitle>
                  <CardDescription className="text-[#B9BBBE]">
                    Choose verified users to add to the selected server
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {verifiedUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedUsers.includes(user.id)
                          ? 'border-[#57F287] bg-[#57F287]/10'
                          : 'border-[#40444B] hover:border-[#57F287]/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#57F287] rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-black" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {user.username}#{user.discriminator}
                          </p>
                          <p className="text-[#B9BBBE] text-sm">
                            Verified: {new Date(user.verifiedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {selectedUsers.includes(user.id) && (
                          <CheckCircle className="h-5 w-5 text-[#57F287]" />
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Pull Action */}
            <Card className="bg-[#2C2F33] border-[#40444B]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      Ready to pull {selectedUsers.length} users to{' '}
                      {servers.find(s => s.id === selectedServer)?.name || 'selected server'}
                    </p>
                    <p className="text-[#B9BBBE] text-sm">
                      Users will be added to the server and assigned the verified role
                    </p>
                  </div>
                  <Button
                    onClick={handlePullUsers}
                    disabled={!selectedServer || selectedUsers.length === 0 || actionLoading === 'pulling'}
                    className="bg-[#57F287] hover:bg-[#3BA55C] text-black"
                  >
                    {actionLoading === 'pulling' ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Pulling...</span>
                      </div>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Pull Users
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Users Tab (Owner Only) */}
          <TabsContent value="manage" className="space-y-4">
            {session.role !== 'owner' ? (
              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-400">
                  Only owners can manage verified users. Contact the owner for user removal requests.
                </AlertDescription>
              </Alert>
            ) : (
              <Card className="bg-[#2C2F33] border-[#40444B]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Trash2 className="h-5 w-5 mr-2 text-red-400" />
                    Remove Verified User
                  </CardTitle>
                  <CardDescription className="text-[#B9BBBE]">
                    Permanently remove a user from the verification database
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter Discord User ID"
                      value={removeUserId}
                      onChange={(e) => setRemoveUserId(e.target.value)}
                      className="bg-[#40444B] border-[#40444B] text-white"
                    />
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          disabled={!removeUserId || actionLoading === 'removing'}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#2C2F33] border-[#40444B]">
                        <DialogHeader>
                          <DialogTitle className="text-white">Confirm User Removal</DialogTitle>
                          <DialogDescription className="text-[#B9BBBE]">
                            Are you sure you want to remove this user from the verification database?
                            This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" className="border-[#40444B]">
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleRemoveUser}
                            disabled={actionLoading === 'removing'}
                          >
                            {actionLoading === 'removing' ? 'Removing...' : 'Remove User'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Server Status Tab */}
          <TabsContent value="servers" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map((server) => (
                <Card key={server.id} className="bg-[#2C2F33] border-[#40444B]">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-[#5865F2] rounded-full flex items-center justify-center">
                        <Server className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{server.name}</h3>
                        <p className="text-[#B9BBBE] text-sm">{server.memberCount} members</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-[#57F287]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[#B9BBBE] text-xs">Bot Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {server.botPermissions.map((perm) => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}