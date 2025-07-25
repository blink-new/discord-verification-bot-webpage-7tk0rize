import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { XCircle, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerificationFailed() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      switch (errorParam) {
        case 'missing_code':
          setError('Authorization code was missing from the callback')
          break
        case 'token_exchange':
          setError('Failed to exchange authorization code for access token')
          break
        case 'user_fetch':
          setError('Failed to fetch user information from Discord')
          break
        case 'server_error':
          setError('An internal server error occurred')
          break
        default:
          setError('An unknown error occurred during verification')
      }
    } else {
      setError('Failed to fetch')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-[#23272A] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#2C2F33] border-[#40444B]">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-[#ED4245] rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Verification Failed
          </CardTitle>
          <CardDescription className="text-[#B9BBBE]">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-[#ED4245]/10 border border-[#ED4245]/20 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <XCircle className="h-5 w-5 text-[#ED4245]" />
              <div>
                <p className="text-[#ED4245] font-medium">Verification Error</p>
                <p className="text-[#B9BBBE] text-sm">
                  Something went wrong during the Discord OAuth process
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-white font-medium">What you can do:</h3>
            <ul className="space-y-2 text-[#B9BBBE] text-sm">
              <li className="flex items-start space-x-2">
                <span className="text-[#5865F2] mt-1">•</span>
                <span>Try the verification process again</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#5865F2] mt-1">•</span>
                <span>Make sure you're logged into Discord</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#5865F2] mt-1">•</span>
                <span>Check that you authorized the application</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#5865F2] mt-1">•</span>
                <span>Contact an administrator if the problem persists</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 space-y-2">
            <Button asChild className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white">
              <Link to="/">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-[#40444B] text-[#B9BBBE] hover:bg-[#40444B]">
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