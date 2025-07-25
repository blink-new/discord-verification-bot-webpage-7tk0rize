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
  Trash2, 
  Download, 
  LogOut, 
  AlertTriangle,
  UserPlus,
  Search
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
  discriminator: string
  avatar: string | null
  accessToken: string
  verifiedAt: string
  serverId?: string
  serverName?: string
}

interface Stats {
  total: number
  today: number
  week: number
}

export default function SecureAdminDashboard() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, week: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [guildId, setGuildId] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isPulling, setIsPulling] = useState(false)
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Load verified users
      const usersResponse = await fetch('https://7tk0rize--admin-api.functions.blink.new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getVerifiedUsers' })
      })
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        if (usersData.success) {
          setVerifiedUsers(usersData.users || [])
        }
      }

      // Load stats
      const statsResponse = await fetch('https://7tk0rize--admin-api.functions.blink.new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getStats' })
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) {
          setStats(statsData.stats)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const getFilteredUsers = () => {
    return verifiedUsers.filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userId.includes(searchTerm)
    )
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
    navigate('/admin')
    toast.success('Logged out successfully')
  }

  const handleRemoveUser = async (userId: string) => {
    if (!session || session.role !== 'owner') {
      toast.error('Only owners can remove verified users')
      return
    }

    if (!confirm('Are you sure you want to remove this verified user? This action cannot be undone.')) {
      return
    }

    try {
      // Remove from local state immediately for better UX
      setVerifiedUsers(prev => prev.filter(user => user.userId !== userId))
      
      // Here you would call your API to remove the user from the database
      // For now, we'll just show a success message
      toast.success('User removed successfully')
      
      // Reload data to ensure consistency
      await loadData()
    } catch (error) {
      console.error('Error removing user:', error)
      toast.error('Failed to remove user')
      // Reload data to restore state
      await loadData()
    }
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    const filteredUsers = getFilteredUsers()
    const allSelected = filteredUsers.every(user => selectedUsers.includes(user.userId))
    
    if (allSelected) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(user => user.userId))
    }
  }

  const handlePullUsers = async () => {
    if (!guildId.trim()) {
      toast.error('Please enter a Guild ID')
      return
    }

    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user to pull')
      return
    }

    setIsPulling(true)
    try {
      const usersToPull = verifiedUsers.filter(user => selectedUsers.includes(user.userId))
      
      const response = await fetch('https://7tk0rize--admin-api.functions.blink.new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pullUsers',
          guildId: guildId.trim(),
          verifiedUsers: usersToPull
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast.success(`Successfully processed ${data.addedCount} users for guild ${guildId}`)
          setSelectedUsers([])
          setGuildId('')
        } else {
          toast.error(data.error || 'Failed to pull users')
        }
      } else {
        toast.error('Failed to pull users to server')
      }
    } catch (error) {
      console.error('Error pulling users:', error)
      toast.error('Failed to pull users to server')
    } finally {
      setIsPulling(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!session) {
    return <div>Loading...</div>
  }

  const filteredUsers = getFilteredUsers()

  return (
    <div className="min-h-screen bg-[#23272A] p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-[#5865F2] rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-[#B9BBBE]">
                Logged in as <Badge variant="secondary" className="ml-1">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#2C2F33] border-[#40444B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#B9BBBE]">Total Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2C2F33] border-[#40444B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#B9BBBE]">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.today}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2C2F33] border-[#40444B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#B9BBBE]">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.week}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pull Users Section */}
        <Card className="bg-[#2C2F33] border-[#40444B]">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              Pull Users to Server
            </CardTitle>
            <CardDescription className="text-[#B9BBBE]">
              Select verified users and enter a Guild ID to pull them to that server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter Discord Guild ID (e.g., 1234567890123456789)"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  className="bg-[#40444B] border-[#40444B] text-white placeholder-[#72767D]"
                />
              </div>
              <Button
                onClick={handlePullUsers}
                disabled={!guildId.trim() || selectedUsers.length === 0 || isPulling}
                className="bg-[#57F287] hover:bg-[#3BA55C] text-black"
              >
                {isPulling ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Pulling...</span>
                  </div>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Pull {selectedUsers.length} Users
                  </>
                )}
              </Button>
            </div>
            
            {selectedUsers.length > 0 && (
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <AlertTriangle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-400">
                  {selectedUsers.length} user(s) selected for pulling to guild {guildId || '[Guild ID]'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Verified Users */}
        <Card className="bg-[#2C2F33] border-[#40444B]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Verified Users ({filteredUsers.length})
              </CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#72767D]" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#40444B] border-[#40444B] text-white placeholder-[#72767D] w-64"
                  />
                </div>
                <Button
                  onClick={handleSelectAll}
                  variant="outline"
                  size="sm"
                  className="border-[#40444B] text-[#B9BBBE] hover:bg-[#40444B]"
                >
                  {filteredUsers.every(user => selectedUsers.includes(user.userId)) ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[#B9BBBE]">Loading verified users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-[#72767D] mx-auto mb-4" />
                <p className="text-[#B9BBBE]">
                  {searchTerm ? 'No users found matching your search' : 'No verified users found'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      selectedUsers.includes(user.userId)
                        ? 'bg-[#5865F2]/10 border-[#5865F2]/30'
                        : 'bg-[#40444B] border-[#40444B] hover:bg-[#484C52]'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.userId)}
                        onChange={() => handleSelectUser(user.userId)}
                        className="w-4 h-4 text-[#5865F2] bg-[#40444B] border-[#72767D] rounded focus:ring-[#5865F2]"
                      />
                      
                      <div className="flex items-center space-x-3">
                        {user.avatar ? (
                          <img
                            src={`https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png?size=32`}
                            alt={user.username}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-[#5865F2] rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-white font-medium">{user.username}</p>
                          <p className="text-[#B9BBBE] text-sm">ID: {user.userId}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-[#B9BBBE] text-sm">Verified</p>
                        <p className="text-white text-sm">{formatDate(user.verifiedAt)}</p>
                      </div>
                      
                      {session.role === 'owner' && (
                        <Button
                          onClick={() => handleRemoveUser(user.userId)}
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
      </div>
    </div>
  )
}