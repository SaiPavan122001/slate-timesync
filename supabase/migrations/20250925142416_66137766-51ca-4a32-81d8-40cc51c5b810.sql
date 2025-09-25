-- Create dynamic roles table
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  is_system_role boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create permissions table
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module text NOT NULL, -- attendance, timesheets, leave_management, role_management
  action text NOT NULL, -- view, create, edit, delete, approve
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create user_role_assignments table (supports multiple roles per user)
CREATE TABLE public.user_role_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Create rbac_audit_logs table
CREATE TABLE public.rbac_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL, -- role_created, role_updated, role_deleted, permission_assigned, user_assigned
  entity_type text NOT NULL, -- role, permission, assignment
  entity_id uuid,
  changed_by uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles
CREATE POLICY "Super admin can manage roles" ON public.roles
FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "All authenticated users can view roles" ON public.roles
FOR SELECT USING (true);

-- RLS Policies for permissions  
CREATE POLICY "Super admin can manage permissions" ON public.permissions
FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "All authenticated users can view permissions" ON public.permissions
FOR SELECT USING (true);

-- RLS Policies for role_permissions
CREATE POLICY "Super admin can manage role permissions" ON public.role_permissions
FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "All authenticated users can view role permissions" ON public.role_permissions
FOR SELECT USING (true);

-- RLS Policies for user_role_assignments
CREATE POLICY "Super admin can manage user role assignments" ON public.user_role_assignments
FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their own role assignments" ON public.user_role_assignments
FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

-- RLS Policies for rbac_audit_logs
CREATE POLICY "Super admin can view audit logs" ON public.rbac_audit_logs
FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can create audit logs" ON public.rbac_audit_logs
FOR INSERT WITH CHECK (true);

-- Insert default permissions
INSERT INTO public.permissions (module, action, description) VALUES
-- Attendance permissions
('attendance', 'view', 'View attendance records'),
('attendance', 'create', 'Mark attendance (check-in/out)'),
('attendance', 'edit', 'Edit attendance records'),
('attendance', 'delete', 'Delete attendance records'),
('attendance', 'approve', 'Approve attendance corrections'),
-- Timesheet permissions
('timesheets', 'view', 'View timesheet entries'),
('timesheets', 'create', 'Create timesheet entries'),
('timesheets', 'edit', 'Edit timesheet entries'),
('timesheets', 'delete', 'Delete timesheet entries'),
('timesheets', 'approve', 'Approve/reject timesheets'),
-- Leave management permissions
('leave_management', 'view', 'View leave requests'),
('leave_management', 'create', 'Apply for leave'),
('leave_management', 'edit', 'Edit leave requests'),
('leave_management', 'delete', 'Cancel leave requests'),
('leave_management', 'approve', 'Approve/reject leave requests'),
-- Role management permissions
('role_management', 'view', 'View roles and permissions'),
('role_management', 'create', 'Create new roles'),
('role_management', 'edit', 'Edit roles and permissions'),
('role_management', 'delete', 'Delete roles'),
('role_management', 'assign', 'Assign roles to users');

-- Insert default roles
INSERT INTO public.roles (name, description, is_system_role) VALUES
('Super Admin', 'Full system control including role customization', true),
('HR Admin', 'Manage Attendance, Leave Policies, Employee Timesheets', true),
('Manager', 'View team Attendance, Approve team Timesheets and Leave requests', true),
('Employee', 'Mark own Attendance, Submit own Timesheets, Apply for Leave', true);

-- Get role IDs for permission assignments
DO $$
DECLARE
    super_admin_id uuid;
    hr_admin_id uuid;
    manager_id uuid;
    employee_id uuid;
BEGIN
    SELECT id INTO super_admin_id FROM public.roles WHERE name = 'Super Admin';
    SELECT id INTO hr_admin_id FROM public.roles WHERE name = 'HR Admin';
    SELECT id INTO manager_id FROM public.roles WHERE name = 'Manager';
    SELECT id INTO employee_id FROM public.roles WHERE name = 'Employee';

    -- Super Admin gets all permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT super_admin_id, id FROM public.permissions;

    -- HR Admin permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT hr_admin_id, p.id FROM public.permissions p
    WHERE p.module IN ('attendance', 'timesheets', 'leave_management')
    AND p.action IN ('view', 'create', 'edit', 'approve');

    -- Manager permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT manager_id, p.id FROM public.permissions p
    WHERE (p.module = 'attendance' AND p.action IN ('view', 'edit'))
    OR (p.module = 'timesheets' AND p.action IN ('view', 'approve'))
    OR (p.module = 'leave_management' AND p.action IN ('view', 'approve'));

    -- Employee permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT employee_id, p.id FROM public.permissions p
    WHERE (p.module = 'attendance' AND p.action IN ('view', 'create'))
    OR (p.module = 'timesheets' AND p.action IN ('view', 'create', 'edit'))
    OR (p.module = 'leave_management' AND p.action IN ('view', 'create', 'edit'));
END $$;

-- Create functions for permission checking
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.role_permissions rp ON ura.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ura.user_id = _user_id
    AND p.module = _module
    AND p.action = _action
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(module text, action text, description text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.module, p.action, p.description
  FROM public.user_role_assignments ura
  JOIN public.role_permissions rp ON ura.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ura.user_id = _user_id
$$;

-- Migrate existing user roles to new system
INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT 
  ur.user_id,
  r.id
FROM public.user_roles ur
JOIN public.roles r ON 
  CASE ur.role
    WHEN 'super_admin' THEN 'Super Admin'
    WHEN 'hr' THEN 'HR Admin'
    WHEN 'manager' THEN 'Manager'
    WHEN 'employee' THEN 'Employee'
  END = r.name;

-- Add updated_at trigger for roles
CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit trigger for roles
CREATE OR REPLACE FUNCTION public.log_rbac_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rbac_audit_logs (action, entity_type, entity_id, new_values, changed_by)
    VALUES (TG_TABLE_NAME || '_created', TG_TABLE_NAME, NEW.id, row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.rbac_audit_logs (action, entity_type, entity_id, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME || '_updated', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.rbac_audit_logs (action, entity_type, entity_id, old_values, changed_by)
    VALUES (TG_TABLE_NAME || '_deleted', TG_TABLE_NAME, OLD.id, row_to_json(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rbac_audit_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.log_rbac_changes();

CREATE TRIGGER rbac_audit_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.log_rbac_changes();

CREATE TRIGGER rbac_audit_user_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.log_rbac_changes();