import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  Users, 
  Server, 
  UserPlus, 
  Trash2, 
  LogOut, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface AdminSession {
  role: 'owner' | 'admin'
  authenticated: boolean
  timestamp: number
}

interface VerifiedUser {
  id: string
  userId: string
  username: string
  discriminator?: string
  avatar?: string
  accessToken: string
  verifiedAt: string
}

interface BotServer {
  id: string
  name: string
  memberCount: number
  isConnected: boolean
}

interface Stats {
  total: number
  today: number
  week: number
}

export default function SecureAdminDashboard() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([])
  const [botServers, setBotServers] = useState<BotServer[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, week: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [targetGuildId, setTargetGuildId] = useState('')
  const navigate = useNavigate()

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load verified users
      const usersResponse = await fetch('https://7tk0rize--admin-api.functions.blink.new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getVerifiedUsers' })
      })
      const usersData = await usersResponse.json()
      
      if (usersData.success) {
        setVerifiedUsers(usersData.users || [])
      }

      // Load stats
      const statsResponse = await fetch('https://7tk0rize--admin-api.functions.blink.new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getStats' })
      })
      const statsData = await statsResponse.json()
      
      if (statsData.success) {
        setStats(statsData.stats)
      }

      // Load bot servers (mock data for now)
      setBotServers([
        { id: '123456789', name: 'Main Server', memberCount: 1250, isConnected: true },
        { id: '987654321', name: 'Community Hub', memberCount: 850, isConnected: true },
        { id: '456789123', name: 'Gaming Zone', memberCount: 2100, isConnected: false }
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load admin data')
    } finally {
      setIsLoading(false)
    }
  }

  // Check authentication on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('admin_session')
    if (!savedSession) {
      navigate('/admin/login')
      return
    }

    try {
      const parsedSession: AdminSession = JSON.parse(savedSession)
      const now = Date.now()
      const sessionAge = now - parsedSession.timestamp
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours

      if (sessionAge >= maxAge || !parsedSession.authenticated) {
        localStorage.removeItem('admin_session')
        navigate('/admin/login')
        return
      }

      setSession(parsedSession)
      loadData()
    } catch (e) {
      localStorage.removeItem('admin_session')
      navigate('/admin/login')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('admin_session')
    toast.success('Logged out successfully')
    navigate('/admin/login')
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === verifiedUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(verifiedUsers.map(user => user.userId))
    }
  }

  const handlePullUsers = async () => {
    if (!targetGuildId.trim()) {
      toast.error('Please enter a Guild ID')
      return
    }

    if (selectedUsers.length === 0) {
      toast.error('Please select users to pull')
      return
    }

    try {
      const selectedUserData = verifiedUsers.filter(user => 
        selectedUsers.includes(user.userId)
      )

      const response = await fetch('https://7tk0rize--admin-api.functions.blink.new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pullUsers',
          guildId: targetGuildId,
          verifiedUsers: selectedUserData
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Successfully processed ${data.addedCount} users`)
        setSelectedUsers([])
        setTargetGuildId('')
      } else {
        toast.error(data.error || 'Failed to pull users')
      }
    } catch (error) {
      console.error('Error pulling users:', error)
      toast.error('Failed to pull users')
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (session?.role !== 'owner') {
      toast.error('Only owners can remove verified users')
      return
    }

    try {
      // This would call an API to remove the user
      // For now, we'll just remove from local state
      setVerifiedUsers(prev => prev.filter(user => user.userId !== userId))
      toast.success('User removed successfully')
    } catch (error) {
      toast.error('Failed to remove user')
    }
  }

  if (!session) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-[#23272A] p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-[#B9BBBE]">
              Logged in as <Badge variant="outline" className="ml-2 text-[#5865F2] border-[#5865F2]">
                {session.role.toUpperCase()}
              </Badge>
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={loadData}
              variant="outline"
              className="border-[#40444B] text-[#B9BBBE] hover:bg-[#40444B]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-500/20 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#2C2F33] border-[#40444B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#B9BBBE]">Total Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <p className="text-xs text-[#72767D]">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-[#2C2F33] border-[#40444B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#B9BBBE]">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#57F287]">{stats.today}</div>
              <p className="text-xs text-[#72767D]">New verifications</p>
            </CardContent>
          </Card>

          <Card className="bg-[#2C2F33] border-[#40444B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#B9BBBE]">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#5865F2]">{stats.week}</div>
              <p className="text-xs text-[#72767D]">Weekly total</p>
            </CardContent>
          </Card>
        </div>

        {/* Pull Users Section */}
        <Card className="bg-[#2C2F33] border-[#40444B]">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              Pull Verified Users to Server
            </CardTitle>
            <CardDescription className="text-[#B9BBBE]">
              Select verified users and specify a Guild ID to pull them to that server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter Guild ID (e.g., 123456789012345678)"
                value={targetGuildId}
                onChange={(e) => setTargetGuildId(e.target.value)}
                className="bg-[#40444B] border-[#40444B] text-white placeholder-[#72767D]"
              />
              <Button
                onClick={handlePullUsers}
                disabled={selectedUsers.length === 0 || !targetGuildId.trim()}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
              >
                Pull {selectedUsers.length} Users
              </Button>
            </div>
            
            {selectedUsers.length > 0 && (
              <Alert className="bg-[#5865F2]/10 border-[#5865F2]/20">
                <UserPlus className="h-4 w-4 text-[#5865F2]" />
                <AlertDescription className="text-[#5865F2]">
                  {selectedUsers.length} user(s) selected for pulling
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Verified Users */}
        <Card className="bg-[#2C2F33] border-[#40444B]">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Verified Users ({verifiedUsers.length})
              </CardTitle>
              <Button
                onClick={handleSelectAll}
                variant="outline"
                size="sm"
                className="border-[#40444B] text-[#B9BBBE] hover:bg-[#40444B]"
              >
                {selectedUsers.length === verifiedUsers.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-[#B9BBBE]">Loading verified users...</p>
              </div>
            ) : verifiedUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-[#72767D] mx-auto mb-2" />
                <p className="text-[#B9BBBE]">No verified users found</p>
                <p className="text-[#72767D] text-sm">Users will appear here after they complete verification</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {verifiedUsers.map((user) => (
                  <div
                    key={user.userId}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedUsers.includes(user.userId)
                        ? 'bg-[#5865F2]/10 border-[#5865F2]/30'
                        : 'bg-[#40444B] border-[#40444B] hover:bg-[#40444B]/80'
                    }`}
                    onClick={() => handleUserSelect(user.userId)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center">
                        {user.avatar ? (
                          <img
                            src={`https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`}
                            alt={user.username}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <span className="text-white font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {user.username}
                          {user.discriminator && user.discriminator !== '0' && (
                            <span className="text-[#72767D]">#{user.discriminator}</span>
                          )}
                        </p>
                        <p className="text-[#72767D] text-sm">ID: {user.userId}</p>
                        <p className="text-[#72767D] text-xs">
                          Verified: {new Date(user.verifiedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {selectedUsers.includes(user.userId) && (
                        <CheckCircle className="h-5 w-5 text-[#5865F2]" />
                      )}
                      
                      {session.role === 'owner' && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveUser(user.userId)
                          }}
                          variant="outline"
                          size="sm"
                          className="border-red-500/20 text-red-400 hover:bg-red-500/10"
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

        {/* Bot Servers */}
        <Card className="bg-[#2C2F33] border-[#40444B]">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Server className="h-5 w-5 mr-2" />
              Bot Servers
            </CardTitle>
            <CardDescription className="text-[#B9BBBE]">
              Servers where the Discord bot is currently active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {botServers.map((server) => (
                <div
                  key={server.id}
                  className="flex items-center justify-between p-3 bg-[#40444B] rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      server.isConnected ? 'bg-[#57F287]' : 'bg-[#ED4245]'
                    }`} />
                    <div>
                      <p className="text-white font-medium">{server.name}</p>
                      <p className="text-[#72767D] text-sm">
                        {server.memberCount.toLocaleString()} members • ID: {server.id}
                      </p>
                    </div>
                  </div>
                  
                  <Badge
                    variant="outline"
                    className={server.isConnected 
                      ? 'text-[#57F287] border-[#57F287]' 
                      : 'text-[#ED4245] border-[#ED4245]'
                    }
                  >
                    {server.isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}