-- Update has_role function to check both legacy and RBAC systems
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check legacy user_roles table
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) OR EXISTS (
    -- Check RBAC user_role_assignments table
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = _user_id
    AND (
      -- Map RBAC role names to legacy app_role enum
      (_role = 'super_admin' AND (LOWER(r.name) = 'super admin' OR LOWER(r.name) = 'admin')) OR
      (_role = 'hr' AND (LOWER(r.name) = 'hr admin' OR LOWER(r.name) = 'hr')) OR
      (_role = 'manager' AND LOWER(r.name) = 'manager') OR
      (_role = 'employee' AND LOWER(r.name) = 'employee')
    )
  )
$$;