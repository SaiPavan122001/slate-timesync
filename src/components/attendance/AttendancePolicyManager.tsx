import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Settings, Plus, Edit, Trash2, Clock, Coffee, AlertTriangle } from 'lucide-react';
import { AttendancePolicy } from '@/hooks/useAttendance';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AttendancePolicyManagerProps {
  policies: AttendancePolicy[];
}

export function AttendancePolicyManager({ policies }: AttendancePolicyManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AttendancePolicy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    break_duration_minutes: 60,
    grace_period_minutes: 15,
    overtime_threshold_hours: 8,
    is_active: true,
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      working_hours_start: '09:00',
      working_hours_end: '17:00',
      break_duration_minutes: 60,
      grace_period_minutes: 15,
      overtime_threshold_hours: 8,
      is_active: true,
    });
  };

  const handleCreate = async () => {
    try {
      const { error } = await supabase
        .from('attendance_policies')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Policy Created",
        description: "Attendance policy has been created successfully.",
      });

      setShowCreateDialog(false);
      resetForm();
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Error creating policy:', error);
      toast({
        title: "Error",
        description: "Failed to create attendance policy.",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingPolicy) return;

    try {
      const { error } = await supabase
        .from('attendance_policies')
        .update(formData)
        .eq('id', editingPolicy.id);

      if (error) throw error;

      toast({
        title: "Policy Updated",
        description: "Attendance policy has been updated successfully.",
      });

      setEditingPolicy(null);
      resetForm();
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Error updating policy:', error);
      toast({
        title: "Error",
        description: "Failed to update attendance policy.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (policyId: string) => {
    try {
      const { error } = await supabase
        .from('attendance_policies')
        .delete()
        .eq('id', policyId);

      if (error) throw error;

      toast({
        title: "Policy Deleted",
        description: "Attendance policy has been deleted successfully.",
      });

      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Error deleting policy:', error);
      toast({
        title: "Error",
        description: "Failed to delete attendance policy.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (policy: AttendancePolicy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description || '',
      working_hours_start: policy.working_hours_start,
      working_hours_end: policy.working_hours_end,
      break_duration_minutes: policy.break_duration_minutes,
      grace_period_minutes: policy.grace_period_minutes,
      overtime_threshold_hours: policy.overtime_threshold_hours,
      is_active: policy.is_active,
    });
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Attendance Policies
            </CardTitle>
            <CardDescription>
              Configure working hours, break times, and attendance rules
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Attendance Policy</DialogTitle>
                <DialogDescription>
                  Set up a new attendance policy with custom rules.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Policy Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Standard Hours"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this policy..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.working_hours_start}
                      onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.working_hours_end}
                      onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="break_duration">Break Duration (min)</Label>
                    <Input
                      id="break_duration"
                      type="number"
                      value={formData.break_duration_minutes}
                      onChange={(e) => setFormData({ ...formData, break_duration_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grace_period">Grace Period (min)</Label>
                    <Input
                      id="grace_period"
                      type="number"
                      value={formData.grace_period_minutes}
                      onChange={(e) => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overtime_threshold">Overtime Threshold (hours)</Label>
                  <Input
                    id="overtime_threshold"
                    type="number"
                    step="0.5"
                    value={formData.overtime_threshold_hours}
                    onChange={(e) => setFormData({ ...formData, overtime_threshold_hours: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active Policy</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Policy</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {policies.map((policy) => (
            <Card key={policy.id} className="border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{policy.name}</CardTitle>
                    {policy.description && (
                      <CardDescription className="text-xs mt-1">
                        {policy.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => startEdit(policy)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleDelete(policy.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatTime(policy.working_hours_start)} - {formatTime(policy.working_hours_end)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-muted-foreground" />
                    <span>{policy.break_duration_minutes}min break</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span>{policy.grace_period_minutes}min grace</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{policy.overtime_threshold_hours}h overtime</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingPolicy} onOpenChange={(open) => !open && setEditingPolicy(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Attendance Policy</DialogTitle>
              <DialogDescription>
                Update the attendance policy settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Policy Name</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Hours"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this policy..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_start_time">Start Time</Label>
                  <Input
                    id="edit_start_time"
                    type="time"
                    value={formData.working_hours_start}
                    onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_end_time">End Time</Label>
                  <Input
                    id="edit_end_time"
                    type="time"
                    value={formData.working_hours_end}
                    onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_break_duration">Break Duration (min)</Label>
                  <Input
                    id="edit_break_duration"
                    type="number"
                    value={formData.break_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, break_duration_minutes: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_grace_period">Grace Period (min)</Label>
                  <Input
                    id="edit_grace_period"
                    type="number"
                    value={formData.grace_period_minutes}
                    onChange={(e) => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_overtime_threshold">Overtime Threshold (hours)</Label>
                <Input
                  id="edit_overtime_threshold"
                  type="number"
                  step="0.5"
                  value={formData.overtime_threshold_hours}
                  onChange={(e) => setFormData({ ...formData, overtime_threshold_hours: parseFloat(e.target.value) })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="edit_is_active">Active Policy</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPolicy(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Update Policy</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}