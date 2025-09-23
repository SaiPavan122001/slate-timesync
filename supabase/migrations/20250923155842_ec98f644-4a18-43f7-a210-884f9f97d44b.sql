-- Add missing RLS policies for remaining tables

-- RLS Policies for leave_types
CREATE POLICY "Everyone can view leave types"
  ON public.leave_types FOR SELECT
  USING (true);

CREATE POLICY "Only super_admin can manage leave types"
  ON public.leave_types FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super_admin can update leave types"
  ON public.leave_types FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super_admin can delete leave types"
  ON public.leave_types FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for leave_balances
CREATE POLICY "Users can view their own leave balances and managers can view team balances"
  ON public.leave_balances FOR SELECT
  USING (
    profile_id = public.get_profile_id(auth.uid()) OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'hr') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "HR and super_admin can manage leave balances"
  ON public.leave_balances FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'hr') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "HR and super_admin can update leave balances"
  ON public.leave_balances FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'hr') OR
    public.has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for leave_requests
CREATE POLICY "Users can view their own leave requests and managers can view team requests"
  ON public.leave_requests FOR SELECT
  USING (
    profile_id = public.get_profile_id(auth.uid()) OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'hr') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Employees can create their own leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (profile_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Employees can update their own pending leave requests"
  ON public.leave_requests FOR UPDATE
  USING (
    profile_id = public.get_profile_id(auth.uid()) AND status = 'pending'
  );

CREATE POLICY "Managers and HR can approve/reject leave requests"
  ON public.leave_requests FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'hr') OR
    public.has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for timesheets
CREATE POLICY "Users can view their own timesheets and managers can view team timesheets"
  ON public.timesheets FOR SELECT
  USING (
    profile_id = public.get_profile_id(auth.uid()) OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'hr') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Employees can create their own timesheets"
  ON public.timesheets FOR INSERT
  WITH CHECK (profile_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Employees can update their own draft timesheets"
  ON public.timesheets FOR UPDATE
  USING (
    (profile_id = public.get_profile_id(auth.uid()) AND status IN ('draft', 'rejected')) OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'hr') OR
    public.has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for timesheet_entries
CREATE POLICY "Users can view entries from their own timesheets and managers can view team entries"
  ON public.timesheet_entries FOR SELECT
  USING (
    timesheet_id IN (
      SELECT id FROM public.timesheets 
      WHERE profile_id = public.get_profile_id(auth.uid())
    ) OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'hr') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Employees can create entries for their own timesheets"
  ON public.timesheet_entries FOR INSERT
  WITH CHECK (
    timesheet_id IN (
      SELECT id FROM public.timesheets 
      WHERE profile_id = public.get_profile_id(auth.uid())
    )
  );

CREATE POLICY "Employees can update entries for their own draft/rejected timesheets"
  ON public.timesheet_entries FOR UPDATE
  USING (
    timesheet_id IN (
      SELECT id FROM public.timesheets 
      WHERE profile_id = public.get_profile_id(auth.uid()) 
      AND status IN ('draft', 'rejected')
    ) OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'hr') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Employees can delete entries from their own draft/rejected timesheets"
  ON public.timesheet_entries FOR DELETE
  USING (
    timesheet_id IN (
      SELECT id FROM public.timesheets 
      WHERE profile_id = public.get_profile_id(auth.uid()) 
      AND status IN ('draft', 'rejected')
    ) OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'hr') OR
    public.has_role(auth.uid(), 'super_admin')
  );