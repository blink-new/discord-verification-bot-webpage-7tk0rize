import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, Home, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerificationSuccess() {
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')

  useEffect(() => {
    const user = searchParams.get('user')
    if (user) {
      setUsername(decodeURIComponent(user))
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-[#23272A] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#2C2F33] border-[#40444B]">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-[#57F287] rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Verification Successful!
          </CardTitle>
          <CardDescription className="text-[#B9BBBE]">
            {username ? `Welcome, ${username}!` : 'Your Discord account has been verified'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-[#57F287]/10 border border-[#57F287]/20 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-[#57F287]" />
              <div>
                <p className="text-[#57F287] font-medium">Account Verified</p>
                <p className="text-[#B9BBBE] text-sm">
                  You can now be added to Discord servers using the verification system
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-white font-medium">What happens next?</h3>
            <ul className="space-y-2 text-[#B9BBBE] text-sm">
              <li className="flex items-start space-x-2">
                <span className="text-[#5865F2] mt-1">•</span>
                <span>Your verification data has been stored securely</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#5865F2] mt-1">•</span>
                <span>Server administrators can now pull you into their servers</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#5865F2] mt-1">•</span>
                <span>You'll automatically receive the verified role when added</span>
              </li>
            </ul>
          </div>

          <div className="pt-4">
            <Button asChild className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}