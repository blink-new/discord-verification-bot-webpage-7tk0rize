import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Shield, Users, CheckCircle, ExternalLink } from 'lucide-react'

export default function VerificationPage() {
  const [serverId, setServerId] = useState<string>('')
  const [serverName, setServerName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Get server info from URL params
    const urlParams = new URLSearchParams(window.location.search)
    const id = urlParams.get('server_id')
    const name = urlParams.get('server_name')
    
    if (id) setServerId(id)
    if (name) setServerName(decodeURIComponent(name))
  }, [])

  const handleDiscordAuth = () => {
    setIsLoading(true)
    
    // Discord OAuth2 URL with proper scopes
    const clientId = '1397971356490006558'
    const redirectUri = encodeURIComponent(`${window.location.origin}/callback`)
    const scope = encodeURIComponent('identify guilds.join')
    const state = encodeURIComponent(JSON.stringify({ serverId, serverName }))
    
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`
    
    window.location.href = discordAuthUrl
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Discord Verification</h1>
          <p className="text-muted-foreground">
            Verify your Discord account to join the server
          </p>
        </div>

        {/* Server Info Card */}
        {serverName && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Server Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Server Name:</span>
                  <Badge variant="secondary">{serverName}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Server ID:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{serverId}</code>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-accent" />
              <span>Verify with Discord</span>
            </CardTitle>
            <CardDescription>
              Click the button below to authenticate with Discord and complete your verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">What happens next:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>You'll be redirected to Discord</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>Authorize the application</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>Your verification will be recorded</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <span>You'll be able to join the server</span>
                </li>
              </ul>
            </div>
            
            <Button 
              onClick={handleDiscordAuth}
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Redirecting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <ExternalLink className="h-4 w-4" />
                  <span>Verify with Discord</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Secure verification powered by Discord OAuth2</p>
        </div>
      </div>
    </div>
  )
}