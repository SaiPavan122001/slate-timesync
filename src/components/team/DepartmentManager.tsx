import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Users, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  job_title: string | null;
  manager_id: string | null;
}

interface Department {
  name: string;
  members: Profile[];
  manager?: Profile;
}

export function DepartmentManager() {
  const [departments, setDepartments] = useState<Record<string, Department>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [newDepartmentForm, setNewDepartmentForm] = useState({
    name: "",
    description: "",
    manager_id: "",
  });

  const { toast } = useToast();
  const { userRole } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, department, job_title, manager_id')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;

      setProfiles(data || []);
      organizeDepartments(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch department data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const organizeDepartments = (profilesData: Profile[]) => {
    const deptMap: Record<string, Department> = {};

    profilesData.forEach((profile) => {
      const deptName = profile.department || 'Unassigned';
      
      if (!deptMap[deptName]) {
        deptMap[deptName] = {
          name: deptName,
          members: [],
        };
      }
      
      deptMap[deptName].members.push(profile);
      
      // Find department manager (could be improved with a proper manager hierarchy)
      if (profile.job_title?.toLowerCase().includes('manager') || 
          profile.job_title?.toLowerCase().includes('lead') ||
          profile.job_title?.toLowerCase().includes('head')) {
        deptMap[deptName].manager = profile;
      }
    });

    setDepartments(deptMap);
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentForm.name.trim()) {
      toast({
        title: "Error",
        description: "Department name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      // For now, we'll just update the manager's profile to reflect the new department
      // In a real app, you might have a separate departments table
      if (newDepartmentForm.manager_id) {
        const { error } = await supabase
          .from('profiles')
          .update({ department: newDepartmentForm.name })
          .eq('id', newDepartmentForm.manager_id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Department created successfully",
      });

      setIsCreateDialogOpen(false);
      setNewDepartmentForm({ name: "", description: "", manager_id: "" });
      fetchData();
    } catch (error) {
      console.error('Error creating department:', error);
      toast({
        title: "Error",
        description: "Failed to create department",
        variant: "destructive",
      });
    }
  };

  const handleAssignToDepartment = async (profileId: string, departmentName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ department: departmentName === 'Unassigned' ? null : departmentName })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member assigned successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error assigning to department:', error);
      toast({
        title: "Error",
        description: "Failed to assign team member",
        variant: "destructive",
      });
    }
  };

  const getUnassignedProfiles = () => {
    return profiles.filter(p => !p.department);
  };

  const canManageDepartments = userRole === 'super_admin' || userRole === 'hr';

  if (loading) {
    return <div className="text-center">Loading departments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      {canManageDepartments && (
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Departments Overview</h3>
            <p className="text-sm text-muted-foreground">
              Manage departments and assign team members
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Department</DialogTitle>
                <DialogDescription>
                  Add a new department and assign a manager
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dept-name">Department Name</Label>
                  <Input
                    id="dept-name"
                    value={newDepartmentForm.name}
                    onChange={(e) => setNewDepartmentForm({ 
                      ...newDepartmentForm, 
                      name: e.target.value 
                    })}
                    placeholder="e.g., Engineering, Marketing, Sales"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dept-description">Description</Label>
                  <Textarea
                    id="dept-description"
                    value={newDepartmentForm.description}
                    onChange={(e) => setNewDepartmentForm({ 
                      ...newDepartmentForm, 
                      description: e.target.value 
                    })}
                    placeholder="Department description (optional)"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dept-manager">Department Manager</Label>
                  <Select 
                    value={newDepartmentForm.manager_id} 
                    onValueChange={(value) => setNewDepartmentForm({ 
                      ...newDepartmentForm, 
                      manager_id: value 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.first_name} {profile.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDepartment}>
                  Create Department
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(departments).map((dept) => (
          <Card key={dept.name} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{dept.name}</CardTitle>
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {dept.members.length}
                </Badge>
              </div>
              {dept.manager && (
                <CardDescription className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4" />
                  <span>
                    Manager: {dept.manager.first_name} {dept.manager.last_name}
                  </span>
                </CardDescription>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                {dept.members.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-sm">
                    <span>{member.first_name} {member.last_name}</span>
                    {canManageDepartments && (
                      <Select
                        value={member.department || 'Unassigned'}
                        onValueChange={(value) => handleAssignToDepartment(member.id, value)}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unassigned">Unassigned</SelectItem>
                          {Object.keys(departments)
                            .filter(name => name !== 'Unassigned')
                            .map(deptName => (
                              <SelectItem key={deptName} value={deptName}>
                                {deptName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
                
                {dept.members.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ... and {dept.members.length - 5} more
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{Object.keys(departments).length}</div>
              <div className="text-sm text-muted-foreground">Total Departments</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{profiles.length}</div>
              <div className="text-sm text-muted-foreground">Total Team Members</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Object.values(departments).filter(d => d.manager).length}
              </div>
              <div className="text-sm text-muted-foreground">Departments with Managers</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {getUnassignedProfiles().length}
              </div>
              <div className="text-sm text-muted-foreground">Unassigned Members</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}