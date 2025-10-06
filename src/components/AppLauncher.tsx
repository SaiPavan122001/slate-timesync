import { useState } from "react"
import { Search, X, Star, Users, Clock, DollarSign, CheckCircle2, MessageSquare, BarChart3, FileText, CalendarDays, Building2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link } from "react-router-dom"

interface AppLauncherProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const apps = [
  {
    id: 1,
    name: "HR Connect",
    description: "Employee directory & communication",
    icon: MessageSquare,
    category: "PEOPLE",
    favorite: true,
    route: "/dashboard"
  },
  {
    id: 2,
    name: "Tasks",
    description: "Task management & collaboration",
    icon: CheckCircle2,
    category: "PRODUCTIVITY",
    favorite: true,
    route: "/dashboard"
  },
  {
    id: 3,
    name: "HRMS",
    description: "Complete HR management system",
    icon: Users,
    category: "PEOPLE",
    favorite: false,
    route: "/team-management"
  },
  {
    id: 4,
    name: "Timesheet",
    description: "Time tracking & management",
    icon: Clock,
    category: "PRODUCTIVITY",
    favorite: false,
    route: "/timesheets"
  },
  {
    id: 5,
    name: "Payroll",
    description: "Automated payroll processing",
    icon: DollarSign,
    category: "ADMIN",
    favorite: false,
    route: "/dashboard"
  },
  {
    id: 6,
    name: "Analytics",
    description: "Data insights & reporting",
    icon: BarChart3,
    category: "ANALYTICS",
    favorite: false,
    route: "/dashboard"
  },
  {
    id: 7,
    name: "Attendance",
    description: "Attendance tracking & monitoring",
    icon: CalendarDays,
    category: "PEOPLE",
    favorite: false,
    route: "/attendance"
  },
  {
    id: 8,
    name: "Leave Management",
    description: "Leave requests & approvals",
    icon: FileText,
    category: "PEOPLE",
    favorite: false,
    route: "/leave"
  },
  {
    id: 9,
    name: "Role Management",
    description: "User roles & permissions",
    icon: Building2,
    category: "ADMIN",
    favorite: false,
    route: "/role-management"
  }
]

const categories = ["ALL", "PEOPLE", "PRODUCTIVITY", "ANALYTICS", "ADMIN"]

export function AppLauncher({ open, onOpenChange }: AppLauncherProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "ALL" || app.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const favoriteApps = filteredApps.filter(app => app.favorite)
  const allApps = filteredApps.filter(app => !app.favorite)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-normal">App Launcher</DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category ? "bg-primary hover:bg-primary/90" : ""}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Favorites Section */}
        {favoriteApps.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary fill-primary" />
              <h3 className="text-sm font-medium">Favorites</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {favoriteApps.map((app) => (
                <Link
                  key={app.id}
                  to={app.route}
                  onClick={() => onOpenChange(false)}
                  className="block"
                >
                  <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:shadow-md transition-all cursor-pointer bg-card">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <app.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm mb-1">{app.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{app.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Apps Section */}
        {allApps.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">All Apps</h3>
            <div className="grid grid-cols-2 gap-4">
              {allApps.map((app) => (
                <Link
                  key={app.id}
                  to={app.route}
                  onClick={() => onOpenChange(false)}
                  className="block"
                >
                  <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:shadow-md transition-all cursor-pointer bg-card">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <app.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm mb-1">{app.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{app.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {filteredApps.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No apps found matching your search.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
