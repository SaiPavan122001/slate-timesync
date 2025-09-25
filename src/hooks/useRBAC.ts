import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  permission: Permission;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by?: string;
  assigned_at: string;
  role: Role;
}

export function useRBAC() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Permission[]>>({});
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all roles
  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch roles",
        variant: "destructive",
      });
    }
  };

  // Fetch all permissions
  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module')
        .order('action');

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch permissions",
        variant: "destructive",
      });
    }
  };

  // Fetch role permissions
  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          id,
          role_id,
          permission_id,
          permission:permissions(*)
        `);

      if (error) throw error;

      // Group permissions by role
      const grouped = (data || []).reduce((acc, item) => {
        if (!acc[item.role_id]) {
          acc[item.role_id] = [];
        }
        acc[item.role_id].push(item.permission);
        return acc;
      }, {} as Record<string, Permission[]>);

      setRolePermissions(grouped);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch role permissions",
        variant: "destructive",
      });
    }
  };

  // Fetch current user's permissions
  const fetchUserPermissions = async (userId?: string) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_permissions', { _user_id: userId });

      if (error) throw error;
      
      // Map the RPC result to Permission interface
      const mappedPermissions: Permission[] = (data || []).map((item: any) => ({
        id: '', // RPC doesn't return ID, but we don't need it for permission checking
        module: item.module,
        action: item.action,
        description: item.description,
        created_at: new Date().toISOString(), // Placeholder since RPC doesn't return this
      }));
      
      setUserPermissions(mappedPermissions);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  };

  // Check if user has specific permission
  const hasPermission = (module: string, action: string): boolean => {
    return userPermissions.some(p => p.module === module && p.action === action);
  };

  // Create new role
  const createRole = async (roleData: { name: string; description?: string }) => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert([{
          ...roleData,
          is_system_role: false
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchRoles();
      toast({
        title: "Success",
        description: "Role created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating role:', error);
      toast({
        title: "Error",
        description: "Failed to create role",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update role
  const updateRole = async (roleId: string, updates: { name?: string; description?: string }) => {
    try {
      const { error } = await supabase
        .from('roles')
        .update(updates)
        .eq('id', roleId);

      if (error) throw error;

      await fetchRoles();
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Delete role
  const deleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      await fetchRoles();
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Assign permission to role
  const assignPermissionToRole = async (roleId: string, permissionId: string) => {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .insert([{ role_id: roleId, permission_id: permissionId }]);

      if (error) throw error;

      await fetchRolePermissions();
      toast({
        title: "Success",
        description: "Permission assigned successfully",
      });
    } catch (error) {
      console.error('Error assigning permission:', error);
      toast({
        title: "Error",
        description: "Failed to assign permission",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Remove permission from role
  const removePermissionFromRole = async (roleId: string, permissionId: string) => {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_id', permissionId);

      if (error) throw error;

      await fetchRolePermissions();
      toast({
        title: "Success",
        description: "Permission removed successfully",
      });
    } catch (error) {
      console.error('Error removing permission:', error);
      toast({
        title: "Error",
        description: "Failed to remove permission",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Assign role to user
  const assignRoleToUser = async (userId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_role_assignments')
        .insert([{ user_id: userId, role_id: roleId }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role assigned to user successfully",
      });
    } catch (error) {
      console.error('Error assigning role to user:', error);
      toast({
        title: "Error",
        description: "Failed to assign role to user",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Remove role from user
  const removeRoleFromUser = async (userId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_role_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role removed from user successfully",
      });
    } catch (error) {
      console.error('Error removing role from user:', error);
      toast({
        title: "Error",
        description: "Failed to remove role from user",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Get user roles
  const getUserRoles = async (userId: string): Promise<UserRoleAssignment[]> => {
    try {
      const { data, error } = await supabase
        .from('user_role_assignments')
        .select(`
          id,
          user_id,
          role_id,
          assigned_by,
          assigned_at,
          role:roles(*)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  };

  // Get all users with their roles
  const getUsersWithRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          email,
          first_name,
          last_name,
          employee_id,
          department,
          job_title
        `);

      if (error) throw error;

      // Get role assignments for all users
      const userIds = data?.map(u => u.user_id) || [];
      const { data: assignments } = await supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          role:roles(id, name)
        `)
        .in('user_id', userIds);

      // Group assignments by user
      const assignmentsByUser = (assignments || []).reduce((acc, assignment) => {
        if (!acc[assignment.user_id]) {
          acc[assignment.user_id] = [];
        }
        acc[assignment.user_id].push(assignment.role);
        return acc;
      }, {} as Record<string, any[]>);

      // Combine user data with role assignments
      const usersWithRoles = (data || []).map(user => ({
        ...user,
        roles: assignmentsByUser[user.user_id] || []
      }));

      return usersWithRoles;
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users with roles",
        variant: "destructive",
      });
      return [];
    }
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchRoles(),
        fetchPermissions(),
        fetchRolePermissions()
      ]);
      setLoading(false);
    };

    initializeData();
  }, []);

  return {
    // State
    roles,
    permissions,
    rolePermissions,
    userPermissions,
    loading,
    
    // Role management
    createRole,
    updateRole,
    deleteRole,
    
    // Permission management
    assignPermissionToRole,
    removePermissionFromRole,
    
    // User role assignment
    assignRoleToUser,
    removeRoleFromUser,
    getUserRoles,
    getUsersWithRoles,
    
    // Permission checking
    hasPermission,
    fetchUserPermissions,
    
    // Refresh functions
    fetchRoles,
    fetchPermissions,
    fetchRolePermissions,
  };
}