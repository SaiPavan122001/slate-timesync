import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "@/components/theme-provider"
import slateLogoLight from "@/assets/slate-logo-light.png"
import slateLogoDark from "@/assets/slate-logo-dark.png"

export function Navigation() {
  const { theme } = useTheme()
  const logo = theme === "dark" ? slateLogoDark : slateLogoLight
  
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <img src={logo} alt="Slate AI" className="h-8 w-auto" />
        </Link>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <Link to="#features" className="text-foreground/60 hover:text-foreground transition-colors">
              Features
            </Link>
            <Link to="#pricing" className="text-foreground/60 hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="#apps" className="text-foreground/60 hover:text-foreground transition-colors">
              Apps
            </Link>
          </div>
          
          <ThemeToggle />
          
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}