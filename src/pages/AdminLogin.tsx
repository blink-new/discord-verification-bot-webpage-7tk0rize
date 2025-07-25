import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface AdminSession {
  role: 'owner' | 'admin'
  authenticated: boolean
  timestamp: number
}

export default function AdminLogin() {
  const [loginKey, setLoginKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState<AdminSession | null>(null)
  const navigate = useNavigate()

  // Check for existing session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('admin_session')
    if (savedSession) {
      try {
        const parsedSession: AdminSession = JSON.parse(savedSession)
        // Check if session is still valid (24 hours)
        const now = Date.now()
        const sessionAge = now - parsedSession.timestamp
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours

        if (sessionAge < maxAge && parsedSession.authenticated) {
          setSession(parsedSession)
          navigate('/admin/dashboard')
        } else {
          // Session expired
          localStorage.removeItem('admin_session')
        }
      } catch (e) {
        localStorage.removeItem('admin_session')
      }
    }
  }, [navigate])

  // Anti-bypass protection
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    
    // Disable common developer shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault()
        toast.error('Developer tools are disabled for security')
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const validateLoginKey = async (key: string): Promise<'owner' | 'admin' | null> => {
    try {
      const response = await fetch('https://7tk0rize--admin-api.functions.blink.new/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginKey: key
        })
      })

      if (!response.ok) {
        throw new Error('Authentication failed')
      }

      const data = await response.json()
      return data.success ? data.role.toLowerCase() : null
    } catch (error) {
      console.error('Login validation error:', error)
      return null
    }
  }

  const handleLogin = async () => {
    if (!loginKey.trim()) {
      setError('Please enter a login key')
      return
    }

    setIsLoading(true)
    setError('')

    // Validate login key with backend
    const role = await validateLoginKey(loginKey)
    
    if (role) {
      const newSession: AdminSession = {
        role,
        authenticated: true,
        timestamp: Date.now()
      }
      
      setSession(newSession)
      localStorage.setItem('admin_session', JSON.stringify(newSession))
      
      toast.success(`Logged in as ${role.toUpperCase()}`)
      navigate('/admin/dashboard')
    } else {
      setError('Invalid login key. Access denied.')
      // Clear input for security
      setLoginKey('')
      
      // Rate limiting simulation
      setTimeout(() => setError(''), 5000)
    }

    setIsLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen bg-[#23272A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-[#2C2F33] border-[#40444B]">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-[#5865F2] rounded-full">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Admin Access
            </CardTitle>
            <CardDescription className="text-[#B9BBBE]">
              Enter your secure login key to access the admin panel
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <Alert className="bg-red-500/10 border-red-500/20">
                <Lock className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#B9BBBE]">
                Login Key
              </label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={loginKey}
                  onChange={(e) => setLoginKey(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your secure login key"
                  className="bg-[#40444B] border-[#40444B] text-white placeholder-[#72767D] pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#B9BBBE] hover:text-white"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={isLoading || !loginKey.trim()}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Access Admin Panel
                </>
              )}
            </Button>

            <div className="text-xs text-[#72767D] text-center space-y-1">
              <p>🔒 Secure authentication required</p>
              <p>⚡ Session expires in 24 hours</p>
              <p>🛡️ Anti-bypass protection enabled</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}