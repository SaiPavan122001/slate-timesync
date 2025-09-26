import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, X, Users, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTimesheets } from '@/hooks/useTimesheets';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManagerTimesheetData {
  id: string;
  profile_id: string;
  week_start_date: string;
  week_end_date: string;
  total_hours: number;
  status: string;
  submitted_at: string;
  employee: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
  entries: any[];
}

export const ManagerApproval = () => {
  const [pendingTimesheets, setPendingTimesheets] = useState<ManagerTimesheetData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { approveTimesheet, rejectTimesheet, bulkApproveTimesheets } = useTimesheets();
  const { toast } = useToast();

  const fetchPendingTimesheets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          *,
          employee:profiles!timesheets_profile_id_fkey(
            first_name,
            last_name,
            employee_id
          ),
          entries:timesheet_entries(*)
        `)
        .in('status', statusFilter === 'all' ? ['submitted', 'approved', 'rejected'] : [statusFilter])
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setPendingTimesheets(data || []);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch timesheets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTimesheets();
  }, [statusFilter]);

  const filteredTimesheets = pendingTimesheets.filter(timesheet => {
    const matchesSearch = 
      `${timesheet.employee?.first_name} ${timesheet.employee?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timesheet.employee?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      format(parseISO(timesheet.week_start_date), 'MMM d, yyyy').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredTimesheets.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectTimesheet = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    
    await bulkApproveTimesheets(Array.from(selectedIds));
    setSelectedIds(new Set());
    await fetchPendingTimesheets();
  };

  const handleApprove = async (id: string) => {
    await approveTimesheet(id);
    await fetchPendingTimesheets();
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) return;
    
    await rejectTimesheet(rejectingId, rejectionReason);
    setRejectingId(null);
    setRejectionReason('');
    await fetchPendingTimesheets();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Timesheet Approval
            </CardTitle>
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <Button onClick={handleBulkApprove}>
                  <Check className="h-4 w-4 mr-2" />
                  Approve Selected ({selectedIds.size})
                </Button>
              )}
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name or week..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredTimesheets.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No timesheets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredTimesheets.length && filteredTimesheets.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Week Period</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimesheets.map((timesheet) => (
                  <TableRow key={timesheet.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(timesheet.id)}
                        onCheckedChange={(checked) => handleSelectTimesheet(timesheet.id, !!checked)}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {timesheet.employee?.first_name} {timesheet.employee?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {timesheet.employee?.employee_id}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {format(parseISO(timesheet.week_start_date), 'MMM d')} - {format(parseISO(timesheet.week_end_date), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Week of {format(parseISO(timesheet.week_start_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="font-medium">{timesheet.total_hours}h</span>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStatusColor(timesheet.status)}>
                        {timesheet.status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {timesheet.submitted_at && (
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(timesheet.submitted_at), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-2">
                        {timesheet.status === 'submitted' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(timesheet.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setRejectingId(timesheet.id)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Timesheet</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p>
                                    Reject timesheet for {timesheet.employee?.first_name} {timesheet.employee?.last_name} 
                                    for week of {format(parseISO(timesheet.week_start_date), 'MMM d, yyyy')}?
                                  </p>
                                  <div>
                                    <label className="text-sm font-medium">Reason for rejection:</label>
                                    <Textarea
                                      placeholder="Please provide a reason for rejection..."
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setRejectingId(null)}>
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={handleReject}
                                      disabled={!rejectionReason.trim()}
                                    >
                                      Reject Timesheet
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                        
                        {timesheet.status !== 'submitted' && (
                          <Button variant="outline" size="sm" disabled>
                            {timesheet.status === 'approved' ? 'Approved' : 'Rejected'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};