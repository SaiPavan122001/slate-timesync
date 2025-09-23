import { ArrowRight, Clock, Users, Calendar, BarChart3, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "react-router-dom"

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-background to-background/50 dark:from-background/5 dark:to-background/20" />
        <div className="container relative">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium bg-slate-blue-light text-slate-blue border-slate-blue/20">
              <Zap className="mr-2 h-4 w-4" />
              POWERED BY AI
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              The Future of{" "}
              <span className="text-transparent bg-clip-text bg-gradient-primary">
                Business
              </span>
            </h1>
            
            <p className="max-w-2xl text-xl text-muted-foreground leading-relaxed">
              Transform your business with our comprehensive AI-powered ecosystem. 
              From HR management to analytics, build the future with SlateAI.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/login">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-glow px-8">
                  Start Building
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8">
                Explore Apps
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Everything You Need to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-primary">
                Scale
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools to manage your workforce and drive productivity
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-elegant">
              <CardHeader>
                <Clock className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Attendance Tracking</CardTitle>
                <CardDescription>
                  One-click check-in/out with smart reminders and timeline views
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Auto-reminders for missed check-ins</li>
                  <li>• Customizable working hour policies</li>
                  <li>• Real-time attendance monitoring</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-elegant">
              <CardHeader>
                <Calendar className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Smart Timesheets</CardTitle>
                <CardDescription>
                  Weekly timesheet management with calendar integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 15-minute granularity tracking</li>
                  <li>• Calendar event imports</li>
                  <li>• Approval workflows</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-elegant">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Leave Management</CardTitle>
                <CardDescription>
                  Comprehensive leave tracking with automated approvals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Customizable leave types</li>
                  <li>• Balance tracking & accruals</li>
                  <li>• Manager approval workflows</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-elegant">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Analytics & Reports</CardTitle>
                <CardDescription>
                  Powerful insights and reporting capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Real-time dashboards</li>
                  <li>• Utilization tracking</li>
                  <li>• Custom report generation</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-elegant">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Role-Based Access</CardTitle>
                <CardDescription>
                  Customizable RBAC with enterprise security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Granular permissions</li>
                  <li>• Audit logging</li>
                  <li>• SSO integration</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-elegant">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>AI-Powered</CardTitle>
                <CardDescription>
                  Smart automation and intelligent insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Predictive analytics</li>
                  <li>• Automated workflows</li>
                  <li>• Smart recommendations</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-dark">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of companies already using SlateAI to streamline their operations
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-glow px-8">
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2024 SlateAI. All rights reserved.</p>
            <div className="flex justify-center space-x-4 mt-4">
              <Link to="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}