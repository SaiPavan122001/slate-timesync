-- Fix function search path security issues
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

-- Update the log_rbac_changes function to have proper search path
CREATE OR REPLACE FUNCTION public.log_rbac_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;