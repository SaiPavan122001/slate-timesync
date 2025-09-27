import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
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
import { useLeave } from '@/hooks/useLeave';

const holidaySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  date: z.date({
    required_error: 'Date is required',
  }),
  is_recurring: z.boolean(),
});

type HolidayFormData = z.infer<typeof holidaySchema>;

export default function HolidayManager() {
  const { holidays, createHoliday, updateHoliday, deleteHoliday, loading } = useLeave();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);

  const form = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: '',
      is_recurring: false,
    },
  });

  const onSubmit = async (data: HolidayFormData) => {
    const holidayData = {
      name: data.name,
      date: format(data.date, 'yyyy-MM-dd'),
      year: data.is_recurring ? undefined : data.date.getFullYear(),
      is_recurring: data.is_recurring,
    };

    if (editingHoliday) {
      await updateHoliday(editingHoliday.id, holidayData);
    } else {
      await createHoliday(holidayData);
    }

    setDialogOpen(false);
    setEditingHoliday(null);
    form.reset();
  };

  const handleEdit = (holiday: any) => {
    setEditingHoliday(holiday);
    form.reset({
      name: holiday.name,
      date: new Date(holiday.date),
      is_recurring: holiday.is_recurring,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteHoliday(id);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingHoliday(null);
    form.reset();
  };

  // Sort holidays by date
  const sortedHolidays = [...holidays].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

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
        <h3 className="text-lg font-medium">Holidays</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
              </DialogTitle>
              <DialogDescription>
                {editingHoliday 
                  ? 'Update the holiday details below'
                  : 'Add a new public holiday to the system'
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
                      <FormLabel>Holiday Name</FormLabel>
                      <FormControl>
                        <Input placeholder="New Year's Day" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_recurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Recurring</FormLabel>
                        <FormDescription>
                          This holiday occurs every year on the same date
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
                    {editingHoliday ? 'Update' : 'Add Holiday'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {sortedHolidays.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No holidays configured. Add public holidays to help calculate leave days accurately.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holiday Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHolidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-medium">
                    {holiday.name}
                  </TableCell>
                  <TableCell>
                    {format(new Date(holiday.date), 'MMMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={holiday.is_recurring ? 'default' : 'secondary'}>
                      {holiday.is_recurring ? 'Recurring' : holiday.year || 'One-time'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(holiday)}
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
                            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{holiday.name}"? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(holiday.id)}
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