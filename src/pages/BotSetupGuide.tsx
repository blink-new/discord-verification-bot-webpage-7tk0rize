import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { 
  Bot, 
  Settings, 
  Copy, 
  ExternalLink, 
  Shield, 
  Users, 
  Command,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

export default function BotSetupGuide() {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const botCommands = [
    {
      command: '!setup_verify',
      description: 'Generates a verification URL for the current server',
      usage: '!setup_verify',
      permissions: 'Administrator only'
    },
    {
      command: '!pull',
      description: 'Adds all verified users to the current server',
      usage: '!pull',
      permissions: 'Administrator only'
    },
    {
      command: '!stats',
      description: 'Shows verification statistics',
      usage: '!stats',
      permissions: 'Administrator only'
    }
  ]

  const requiredPermissions = [
    'Send Messages',
    'Read Message History',
    'Create Instant Invite',
    'Manage Server',
    'Administrator (recommended)'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Bot className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Discord Bot Setup Guide</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Follow this guide to set up the Discord verification bot in your server and start managing user verification.
          </p>
        </div>

        {/* Quick Start */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-accent" />
              <span>Quick Start</span>
            </CardTitle>
            <CardDescription>
              Get your verification bot running in 3 simple steps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">1</div>
                <h3 className="font-medium">Invite Bot</h3>
                <p className="text-sm text-muted-foreground">Add the bot to your Discord server</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">2</div>
                <h3 className="font-medium">Run Setup</h3>
                <p className="text-sm text-muted-foreground">Use !setup_verify command</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">3</div>
                <h3 className="font-medium">Share URL</h3>
                <p className="text-sm text-muted-foreground">Give verification link to users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bot Invitation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span>Step 1: Invite Bot to Server</span>
            </CardTitle>
            <CardDescription>
              Add the verification bot to your Discord server with the required permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <h4 className="font-medium mb-2">Bot Invite Link:</h4>
              <div className="flex space-x-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                  https://discord.com/api/oauth2/authorize?client_id=1397971356490006558&permissions=268435456&scope=bot
                </code>
                <Button 
                  onClick={() => copyToClipboard('https://discord.com/api/oauth2/authorize?client_id=1397971356490006558&permissions=268435456&scope=bot', 'Invite link')}
                  variant="outline" 
                  size="sm"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Client ID: 1397971356490006558 | Verified Role ID: 1397091951504916531
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Required Permissions:</h4>
              <div className="grid grid-cols-2 gap-2">
                {requiredPermissions.map((permission) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    <span className="text-sm">{permission}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bot Commands */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Command className="h-5 w-5" />
              <span>Step 2: Bot Commands</span>
            </CardTitle>
            <CardDescription>
              Available commands for server administrators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {botCommands.map((cmd, index) => (
              <div key={cmd.command}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                        {cmd.command}
                      </code>
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin Only
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{cmd.description}</p>
                    <p className="text-xs text-muted-foreground">Usage: <code>{cmd.usage}</code></p>
                  </div>
                  <Button 
                    onClick={() => copyToClipboard(cmd.command, 'Command')}
                    variant="ghost" 
                    size="sm"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {index < botCommands.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Workflow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Step 3: Verification Workflow</span>
            </CardTitle>
            <CardDescription>
              How the verification process works for your users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h4 className="font-medium">Admin runs !setup_verify</h4>
                  <p className="text-sm text-muted-foreground">Bot generates a verification URL for your server</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h4 className="font-medium">Share URL with users</h4>
                  <p className="text-sm text-muted-foreground">Users click the link to start verification</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h4 className="font-medium">Discord OAuth verification</h4>
                  <p className="text-sm text-muted-foreground">Users authorize with Discord and data is stored</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <h4 className="font-medium">Admin runs !pull</h4>
                  <p className="text-sm text-muted-foreground">All verified users are automatically added to the server</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-bold">✓</div>
                <div>
                  <h4 className="font-medium">Check stats with !stats</h4>
                  <p className="text-sm text-muted-foreground">View how many users have been verified</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="border-orange-500/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Important Notes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-orange-600">Security & Permissions:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• All bot commands require Administrator permissions</li>
                <li>• User access tokens are stored securely and used only for server joining</li>
                <li>• The bot needs "Create Instant Invite" permission to add users</li>
                <li>• Users must grant "guilds.join" permission during verification</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-orange-600">Limitations:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Some users may not join due to privacy settings</li>
                <li>• Server member limits and verification levels may affect joining</li>
                <li>• Access tokens may expire and require re-verification</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Admin Dashboard Link */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Admin Dashboard</span>
            </CardTitle>
            <CardDescription>
              Manage your verification system through the web interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Access the admin dashboard to:</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Generate verification URLs</li>
                  <li>• View verified users</li>
                  <li>• Pull users to servers</li>
                  <li>• Monitor statistics</li>
                </ul>
              </div>
              <Button asChild>
                <a href="/admin">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Dashboard
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}