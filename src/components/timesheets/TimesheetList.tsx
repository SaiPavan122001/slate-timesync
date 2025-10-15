import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Eye, Calendar, Clock, User, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Timesheet } from '@/hooks/useTimesheets';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TimesheetListProps {
  timesheets: Timesheet[];
  loading: boolean;
}

export const TimesheetList = ({ timesheets, loading }: TimesheetListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);

  const filteredTimesheets = timesheets.filter(timesheet => {
    const matchesSearch = 
      format(parseISO(timesheet.week_start_date), 'MMM d, yyyy').toLowerCase().includes(searchTerm.toLowerCase()) ||
      timesheet.total_hours.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || timesheet.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const downloadExcel = (timesheet: Timesheet) => {
    const ws_data = [
      ['Timesheet Report'],
      [],
      ['Week Period', `${format(parseISO(timesheet.week_start_date), 'MMM d, yyyy')} - ${format(parseISO(timesheet.week_end_date), 'MMM d, yyyy')}`],
      ['Total Hours', timesheet.total_hours],
      ['Status', timesheet.status],
      ['Submitted', timesheet.submitted_at ? format(parseISO(timesheet.submitted_at), 'MMM d, yyyy h:mm a') : 'Not submitted'],
      [],
      ['Date', 'Project', 'Description', 'Hours', 'Billable']
    ];

    timesheet.entries?.forEach(entry => {
      ws_data.push([
        format(parseISO(entry.date), 'EEE, MMM d, yyyy'),
        entry.project_name || '-',
        entry.task_description || '-',
        entry.hours,
        entry.is_billable ? 'Yes' : 'No'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
    XLSX.writeFile(wb, `Timesheet_${format(parseISO(timesheet.week_start_date), 'yyyy-MM-dd')}.xlsx`);
  };

  const downloadPDF = (timesheet: Timesheet) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Timesheet Report', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Week: ${format(parseISO(timesheet.week_start_date), 'MMM d, yyyy')} - ${format(parseISO(timesheet.week_end_date), 'MMM d, yyyy')}`, 14, 30);
    doc.text(`Total Hours: ${timesheet.total_hours}h`, 14, 37);
    doc.text(`Status: ${timesheet.status.toUpperCase()}`, 14, 44);
    if (timesheet.submitted_at) {
      doc.text(`Submitted: ${format(parseISO(timesheet.submitted_at), 'MMM d, yyyy h:mm a')}`, 14, 51);
    }

    const tableData = timesheet.entries?.map(entry => [
      format(parseISO(entry.date), 'EEE, MMM d'),
      entry.project_name || '-',
      entry.task_description || '-',
      `${entry.hours}h`,
      entry.is_billable ? 'Yes' : 'No'
    ]) || [];

    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Project', 'Description', 'Hours', 'Billable']],
      body: tableData,
    });

    doc.save(`Timesheet_${format(parseISO(timesheet.week_start_date), 'yyyy-MM-dd')}.pdf`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timesheet History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Timesheet History</CardTitle>
          
          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Search by week or hours..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredTimesheets.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No timesheets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week Period</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimesheets.map((timesheet) => (
                  <TableRow key={timesheet.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {format(parseISO(timesheet.week_start_date), 'MMM d')} - {format(parseISO(timesheet.week_end_date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Week of {format(parseISO(timesheet.week_start_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{timesheet.total_hours}h</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStatusColor(timesheet.status)}>
                        {timesheet.status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {timesheet.submitted_at ? (
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(timesheet.submitted_at), 'MMM d, h:mm a')}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {timesheet.approved_at ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(parseISO(timesheet.approved_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTimesheet(timesheet)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadExcel(timesheet)}
                          title="Download as Excel"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadPDF(timesheet)}
                          title="Download as PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Timesheet Detail Dialog */}
      <Dialog open={!!selectedTimesheet} onOpenChange={() => setSelectedTimesheet(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Timesheet Details - Week of {selectedTimesheet && format(parseISO(selectedTimesheet.week_start_date), 'MMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTimesheet && (
            <div>
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Hours:</span>
                      <span className="font-medium">{selectedTimesheet.total_hours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge className={getStatusColor(selectedTimesheet.status)}>
                        {selectedTimesheet.status}
                      </Badge>
                    </div>
                    {selectedTimesheet.submitted_at && (
                      <div className="flex justify-between">
                        <span>Submitted:</span>
                        <span>{format(parseISO(selectedTimesheet.submitted_at), 'MMM d, h:mm a')}</span>
                      </div>
                    )}
                    {selectedTimesheet.approved_at && (
                      <div className="flex justify-between">
                        <span>Approved:</span>
                        <span>{format(parseISO(selectedTimesheet.approved_at), 'MMM d, h:mm a')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedTimesheet.rejection_reason && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Rejection Reason</h4>
                    <p className="text-sm text-red-700 bg-red-50 p-3 rounded">
                      {selectedTimesheet.rejection_reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Entries Table */}
              {selectedTimesheet.entries && selectedTimesheet.entries.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Time Entries</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadExcel(selectedTimesheet)}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPDF(selectedTimesheet)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Billable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTimesheet.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {format(parseISO(entry.date), 'EEE, MMM d')}
                          </TableCell>
                          <TableCell>{entry.project_name || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {entry.task_description || '-'}
                          </TableCell>
                          <TableCell>{entry.hours}h</TableCell>
                          <TableCell>
                            {entry.is_billable ? (
                              <Badge className="bg-green-100 text-green-800">Billable</Badge>
                            ) : (
                              <Badge variant="outline">Non-billable</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};