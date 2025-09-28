import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamMembersList } from "@/components/team/TeamMembersList";
import { OrganizationChart } from "@/components/team/OrganizationChart";
import { DepartmentManager } from "@/components/team/DepartmentManager";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const TeamManagement = () => {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only allow HR and super admin to access team management
  const hasAccess = userRole === 'super_admin' || userRole === 'hr' || userRole === 'manager';
  
  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access team management features.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Team Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization's team structure, departments, and employee hierarchy
        </p>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="organization">Organization Chart</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                View and manage all team members, their roles, and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamMembersList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Chart</CardTitle>
              <CardDescription>
                Visualize your organization's hierarchy and reporting structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle>Department Management</CardTitle>
              <CardDescription>
                Create and manage departments, assign managers and team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DepartmentManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamManagement;