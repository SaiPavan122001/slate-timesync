import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface CorrectionRequest {
  id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  correction_reason: string | null;
  is_corrected: boolean;
  profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

export function AttendanceCorrections() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    check_in_time: "",
    check_out_time: "",
    reason: "",
  });
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    fetchCorrectionRequests();
  }, []);

  const fetchCorrectionRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          date,
          check_in_time,
          check_out_time,
          correction_reason,
          is_corrected,
          profiles!profile_id(
            first_name,
            last_name,
            employee_id
          )
        `)
        .not('correction_reason', 'is', null)
        .eq('is_corrected', false)
        .order('date', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching correction requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch correction requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCorrection = async (request: CorrectionRequest) => {
    try {
      const updates: any = {
        is_corrected: true,
        corrected_by: profile?.id,
      };

      if (correctionForm.check_in_time) {
        updates.check_in_time = new Date(`${request.date}T${correctionForm.check_in_time}`).toISOString();
      }
      if (correctionForm.check_out_time) {
        updates.check_out_time = new Date(`${request.date}T${correctionForm.check_out_time}`).toISOString();
      }

      // Calculate total hours if both times are provided
      if (updates.check_in_time && updates.check_out_time) {
        const checkIn = new Date(updates.check_in_time);
        const checkOut = new Date(updates.check_out_time);
        const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        updates.total_hours = hours;
      }

      const { error } = await supabase
        .from('attendance')
        .update(updates)
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Correction approved successfully",
      });

      setIsDialogOpen(false);
      setCorrectionForm({ check_in_time: "", check_out_time: "", reason: "" });
      fetchCorrectionRequests();
    } catch (error) {
      console.error('Error approving correction:', error);
      toast({
        title: "Error",
        description: "Failed to approve correction",
        variant: "destructive",
      });
    }
  };

  const handleRejectCorrection = async (requestId: string) => {
    if (!confirm("Are you sure you want to reject this correction request?")) return;

    try {
      const { error } = await supabase
        .from('attendance')
        .update({
          correction_reason: null,
          is_corrected: false,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Correction request rejected",
      });

      fetchCorrectionRequests();
    } catch (error) {
      console.error('Error rejecting correction:', error);
      toast({
        title: "Error",
        description: "Failed to reject correction",
        variant: "destructive",
      });
    }
  };

  const openCorrectionDialog = (request: CorrectionRequest) => {
    setSelectedRequest(request);
    setCorrectionForm({
      check_in_time: request.check_in_time
        ? format(new Date(request.check_in_time), 'HH:mm')
        : "",
      check_out_time: request.check_out_time
        ? format(new Date(request.check_out_time), 'HH:mm')
        : "",
      reason: request.correction_reason || "",
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center">Loading correction requests...</div>;
  }

  return (
    <div className="space-y-6">
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No pending correction requests
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">
                        {request.profiles.first_name} {request.profiles.last_name}
                      </h4>
                      <Badge variant="outline">{request.profiles.employee_id}</Badge>
                      <Badge variant="secondary">
                        {format(new Date(request.date), 'MMM dd, yyyy')}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <strong>Reason:</strong> {request.correction_reason}
                    </div>
                    
                    <div className="flex gap-4 text-sm">
                      <div>
                        <strong>Check In:</strong>{" "}
                        {request.check_in_time
                          ? format(new Date(request.check_in_time), 'h:mm a')
                          : 'Not recorded'}
                      </div>
                      <div>
                        <strong>Check Out:</strong>{" "}
                        {request.check_out_time
                          ? format(new Date(request.check_out_time), 'h:mm a')
                          : 'Not recorded'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openCorrectionDialog(request)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRejectCorrection(request.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Correction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Attendance Correction</DialogTitle>
            <DialogDescription>
              Review and approve the corrected attendance times
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>Employee</Label>
                <div className="text-sm font-medium">
                  {selectedRequest.profiles.first_name} {selectedRequest.profiles.last_name}
                </div>
              </div>
              
              <div>
                <Label>Date</Label>
                <div className="text-sm">
                  {format(new Date(selectedRequest.date), 'MMMM dd, yyyy')}
                </div>
              </div>
              
              <div>
                <Label htmlFor="check_in">Corrected Check-in Time</Label>
                <Input
                  id="check_in"
                  type="time"
                  value={correctionForm.check_in_time}
                  onChange={(e) => setCorrectionForm({ 
                    ...correctionForm, 
                    check_in_time: e.target.value 
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="check_out">Corrected Check-out Time</Label>
                <Input
                  id="check_out"
                  type="time"
                  value={correctionForm.check_out_time}
                  onChange={(e) => setCorrectionForm({ 
                    ...correctionForm, 
                    check_out_time: e.target.value 
                  })}
                />
              </div>
              
              <div>
                <Label>Reason for Correction</Label>
                <Textarea
                  value={correctionForm.reason}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedRequest && handleApproveCorrection(selectedRequest)}>
              Approve Correction
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
