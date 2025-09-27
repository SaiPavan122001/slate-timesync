import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useLeave } from '@/hooks/useLeave';

const leaveRequestSchema = z.object({
  leave_type_id: z.string().min(1, 'Please select a leave type'),
  start_date: z.date({
    required_error: 'Start date is required',
  }),
  end_date: z.date({
    required_error: 'End date is required',
  }),
  leave_duration: z.enum(['full_day', 'half_day', 'hourly']),
  hours: z.number().optional(),
  reason: z.string().optional(),
}).refine((data) => {
  return data.end_date >= data.start_date;
}, {
  message: 'End date must be after or equal to start date',
  path: ['end_date'],
}).refine((data) => {
  if (data.leave_duration === 'hourly' && !data.hours) {
    return false;
  }
  return true;
}, {
  message: 'Hours are required for hourly leave',
  path: ['hours'],
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

export default function LeaveRequestForm() {
  const { leaveTypes, createLeaveRequest, calculateWorkingDays } = useLeave();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leave_duration: 'full_day',
    },
  });

  const watchedValues = form.watch();
  const startDate = watchedValues.start_date;
  const endDate = watchedValues.end_date;
  const leaveDuration = watchedValues.leave_duration;

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    
    if (leaveDuration === 'half_day') {
      return calculateWorkingDays(startStr, endStr, true);
    } else if (leaveDuration === 'hourly') {
      return (watchedValues.hours || 0) / 8; // Assuming 8 hours per day
    } else {
      return calculateWorkingDays(startStr, endStr, false);
    }
  };

  const onSubmit = async (data: LeaveRequestFormData) => {
    setIsSubmitting(true);
    
    try {
      const startStr = format(data.start_date, 'yyyy-MM-dd');
      const endStr = format(data.end_date, 'yyyy-MM-dd');
      
      let daysRequested = calculateDays();
      
      const result = await createLeaveRequest({
        leave_type_id: data.leave_type_id,
        start_date: startStr,
        end_date: endStr,
        days_requested: daysRequested,
        reason: data.reason,
      });

      if (!result.error) {
        form.reset();
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="leave_type_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Leave Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {leaveTypes.map((leaveType) => (
                      <SelectItem key={leaveType.id} value={leaveType.id}>
                        {leaveType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="leave_duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Leave Duration</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="full_day" id="full_day" />
                      <Label htmlFor="full_day">Full Day</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="half_day" id="half_day" />
                      <Label htmlFor="half_day">Half Day</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hourly" id="hourly" />
                      <Label htmlFor="hourly">Hourly</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
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
                      disabled={(date) => date < new Date()}
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
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
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
                      disabled={(date) => 
                        date < new Date() || (startDate && date < startDate)
                      }
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {leaveDuration === 'hourly' && (
          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hours</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(value) => field.onChange(Number(value))} 
                    value={field.value?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select hours" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 16 }, (_, i) => (i + 1) * 0.5).map((hours) => (
                        <SelectItem key={hours} value={hours.toString()}>
                          {hours} {hours === 1 ? 'hour' : 'hours'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please provide a reason for your leave request..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide additional context for your leave request
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {startDate && endDate && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">
              Days Requested: {calculateDays()} {leaveDuration === 'hourly' ? 'equivalent days' : 'working days'}
            </p>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
        </Button>
      </form>
    </Form>
  );
}