import { ArrowRight, Clock, Users, Calendar, BarChart3, DollarSign, MessageSquare, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "react-router-dom"

export function LandingPage() {
  const modules = [
    {
      title: "HRMS",
      description: "Complete HR management system",
      icon: Users,
      features: ["Employee records", "Performance tracking", "Document management"],
      color: "text-primary"
    },
    {
      title: "HRConnect",
      description: "Internal communication platform",
      icon: MessageSquare,
      features: ["Team messaging", "Announcements", "Social feed"],
      color: "text-primary"
    },
    {
      title: "Payroll",
      description: "Automated payroll processing",
      icon: DollarSign,
      features: ["Salary calculations", "Tax compliance", "Payment schedules"],
      color: "text-primary"
    },
    {
      title: "Timesheet",
      description: "Time tracking and management",
      icon: Clock,
      features: ["Weekly timesheets", "Approval workflows", "Calendar sync"],
      color: "text-primary"
    },
    {
      title: "Task",
      description: "Project and task management",
      icon: CheckCircle2,
      features: ["Task boards", "Milestones", "Team collaboration"],
      color: "text-primary"
    }
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section - Google One Style */}
      <section className="relative py-16 lg:py-24">
        <div className="container">
          <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
            <h1 className="text-5xl font-normal tracking-tight sm:text-6xl lg:text-7xl text-foreground">
              More storage and Google AI
            </h1>
            <h2 className="text-4xl font-normal tracking-tight sm:text-5xl lg:text-6xl text-foreground">
              in one subscription
            </h2>
            
            <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed font-normal">
              More space for what matters, AI that helps you get more done and everything working 
              together across the Google apps that you love.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/login">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 rounded-full font-medium">
                  Sign up now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-16 lg:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-normal tracking-tight mb-4 text-foreground">
              Comprehensive Business Solutions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-normal">
              A consistent brand identity across all Slate AI modules
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {modules.map((module) => (
              <Card 
                key={module.title} 
                className="border border-border hover:shadow-elegant transition-all duration-300 bg-card rounded-2xl"
              >
                <CardHeader className="space-y-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <module.icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-normal mb-2">{module.title}</CardTitle>
                    <CardDescription className="text-base">
                      {module.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {module.features.map((feature) => (
                      <li key={feature} className="flex items-start text-sm text-muted-foreground">
                        <span className="mr-2 text-primary">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 lg:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-normal tracking-tight mb-4 text-foreground">
              Built for modern teams
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-normal">
              Everything you need to manage your workforce efficiently
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium">Attendance Tracking</h3>
              <p className="text-muted-foreground">
                One-click check-in/out with smart reminders and real-time monitoring
              </p>
            </div>

            <div className="space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium">Leave Management</h3>
              <p className="text-muted-foreground">
                Comprehensive leave tracking with automated approvals and balance tracking
              </p>
            </div>

            <div className="space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium">Analytics & Reports</h3>
              <p className="text-muted-foreground">
                Powerful insights with real-time dashboards and custom report generation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container text-center">
          <h2 className="text-4xl font-normal tracking-tight mb-4 text-foreground">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto font-normal">
            Join thousands of companies using Slate AI to streamline their operations
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 rounded-full font-medium">
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container">
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-normal">&copy; 2024 Slate AI. All rights reserved.</p>
            <div className="flex justify-center space-x-6 mt-4">
              <Link to="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
