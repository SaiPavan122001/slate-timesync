import { useState } from 'react';
import { format, addDays, parseISO, startOfDay } from 'date-fns';
import { Calendar, Upload, Download, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTimesheets, TimesheetEntry } from '@/hooks/useTimesheets';
import { useToast } from '@/hooks/use-toast';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}

interface CalendarImportProps {
  currentWeek: Date;
}

export const CalendarImport = ({ currentWeek }: CalendarImportProps) => {
  const [importedEvents, setImportedEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [projectMapping, setProjectMapping] = useState<Record<string, string>>({});
  const [billableMapping, setBillableMapping] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { createOrGetTimesheet, saveEntry } = useTimesheets();
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      
      // Parse ICS file
      if (file.name.endsWith('.ics')) {
        const events = parseICSFile(text);
        setImportedEvents(events);
        
        // Pre-select all events
        setSelectedEvents(new Set(events.map(e => e.id)));
        
        toast({
          title: "Success",
          description: `Imported ${events.length} calendar events`,
        });
      } else {
        throw new Error('Unsupported file format. Please use .ics files.');
      }
    } catch (error) {
      console.error('Error importing calendar:', error);
      toast({
        title: "Error",
        description: "Failed to import calendar events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const parseICSFile = (icsText: string): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const lines = icsText.split('\n');
    let currentEvent: Partial<CalendarEvent> = {};
    let inEvent = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = { id: Math.random().toString(36).substr(2, 9) };
      } else if (trimmedLine === 'END:VEVENT' && inEvent) {
        if (currentEvent.title && currentEvent.start && currentEvent.end) {
          events.push(currentEvent as CalendarEvent);
        }
        currentEvent = {};
        inEvent = false;
      } else if (inEvent) {
        if (trimmedLine.startsWith('SUMMARY:')) {
          currentEvent.title = trimmedLine.substring(8);
        } else if (trimmedLine.startsWith('DTSTART:')) {
          currentEvent.start = parseDateTimeString(trimmedLine.substring(8));
        } else if (trimmedLine.startsWith('DTEND:')) {
          currentEvent.end = parseDateTimeString(trimmedLine.substring(6));
        } else if (trimmedLine.startsWith('DESCRIPTION:')) {
          currentEvent.description = trimmedLine.substring(12);
        } else if (trimmedLine.startsWith('LOCATION:')) {
          currentEvent.location = trimmedLine.substring(9);
        }
      }
    }

    // Filter events for current week
    const weekStart = startOfDay(currentWeek);
    const weekEnd = addDays(weekStart, 7);
    
    return events.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart >= weekStart && eventStart < weekEnd;
    });
  };

  const parseDateTimeString = (dateStr: string): string => {
    // Handle YYYYMMDDTHHMMSSZ format
    if (dateStr.includes('T')) {
      const [date, time] = dateStr.split('T');
      const year = date.substring(0, 4);
      const month = date.substring(4, 6);
      const day = date.substring(6, 8);
      const hour = time.substring(0, 2);
      const minute = time.substring(2, 4);
      const second = time.substring(4, 6);
      
      return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }
    
    return dateStr;
  };

  const calculateDuration = (start: string, end: string): number => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 4) / 4; // Round to nearest 15 minutes
  };

  const handleEventSelection = (eventId: string, checked: boolean) => {
    const newSelected = new Set(selectedEvents);
    if (checked) {
      newSelected.add(eventId);
    } else {
      newSelected.delete(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const handleProjectChange = (eventId: string, project: string) => {
    setProjectMapping(prev => ({ ...prev, [eventId]: project }));
  };

  const handleBillableChange = (eventId: string, billable: boolean) => {
    setBillableMapping(prev => ({ ...prev, [eventId]: billable }));
  };

  const handleImportEntries = async () => {
    if (selectedEvents.size === 0) return;

    setLoading(true);
    try {
      // Ensure timesheet exists
      const timesheet = await createOrGetTimesheet(currentWeek);
      if (!timesheet) throw new Error('Failed to create timesheet');

      const selectedEventData = importedEvents.filter(e => selectedEvents.has(e.id));
      let successCount = 0;

      for (const event of selectedEventData) {
        const entry: TimesheetEntry = {
          date: format(new Date(event.start), 'yyyy-MM-dd'),
          hours: calculateDuration(event.start, event.end),
          project_name: projectMapping[event.id] || event.title,
          task_description: event.description || `Imported from calendar: ${event.title}`,
          is_billable: billableMapping[event.id] || false,
        };

        const success = await saveEntry(entry);
        if (success) successCount++;
      }

      toast({
        title: "Success",
        description: `Imported ${successCount} timesheet entries`,
      });

      // Clear imported data
      setImportedEvents([]);
      setSelectedEvents(new Set());
      setProjectMapping({});
      setBillableMapping({});
    } catch (error) {
      console.error('Error importing entries:', error);
      toast({
        title: "Error",
        description: "Failed to import timesheet entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleICS = () => {
    const sampleICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sample//Sample Event//EN
BEGIN:VEVENT
UID:1@example.com
DTSTART:${format(currentWeek, "yyyyMMdd'T'HHmmss'Z'")}
DTEND:${format(addDays(currentWeek, 0), "yyyyMMdd'T'HHmmss'Z'")}
SUMMARY:Project Meeting
DESCRIPTION:Weekly project sync meeting
LOCATION:Conference Room A
END:VEVENT
BEGIN:VEVENT
UID:2@example.com
DTSTART:${format(addDays(currentWeek, 1), "yyyyMMdd'T'HHmmss'Z'")}
DTEND:${format(addDays(currentWeek, 1), "yyyyMMdd'T'HHmmss'Z'")}
SUMMARY:Development Work
DESCRIPTION:Frontend development tasks
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([sampleICS], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-calendar.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Import
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Import calendar events and convert them to timesheet entries for the current week.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="calendar-file">Upload Calendar File (.ics)</Label>
              <Input
                id="calendar-file"
                type="file"
                accept=".ics"
                onChange={handleFileUpload}
                disabled={loading}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Export your calendar as an .ics file and upload it here.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadSampleICS}>
                <Download className="h-4 w-4 mr-2" />
                Download Sample
              </Button>
            </div>
          </div>

          {/* Imported Events */}
          {importedEvents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Imported Events</h3>
                <Badge variant="outline">
                  {selectedEvents.size} of {importedEvents.length} selected
                </Badge>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {importedEvents.map((event) => {
                  const duration = calculateDuration(event.start, event.end);
                  const isSelected = selectedEvents.has(event.id);
                  
                  return (
                    <Card key={event.id} className={isSelected ? 'border-primary' : ''}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleEventSelection(event.id, !!checked)}
                          />
                          
                          <div className="flex-1 space-y-3">
                            <div>
                              <h4 className="font-medium">{event.title}</h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(event.start), 'MMM d, h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {duration.toFixed(2)}h
                </span>
                              </div>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            
                            {isSelected && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Project Name</Label>
                                  <Input
                                    placeholder="Project name"
                                    value={projectMapping[event.id] || event.title}
                                    onChange={(e) => handleProjectChange(event.id, e.target.value)}
                                    className="text-sm"
                                  />
                                </div>
                                
                                <div className="flex items-center space-x-2 pt-5">
                                  <Checkbox
                                    id={`billable-${event.id}`}
                                    checked={billableMapping[event.id] || false}
                                    onCheckedChange={(checked) => handleBillableChange(event.id, !!checked)}
                                  />
                                  <Label htmlFor={`billable-${event.id}`} className="text-xs">
                                    Billable
                                  </Label>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {selectedEvents.size > 0 && (
                <div className="flex justify-end">
                  <Button onClick={handleImportEntries} disabled={loading}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {selectedEvents.size} Entries
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                How to Export Calendar Events
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Google Calendar:</strong> Go to Settings → Import & Export → Export (downloads .ics file)</p>
                <p><strong>Outlook:</strong> File → Save Calendar → Save as type: iCalendar Format (*.ics)</p>
                <p><strong>Apple Calendar:</strong> File → Export → Export Calendar</p>
                <p className="text-xs">
                  Note: Only events from the current week will be imported. Events will be converted to draft timesheet entries that you can edit before submission.
                </p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};