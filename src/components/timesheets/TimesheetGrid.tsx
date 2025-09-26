import { useState, useEffect } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { Plus, Save, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTimesheets, TimesheetEntry } from '@/hooks/useTimesheets';
import { cn } from '@/lib/utils';

interface TimesheetGridProps {
  currentWeek: Date;
}

export const TimesheetGrid = ({ currentWeek }: TimesheetGridProps) => {
  const { 
    currentTimesheet, 
    entries, 
    createOrGetTimesheet, 
    saveEntry, 
    deleteEntry, 
    submitTimesheet 
  } = useTimesheets();
  
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<TimesheetEntry>>({
    date: format(currentWeek, 'yyyy-MM-dd'),
    hours: 0,
    project_name: '',
    task_description: '',
    is_billable: false,
  });

  useEffect(() => {
    createOrGetTimesheet(currentWeek);
  }, [currentWeek]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  
  const getEntriesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.filter(entry => entry.date === dateStr);
  };

  const getTotalHoursForDate = (date: Date) => {
    return getEntriesForDate(date).reduce((sum, entry) => sum + entry.hours, 0);
  };

  const handleSaveEntry = async () => {
    if (!editingEntry && newEntry.hours && newEntry.hours > 0) {
      const success = await saveEntry({
        date: newEntry.date!,
        hours: newEntry.hours,
        project_name: newEntry.project_name || '',
        task_description: newEntry.task_description || '',
        is_billable: newEntry.is_billable || false,
      });
      
      if (success) {
        setNewEntry({
          date: format(currentWeek, 'yyyy-MM-dd'),
          hours: 0,
          project_name: '',
          task_description: '',
          is_billable: false,
        });
      }
    } else if (editingEntry) {
      const success = await saveEntry(editingEntry);
      if (success) {
        setEditingEntry(null);
      }
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    await deleteEntry(entryId);
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      newSet.delete(entryId);
      return newSet;
    });
  };

  const handleSubmitTimesheet = async () => {
    if (currentTimesheet) {
      await submitTimesheet(currentTimesheet.id);
    }
  };

  const canEdit = currentTimesheet?.status === 'draft' || currentTimesheet?.status === 'rejected';
  const totalWeekHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Weekly Timesheet</CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{totalWeekHours}h</p>
              </div>
              {currentTimesheet && (
                <Badge className={cn(
                  currentTimesheet.status === 'draft' && 'bg-gray-100 text-gray-800',
                  currentTimesheet.status === 'submitted' && 'bg-blue-100 text-blue-800',
                  currentTimesheet.status === 'approved' && 'bg-green-100 text-green-800',
                  currentTimesheet.status === 'rejected' && 'bg-red-100 text-red-800'
                )}>
                  {currentTimesheet.status}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-4 mb-6">
            {weekDays.map((day) => {
              const dayEntries = getEntriesForDate(day);
              const dayTotal = getTotalHoursForDate(day);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              
              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={cn(
                    'border rounded-lg p-3 min-h-[120px]',
                    isWeekend ? 'bg-muted/50' : 'bg-background',
                    dayTotal > 8 ? 'border-orange-200 bg-orange-50' : ''
                  )}
                >
                  <div className="text-center mb-2">
                    <p className="text-sm font-medium">{format(day, 'EEE')}</p>
                    <p className="text-xs text-muted-foreground">{format(day, 'MMM d')}</p>
                    <p className="text-sm font-semibold mt-1">{dayTotal}h</p>
                  </div>
                  
                  <div className="space-y-1">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          'text-xs p-1 rounded border cursor-pointer',
                          entry.is_billable ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200',
                          selectedEntries.has(entry.id!) ? 'ring-2 ring-primary' : ''
                        )}
                        onClick={() => canEdit && setEditingEntry(entry)}
                      >
                        <div className="font-medium">{entry.hours}h</div>
                        {entry.project_name && (
                          <div className="truncate">{entry.project_name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Entry Form */}
          {canEdit && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingEntry ? 'Edit Entry' : 'Add New Entry'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={editingEntry?.date || newEntry.date}
                      onChange={(e) => {
                        if (editingEntry) {
                          setEditingEntry({ ...editingEntry, date: e.target.value });
                        } else {
                          setNewEntry({ ...newEntry, date: e.target.value });
                        }
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="hours">Hours</Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.25"
                      min="0"
                      max="24"
                      value={editingEntry?.hours || newEntry.hours}
                      onChange={(e) => {
                        const hours = parseFloat(e.target.value) || 0;
                        if (editingEntry) {
                          setEditingEntry({ ...editingEntry, hours });
                        } else {
                          setNewEntry({ ...newEntry, hours });
                        }
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="project">Project</Label>
                    <Input
                      id="project"
                      placeholder="Project name"
                      value={editingEntry?.project_name || newEntry.project_name}
                      onChange={(e) => {
                        if (editingEntry) {
                          setEditingEntry({ ...editingEntry, project_name: e.target.value });
                        } else {
                          setNewEntry({ ...newEntry, project_name: e.target.value });
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="billable"
                      checked={editingEntry?.is_billable || newEntry.is_billable}
                      onCheckedChange={(checked) => {
                        if (editingEntry) {
                          setEditingEntry({ ...editingEntry, is_billable: !!checked });
                        } else {
                          setNewEntry({ ...newEntry, is_billable: !!checked });
                        }
                      }}
                    />
                    <Label htmlFor="billable">Billable</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Task Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the work performed..."
                    value={editingEntry?.task_description || newEntry.task_description}
                    onChange={(e) => {
                      if (editingEntry) {
                        setEditingEntry({ ...editingEntry, task_description: e.target.value });
                      } else {
                        setNewEntry({ ...newEntry, task_description: e.target.value });
                      }
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveEntry}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingEntry ? 'Update Entry' : 'Add Entry'}
                  </Button>
                  
                  {editingEntry && (
                    <>
                      <Button variant="outline" onClick={() => setEditingEntry(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => editingEntry.id && handleDeleteEntry(editingEntry.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {canEdit && entries.length > 0 && (
            <>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSubmitTimesheet}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Approval
                </Button>
              </div>
            </>
          )}

          {/* Rejection Reason */}
          {currentTimesheet?.status === 'rejected' && currentTimesheet.rejection_reason && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <h4 className="font-semibold text-red-800 mb-2">Rejection Reason:</h4>
                <p className="text-red-700">{currentTimesheet.rejection_reason}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};