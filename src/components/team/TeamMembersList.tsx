import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, UserPlus, Mail, Phone, MapPin, Calendar, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string | null;
  department: string | null;
  job_title: string | null;
  hire_date: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  user_roles?: {
    role: string;
  }[];
}

export function TeamMembersList() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    department: "",
    job_title: "",
    hire_date: "",
  });

  const { toast } = useToast();
  const { userRole } = useAuth();

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchTerm, departmentFilter, roleFilter]);

  const fetchProfiles = async () => {
    try {
      // Fetch profiles with both legacy roles and RBAC roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role)
        `)
        .eq('is_active', true)
        .order('first_name');

      if (profilesError) throw profilesError;

      // Fetch RBAC role assignments for all users
      const { data: rbacRoles, error: rbacError } = await supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          roles(name)
        `);

      if (rbacError) throw rbacError;

      // Merge legacy and RBAC roles
      const enrichedProfiles = profilesData?.map(profile => {
        const legacyRoles = profile.user_roles || [];
        const userRbacRoles = rbacRoles
          ?.filter(r => r.user_id === profile.user_id)
          .map(r => ({ role: r.roles?.name })) || [];
        
        return {
          ...profile,
          user_roles: [...legacyRoles, ...userRbacRoles]
        };
      });

      setProfiles(enrichedProfiles || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch team members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProfiles = () => {
    let filtered = [...profiles];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(profile =>
        `${profile.first_name} ${profile.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter(profile => profile.department === departmentFilter);
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(profile =>
        profile.user_roles?.some(ur => ur.role === roleFilter)
      );
    }

    setFilteredProfiles(filtered);
  };

  const handleEditMember = (profile: Profile) => {
    setSelectedMember(profile);
    setEditForm({
      department: profile.department || "",
      job_title: profile.job_title || "",
      hire_date: profile.hire_date || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          department: editForm.department || null,
          job_title: editForm.job_title || null,
          hire_date: editForm.hire_date || null,
        })
        .eq('id', selectedMember.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member updated successfully",
      });

      setIsEditDialogOpen(false);
      fetchProfiles();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update team member",
        variant: "destructive",
      });
    }
  };

  const handleDeactivateMember = async (profileId: string) => {
    if (!confirm("Are you sure you want to deactivate this team member?")) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member deactivated successfully",
      });

      fetchProfiles();
    } catch (error) {
      console.error('Error deactivating profile:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate team member",
        variant: "destructive",
      });
    }
  };

  const getDepartments = () => {
    const depts = new Set(profiles.map(p => p.department).filter(Boolean));
    return Array.from(depts);
  };

  const getRoles = () => {
    const roles = new Set();
    profiles.forEach(p => {
      p.user_roles?.forEach(ur => roles.add(ur.role));
    });
    return Array.from(roles);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'hr': return 'default';
      case 'manager': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="text-center">Loading team members...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {getDepartments().map(dept => (
              <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {getRoles().map(role => (
              <SelectItem key={role as string} value={role as string}>
                {(role as string).replace('_', ' ').toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProfiles.map((profile) => (
          <Card key={profile.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {profile.first_name[0]}{profile.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {profile.first_name} {profile.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {profile.employee_id}
                    </p>
                  </div>
                </div>
                
                {(userRole === 'super_admin' || userRole === 'hr') && (
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditMember(profile)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeactivateMember(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{profile.email}</span>
                </div>
                
                {profile.department && (
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.department}</span>
                  </div>
                )}
                
                {profile.job_title && (
                  <p className="text-sm font-medium">{profile.job_title}</p>
                )}
                
                {profile.hire_date && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined {new Date(profile.hire_date).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mt-3">
                  {profile.user_roles?.map((ur) => (
                    <Badge
                      key={ur.role}
                      variant={getRoleBadgeVariant(ur.role)}
                      className="text-xs"
                    >
                      {ur.role.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProfiles.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No team members found matching your criteria.
        </div>
      )}

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                placeholder="Enter department"
              />
            </div>
            
            <div>
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={editForm.job_title}
                onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                placeholder="Enter job title"
              />
            </div>
            
            <div>
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input
                id="hire_date"
                type="date"
                value={editForm.hire_date}
                onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMember}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}