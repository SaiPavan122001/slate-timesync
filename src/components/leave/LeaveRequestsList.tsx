import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, Eye } from 'lucide-react';
import { useLeave } from '@/hooks/useLeave';
import { useAuth } from '@/hooks/useAuth';

interface LeaveRequestsListProps {
  showUserColumn?: boolean;
  showActions?: boolean;
  limit?: number;
}

export default function LeaveRequestsList({ 
  showUserColumn = false, 
  showActions = false,
  limit 
}: LeaveRequestsListProps) {
  const { leaveRequests, updateLeaveRequest, loading } = useLeave();
  const { profile } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (!profile?.user_id) return;

    const updates: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_by: profile.user_id,
    };

    if (action === 'reject' && rejectionReason) {
      updates.rejection_reason = rejectionReason;
    }

    await updateLeaveRequest(requestId, updates);
    setActionDialogOpen(false);
    setSelectedRequest(null);
    setRejectionReason('');
  };

  const openActionDialog = (request: any, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  const displayRequests = limit ? filteredRequests.slice(0, limit) : filteredRequests;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showActions && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="status-filter">Filter by Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {displayRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {statusFilter === 'all' 
            ? 'No leave requests found'
            : `No ${statusFilter} requests found`
          }
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {showUserColumn && (
                  <TableHead>Employee</TableHead>
                )}
                <TableHead>Leave Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRequests.map((request) => (
                <TableRow key={request.id}>
                  {showUserColumn && (
                    <TableCell className="font-medium">
                      {request.profiles?.first_name} {request.profiles?.last_name}
                      <div className="text-xs text-muted-foreground">
                        {request.profiles?.employee_id}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    {request.leave_types?.name}
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.start_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.end_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {request.days_requested}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(request.status)}>
                      {request.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(request.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {request.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openActionDialog(request, 'approve')}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openActionDialog(request, 'reject')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {request.status === 'approved' ? 'Approved' : 'Rejected'}
                          {request.approved_by_profile && (
                            <span className="ml-1">
                              by {request.approved_by_profile.first_name}
                            </span>
                          )}
                        </Badge>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Leave request from {selectedRequest.profiles?.first_name} {selectedRequest.profiles?.last_name} 
                  for {selectedRequest.days_requested} days
                  ({format(new Date(selectedRequest.start_date), 'MMM dd')} - {format(new Date(selectedRequest.end_date), 'MMM dd, yyyy')})
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest?.reason && (
            <div className="space-y-2">
              <Label>Employee's Reason:</Label>
              <div className="p-3 bg-muted rounded text-sm">
                {selectedRequest.reason}
              </div>
            </div>
          )}

          {actionType === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this leave request..."
                required
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedRequest && handleAction(selectedRequest.id, actionType!)}
              disabled={actionType === 'reject' && !rejectionReason.trim()}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}