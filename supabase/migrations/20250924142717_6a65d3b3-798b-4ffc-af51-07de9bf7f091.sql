-- Create attendance policies table for super admin configuration
CREATE TABLE public.attendance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  working_hours_start TIME NOT NULL DEFAULT '09:00:00',
  working_hours_end TIME NOT NULL DEFAULT '17:00:00',
  break_duration_minutes INTEGER DEFAULT 60,
  grace_period_minutes INTEGER DEFAULT 15,
  overtime_threshold_hours NUMERIC DEFAULT 8,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create holidays table
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance audit logs table
CREATE TABLE public.attendance_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'corrected'
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance reminders table
CREATE TABLE public.attendance_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  reminder_type TEXT NOT NULL, -- 'check_in', 'check_out'
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_policies
CREATE POLICY "Everyone can view active attendance policies" 
ON public.attendance_policies 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only super_admin can manage attendance policies" 
ON public.attendance_policies 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for holidays
CREATE POLICY "Everyone can view holidays" 
ON public.holidays 
FOR SELECT 
USING (true);

CREATE POLICY "Only super_admin and HR can manage holidays" 
ON public.holidays 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

-- RLS Policies for attendance_audit_logs
CREATE POLICY "Users can view audit logs for their own attendance" 
ON public.attendance_audit_logs 
FOR SELECT 
USING (
  attendance_id IN (
    SELECT id FROM public.attendance 
    WHERE profile_id = get_profile_id(auth.uid())
  ) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'hr'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Only authorized roles can create audit logs" 
ON public.attendance_audit_logs 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'hr'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- RLS Policies for attendance_reminders
CREATE POLICY "Users can view their own reminders" 
ON public.attendance_reminders 
FOR SELECT 
USING (profile_id = get_profile_id(auth.uid()));

CREATE POLICY "System can manage reminders" 
ON public.attendance_reminders 
FOR ALL 
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_attendance_policies_updated_at
BEFORE UPDATE ON public.attendance_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_holidays_updated_at
BEFORE UPDATE ON public.holidays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default attendance policy
INSERT INTO public.attendance_policies (
  name, 
  description, 
  working_hours_start, 
  working_hours_end, 
  break_duration_minutes, 
  grace_period_minutes,
  overtime_threshold_hours
) VALUES (
  'Default Policy',
  'Standard 9-to-5 working hours with 1-hour break',
  '09:00:00',
  '17:00:00',
  60,
  15,
  8
);

-- Create function to automatically create audit logs
CREATE OR REPLACE FUNCTION public.create_attendance_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create audit log for corrections (when is_corrected changes to true)
  IF TG_OP = 'UPDATE' AND NEW.is_corrected = true AND (OLD.is_corrected IS NULL OR OLD.is_corrected = false) THEN
    INSERT INTO public.attendance_audit_logs (
      attendance_id,
      changed_by,
      action,
      old_values,
      new_values,
      reason
    ) VALUES (
      NEW.id,
      NEW.corrected_by,
      'corrected',
      row_to_json(OLD),
      row_to_json(NEW),
      NEW.correction_reason
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger to attendance table
CREATE TRIGGER attendance_audit_trigger
AFTER UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.create_attendance_audit_log();