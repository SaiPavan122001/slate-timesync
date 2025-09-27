import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useLeave } from '@/hooks/useLeave';

const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  max_days_per_year: z.number().min(0).optional(),
  is_carry_forward: z.boolean(),
});

type LeaveTypeFormData = z.infer<typeof leaveTypeSchema>;

export default function LeaveTypeManager() {
  const { leaveTypes, createLeaveType, updateLeaveType, deleteLeaveType, loading } = useLeave();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);

  const form = useForm<LeaveTypeFormData>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      max_days_per_year: undefined,
      is_carry_forward: false,
    },
  });

  const onSubmit = async (data: LeaveTypeFormData) => {
    const formData = {
      name: data.name,
      description: data.description,
      max_days_per_year: data.max_days_per_year || undefined,
      is_carry_forward: data.is_carry_forward,
    };

    if (editingType) {
      await updateLeaveType(editingType.id, formData);
    } else {
      await createLeaveType(formData);
    }

    setDialogOpen(false);
    setEditingType(null);
    form.reset();
  };

  const handleEdit = (leaveType: any) => {
    setEditingType(leaveType);
    form.reset({
      name: leaveType.name,
      description: leaveType.description || '',
      max_days_per_year: leaveType.max_days_per_year || undefined,
      is_carry_forward: leaveType.is_carry_forward,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteLeaveType(id);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingType(null);
    form.reset();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Leave Types</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Leave Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Edit Leave Type' : 'Create Leave Type'}
              </DialogTitle>
              <DialogDescription>
                {editingType 
                  ? 'Update the leave type details below'
                  : 'Add a new leave type to the system'
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Annual Leave" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Description of this leave type..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_days_per_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Days Per Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="25"
                          {...field}
                          onChange={(e) => field.onChange(
                            e.target.value ? Number(e.target.value) : undefined
                          )}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave blank for unlimited days
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_carry_forward"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Carry Forward</FormLabel>
                        <FormDescription>
                          Allow unused days to be carried to next year
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingType ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {leaveTypes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No leave types configured. Add your first leave type to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Max Days/Year</TableHead>
                <TableHead>Carry Forward</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes.map((leaveType) => (
                <TableRow key={leaveType.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{leaveType.name}</div>
                      {leaveType.description && (
                        <div className="text-sm text-muted-foreground">
                          {leaveType.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {leaveType.max_days_per_year || 'Unlimited'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={leaveType.is_carry_forward ? 'default' : 'secondary'}>
                      {leaveType.is_carry_forward ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={leaveType.is_active ? 'default' : 'secondary'}>
                      {leaveType.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(leaveType)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Leave Type</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{leaveType.name}"? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(leaveType.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}