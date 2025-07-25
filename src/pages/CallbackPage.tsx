import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { CheckCircle, XCircle, Loader2, Home } from 'lucide-react'
import { toast } from 'sonner'

interface VerificationResult {
  success: boolean
  message: string
  userData?: {
    id: string
    username: string
    avatar: string
    discriminator: string
  }
  serverInfo?: {
    id: string
    name: string
  }
}

export default function CallbackPage() {
  const [isProcessing, setIsProcessing] = useState(true)
  const [result, setResult] = useState<VerificationResult | null>(null)

  useEffect(() => {
    const processCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const state = urlParams.get('state')
        const error = urlParams.get('error')

        if (error) {
          throw new Error(`Discord OAuth error: ${error}`)
        }

        if (!code) {
          throw new Error('No authorization code received')
        }

        let serverInfo = null
        if (state) {
          try {
            serverInfo = JSON.parse(decodeURIComponent(state))
          } catch (e) {
            console.warn('Failed to parse state parameter:', e)
          }
        }

        // Exchange code for access token and get user info
        const response = await fetch(`https://7tk0rize--discord-callback.functions.blink.new?code=${code}&state=${state || 'default'}`)

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to process verification')
        }

        setResult({
          success: true,
          message: 'Verification completed successfully!',
          userData: data.user,
          serverInfo: data.serverInfo
        })

        toast.success('Verification completed successfully!')

      } catch (error) {
        console.error('Callback processing error:', error)
        setResult({
          success: false,
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        })
        toast.error('Verification failed')
      } finally {
        setIsProcessing(false)
      }
    }

    processCallback()
  }, [])

  const goHome = () => {
    window.location.href = '/'
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <CardTitle>Processing Verification</CardTitle>
            <CardDescription>
              Please wait while we verify your Discord account...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span>Exchanging authorization code</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span>Fetching user information</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span>Storing verification data</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {result?.success ? (
              <CheckCircle className="h-8 w-8 text-accent" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <CardTitle>
            {result?.success ? 'Verification Successful!' : 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {result?.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result?.success && result.userData && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-accent/10 rounded-lg">
                <img
                  src={`https://cdn.discordapp.com/avatars/${result.userData.id}/${result.userData.avatar}.png?size=64`}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/${parseInt(result.userData!.discriminator) % 5}.png`
                  }}
                />
                <div>
                  <p className="font-medium">{result.userData.username}</p>
                  <p className="text-sm text-muted-foreground">#{result.userData.discriminator}</p>
                </div>
              </div>
              
              {result.serverInfo && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium">Server: {result.serverInfo.name}</p>
                  <p className="text-xs text-muted-foreground">ID: {result.serverInfo.id}</p>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                <p>✅ Your verification has been recorded</p>
                <p>✅ You can now be added to the server</p>
                <p>✅ Wait for an admin to use the !pull command</p>
              </div>
            </div>
          )}

          <Button onClick={goHome} className="w-full" variant="outline">
            <Home className="h-4 w-4 mr-2" />
            Return Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}