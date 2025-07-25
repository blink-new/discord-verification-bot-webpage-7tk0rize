import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Users, Server, Shield, LogOut, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@blinkdotnew/sdk'

const blink = createClient({
  projectId: 'discord-verification-bot-webpage-7tk0rize',
  authRequired: false
})

interface VerifiedUser {
  id: string
  userId: string
  username: string
  discriminator: string
  avatar: string
  accessToken: string
  verifiedAt: string
}

export default function SecureAdminDashboard() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<'owner' | 'admin' | null>(null)
  const [loginKey, setLoginKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([])
  const [guildId, setGuildId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, today: 0 })

  const loadVerifiedUsers = async () => {
    try {
      const users = await blink.db.verifiedUsers.list({
        orderBy: { verifiedAt: 'desc' }
      })
      setVerifiedUsers(users)
      
      // Calculate stats
      const today = new Date().toDateString()
      const todayCount = users.filter(user => 
        new Date(user.verifiedAt).toDateString() === today
      ).length
      
      setStats({ total: users.length, today: todayCount })
    } catch (error) {
      console.error('Failed to load verified users:', error)
      toast.error('Failed to load verified users')
    }
  }

  useEffect(() => {
    loadVerifiedUsers()
  }, [])

  const handleLogin = async () => {
    if (!loginKey.trim()) {
      toast.error('Please enter a login key')
      return
    }

    try {
      const response = await fetch('https://discord-verification-bot-webpage-7tk0rize-admin-api.blink-functions.com/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'authenticate', loginKey })
      })

      const data = await response.json()
      
      if (data.success) {
        setIsAuthenticated(true)
        setUserRole(data.role)
        toast.success(`Logged in as ${data.role}`)
      } else {
        toast.error('Invalid login key')
      }
    } catch (error) {
      console.error('Login failed:', error)
      toast.error('Login failed')
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (userRole !== 'owner') {
      toast.error('Only owners can remove verified users')
      return
    }

    try {
      await blink.db.verifiedUsers.delete(userId)
      await loadVerifiedUsers()
      toast.success('User removed successfully')
    } catch (error) {
      console.error('Failed to remove user:', error)
      toast.error('Failed to remove user')
    }
  }

  const handlePullUsers = async () => {
    if (!guildId.trim()) {
      toast.error('Please enter a Guild ID')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('https://discord-verification-bot-webpage-7tk0rize-admin-api.blink-functions.com/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'pullUsers', 
          guildId,
          verifiedUsers: verifiedUsers.map(user => ({
            userId: user.userId,
            accessToken: user.accessToken
          }))
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`Successfully pulled ${data.addedCount} users to the server`)
      } else {
        toast.error(data.error || 'Failed to pull users')
      }
    } catch (error) {
      console.error('Failed to pull users:', error)
      toast.error('Failed to pull users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUserRole(null)
    setLoginKey('')
    toast.success('Logged out successfully')
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#23272A] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#2C2F33] border-[#40444B]">
          <CardHeader className="text-center">
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <Shield className="h-6 w-6 text-[#5865F2]" />
              Admin Access
            </CardTitle>
            <CardDescription className="text-[#B9BBBE]">
              Enter your login key to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Enter login key..."
                value={loginKey}
                onChange={(e) => setLoginKey(e.target.value)}
                className="bg-[#40444B] border-[#40444B] text-white pr-10"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-[#B9BBBE] hover:text-white"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button 
              onClick={handleLogin} 
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
            >
              Login
            </Button>
            <div className="text-xs text-[#72767D] text-center">
              <p>Owner: Full access including user removal</p>
              <p>Admin: View and pull users only</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#23272A] p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-[#B9BBBE]">
              Logged in as <Badge variant="outline" className="text-[#5865F2] border-[#5865F2]">
                {userRole}
              </Badge>
            </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-[#2C2F33] border-[#40444B]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#B9BBBE]">Total Verified</CardTitle>
              <Users className="h-4 w-4 text-[#57F287]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2C2F33] border-[#40444B]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#B9BBBE]">Today</CardTitle>
              <Server className="h-4 w-4 text-[#5865F2]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.today}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pull Users Section */}
        <Card className="bg-[#2C2F33] border-[#40444B]">
          <CardHeader>
            <CardTitle className="text-white">Pull Verified Users to Server</CardTitle>
            <CardDescription className="text-[#B9BBBE]">
              Enter a Guild ID to add all verified users to that server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Guild ID..."
                value={guildId}
                onChange={(e) => setGuildId(e.target.value)}
                className="bg-[#40444B] border-[#40444B] text-white"
              />
              <Button 
                onClick={handlePullUsers}
                disabled={isLoading || !guildId.trim()}
                className="bg-[#57F287] hover:bg-[#3BA55D] text-black"
              >
                {isLoading ? 'Pulling...' : 'Pull Users'}
              </Button>
            </div>
            <Alert className="bg-[#40444B] border-[#40444B]">
              <Server className="h-4 w-4" />
              <AlertDescription className="text-[#B9BBBE]">
                This will attempt to add all {verifiedUsers.length} verified users to the specified server.
                Make sure the bot has proper permissions in the target server.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Verified Users List */}
        <Card className="bg-[#2C2F33] border-[#40444B]">
          <CardHeader>
            <CardTitle className="text-white">Verified Users ({verifiedUsers.length})</CardTitle>
            <CardDescription className="text-[#B9BBBE]">
              All users who have completed the verification process
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verifiedUsers.length === 0 ? (
              <div className="text-center py-8 text-[#72767D]">
                No verified users yet
              </div>
            ) : (
              <div className="space-y-3">
                {verifiedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-[#40444B] rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} alt={user.username} />
                        <AvatarFallback className="bg-[#5865F2] text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">
                          {user.username}#{user.discriminator}
                        </p>
                        <p className="text-[#72767D] text-sm">
                          ID: {user.userId}
                        </p>
                        <p className="text-[#72767D] text-xs">
                          Verified: {new Date(user.verifiedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {userRole === 'owner' && (
                      <Button
                        onClick={() => handleRemoveUser(user.id)}
                        variant="destructive"
                        size="sm"
                        className="bg-[#ED4245] hover:bg-[#C73E41]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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