import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { 
  Users, 
  Shield, 
  Settings, 
  Copy, 
  RefreshCw, 
  UserPlus, 
  BarChart3,
  ExternalLink,
  CheckCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface VerifiedUser {
  id: string
  username: string
  discriminator: string
  avatar: string
  accessToken: string
  verifiedAt: string
  serverId?: string
  serverName?: string
}

interface ServerStats {
  totalVerified: number
  recentVerifications: number
  pendingInvites: number
}

export default function AdminDashboard() {
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([])
  const [stats, setStats] = useState<ServerStats>({
    totalVerified: 0,
    recentVerifications: 0,
    pendingInvites: 0
  })
  const [serverId, setServerId] = useState('')
  const [serverName, setServerName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [verificationUrl, setVerificationUrl] = useState('')

  const loadVerifiedUsers = async () => {
    try {
      const response = await fetch('https://7tk0rize--admin-api.functions.blink.new/verified-users')
      if (response.ok) {
        const users = await response.json()
        setVerifiedUsers(users)
      }
    } catch (error) {
      console.error('Failed to load verified users:', error)
      toast.error('Failed to load verified users')
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('https://7tk0rize--admin-api.functions.blink.new/stats')
      if (response.ok) {
        const statsData = await response.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  useEffect(() => {
    loadVerifiedUsers()
    loadStats()
  }, [])

  const generateVerificationUrl = () => {
    if (!serverId.trim()) {
      toast.error('Please enter a server ID')
      return
    }

    const baseUrl = window.location.origin
    const url = `${baseUrl}/verify?server_id=${encodeURIComponent(serverId)}&server_name=${encodeURIComponent(serverName || 'Discord Server')}`
    setVerificationUrl(url)
    toast.success('Verification URL generated!')
  }

  const copyVerificationUrl = () => {
    if (verificationUrl) {
      navigator.clipboard.writeText(verificationUrl)
      toast.success('URL copied to clipboard!')
    }
  }

  const pullUsersToServer = async () => {
    if (!serverId.trim()) {
      toast.error('Please enter a server ID')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('https://7tk0rize--admin-api.functions.blink.new/pull-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverId,
          serverName: serverName || 'Discord Server'
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Successfully invited ${result.invitedCount} users to the server!`)
        loadStats() // Refresh stats
      } else {
        toast.error(result.error || 'Failed to pull users')
      }
    } catch (error) {
      console.error('Failed to pull users:', error)
      toast.error('Failed to pull users to server')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = () => {
    loadVerifiedUsers()
    loadStats()
    toast.success('Data refreshed!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span>Admin Dashboard</span>
            </h1>
            <p className="text-muted-foreground">Manage Discord verification system</p>
          </div>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Verified</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalVerified}</div>
              <p className="text-xs text-muted-foreground">
                Users verified through the system
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent (24h)</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.recentVerifications}</div>
              <p className="text-xs text-muted-foreground">
                New verifications today
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats.pendingInvites}</div>
              <p className="text-xs text-muted-foreground">
                Users ready to be pulled
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="setup" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Setup Verification</TabsTrigger>
            <TabsTrigger value="users">Verified Users</TabsTrigger>
            <TabsTrigger value="manage">Server Management</TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Generate Verification URL</span>
                </CardTitle>
                <CardDescription>
                  Create a verification URL for your Discord server. Users will click this to verify.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serverId">Server ID *</Label>
                    <Input
                      id="serverId"
                      placeholder="123456789012345678"
                      value={serverId}
                      onChange={(e) => setServerId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serverName">Server Name (Optional)</Label>
                    <Input
                      id="serverName"
                      placeholder="My Discord Server"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button onClick={generateVerificationUrl} className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Generate Verification URL
                </Button>
                
                {verificationUrl && (
                  <div className="space-y-2">
                    <Label>Generated URL:</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={verificationUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button onClick={copyVerificationUrl} variant="outline" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share this URL with users who need to verify for your server.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Verified Users ({verifiedUsers.length})</span>
                </CardTitle>
                <CardDescription>
                  List of all users who have completed verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                {verifiedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No verified users yet</p>
                    <p className="text-sm">Users will appear here after completing verification</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {verifiedUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
                        <img
                          src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{user.username}</span>
                            <span className="text-muted-foreground">#{user.discriminator}</span>
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Verified: {new Date(user.verifiedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <code className="text-xs bg-muted px-2 py-1 rounded">{user.id}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Tab */}
          <TabsContent value="manage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5" />
                  <span>Pull Users to Server</span>
                </CardTitle>
                <CardDescription>
                  Add all verified users to your Discord server using their stored access tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pullServerId">Target Server ID *</Label>
                    <Input
                      id="pullServerId"
                      placeholder="123456789012345678"
                      value={serverId}
                      onChange={(e) => setServerId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pullServerName">Server Name</Label>
                    <Input
                      id="pullServerName"
                      placeholder="My Discord Server"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <h4 className="font-medium text-orange-600 mb-2">⚠️ Important Notes:</h4>
                  <ul className="text-sm text-orange-600 space-y-1">
                    <li>• This will attempt to add ALL verified users to the specified server</li>
                    <li>• Users must have granted the "guilds.join" permission during verification</li>
                    <li>• The bot must have "Create Instant Invite" permission in the target server</li>
                    <li>• Some users may fail to join due to privacy settings or server restrictions</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={pullUsersToServer} 
                  disabled={isLoading || !serverId.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Pulling Users...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <UserPlus className="h-4 w-4" />
                      <span>Pull All Verified Users</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}