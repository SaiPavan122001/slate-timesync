import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useForm } from "react-hook-form"
import slateLogo from "@/assets/slate-logo.png"

interface LoginForm {
  email: string
  domain: string
}

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<LoginForm>({
    defaultValues: {
      domain: "hinfinity.in"
    }
  })

  const domains = [
    "hinfinity.in",
    "hinfinitysolutions.com", 
    "hinfinitys.com",
    "slateai.dev"
  ]

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError("")
    
    // Simulate form validation
    if (!data.email) {
      setError("Please enter your email address")
      setIsLoading(false)
      return
    }
    
    if (!data.email.includes("@")) {
      setError("Please enter a valid email address")
      setIsLoading(false)
      return
    }

    // For now, just show success (backend integration needed)
    setTimeout(() => {
      setIsLoading(false)
      setError("Authentication requires backend integration. Please connect to Supabase to enable login functionality.")
    }, 1000)
  }

  const handleSocialLogin = (provider: string) => {
    setError("Social login requires backend integration. Please connect to Supabase first.")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img src={slateLogo} alt="Slate AI" className="h-12 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold mb-2">Welcome to Hinfinity</h1>
          <p className="text-muted-foreground">Start by entering the email address you use for work.</p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full h-12 text-base"
                onClick={() => handleSocialLogin("google")}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue With Google
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full h-12 text-base"
                onClick={() => handleSocialLogin("apple")}
              >
                <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continue With Apple
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">OR</span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex">
                  <Input
                    id="email"
                    type="text"
                    placeholder="your-email"
                    className="rounded-r-none border-r-0 focus:z-10"
                    {...register("email", { 
                      required: "Email is required",
                      pattern: {
                        value: /^[^\s@]+$/,
                        message: "Enter username part only"
                      }
                    })}
                  />
                  <Select
                    value={watch("domain")}
                    onValueChange={(value) => setValue("domain", value)}
                  >
                    <SelectTrigger className="w-48 rounded-l-none border-l-0 focus:z-10">
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain} value={domain}>
                          @{domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-primary hover:opacity-90" 
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Continue"}
              </Button>
            </form>

            {error && (
              <Alert className="border-destructive/50">
                <AlertDescription className="text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Domain Info */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2">You can use any account with the domain:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {domains.map((domain) => (
                    <li key={domain}>• {domain}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Don't have an email address from one of those domains?{" "}
                  <br />
                  Contact the workspace administrator at Hinfinity for an invitation.
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}