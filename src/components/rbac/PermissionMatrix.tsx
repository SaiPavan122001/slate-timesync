import { useEffect, useState } from 'react';
import { useRBAC, Role, Permission } from '@/hooks/useRBAC';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function PermissionMatrix() {
  const { 
    roles, 
    permissions, 
    rolePermissions, 
    assignPermissionToRole, 
    removePermissionFromRole,
    loading 
  } = useRBAC();

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handlePermissionToggle = async (roleId: string, permissionId: string, isChecked: boolean) => {
    try {
      if (isChecked) {
        await assignPermissionToRole(roleId, permissionId);
      } else {
        await removePermissionFromRole(roleId, permissionId);
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
    }
  };

  const isPermissionAssigned = (roleId: string, permissionId: string): boolean => {
    const rolePerms = rolePermissions[roleId] || [];
    return rolePerms.some(p => p.id === permissionId);
  };

  const getModuleDisplayName = (module: string) => {
    const moduleNames: Record<string, string> = {
      'attendance': 'Attendance Management',
      'timesheets': 'Timesheet Management', 
      'leave_management': 'Leave Management',
      'role_management': 'Role Management'
    };
    return moduleNames[module] || module;
  };

  const getActionDisplayName = (action: string) => {
    const actionNames: Record<string, string> = {
      'view': 'View',
      'create': 'Create',
      'edit': 'Edit',
      'delete': 'Delete',
      'approve': 'Approve',
      'assign': 'Assign'
    };
    return actionNames[action] || action;
  };

  if (loading) {
    return <div className="text-center py-8">Loading permissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Permission Matrix</h3>
        <p className="text-sm text-muted-foreground">
          Assign permissions to roles. Changes are saved automatically.
        </p>
      </div>

      {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
        <Card key={module}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getModuleDisplayName(module)}
              <Badge variant="outline">{modulePermissions.length} permissions</Badge>
            </CardTitle>
            <CardDescription>
              Configure access permissions for {getModuleDisplayName(module).toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Permission</TableHead>
                    {roles.map((role) => (
                      <TableHead key={role.id} className="text-center min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">{role.name}</span>
                          {role.is_system_role && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modulePermissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {getActionDisplayName(permission.action)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {permission.description}
                          </div>
                        </div>
                      </TableCell>
                      {roles.map((role) => (
                        <TableCell key={role.id} className="text-center">
                          <Checkbox
                            checked={isPermissionAssigned(role.id, permission.id)}
                            onCheckedChange={(checked) => 
                              handlePermissionToggle(role.id, permission.id, checked as boolean)
                            }
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(permissionsByModule).length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No permissions found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}