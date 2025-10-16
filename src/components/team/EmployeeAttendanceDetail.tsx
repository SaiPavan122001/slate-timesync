import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from "@/hooks/use-toast";

interface EmployeeAttendanceDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
}

interface DailyAttendance {
  date: string;
  day: string;
  hours: number;
  status: string;
  task: string;
}

export function EmployeeAttendanceDetail({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  startDate,
  endDate
}: EmployeeAttendanceDetailProps) {
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && employeeId) {
      fetchEmployeeAttendance();
    }
  }, [open, employeeId, startDate, endDate]);

  const fetchEmployeeAttendance = async () => {
    try {
      setLoading(true);

      // Fetch employee profile details
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (profileError) throw profileError;
      setEmployeeDetails(profile);

      // Fetch attendance records for the date range
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (attendanceError) throw attendanceError;

      // Fetch leave requests for the date range
      const { data: leaves, error: leavesError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('profile_id', employeeId)
        .eq('status', 'approved')
        .gte('start_date', startDate)
        .lte('end_date', endDate);

      if (leavesError) throw leavesError;

      // Create a map of all days in the range
      const allDays = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
      });

      // Process each day
      const dailyData: DailyAttendance[] = allDays.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayName = format(date, 'EEEE').toUpperCase();
        
        // Check if there's an attendance record
        const attendanceRecord = attendance?.find(a => a.date === dateStr);
        
        // Check if there's a leave
        const onLeave = leaves?.some(leave => {
          const leaveStart = new Date(leave.start_date);
          const leaveEnd = new Date(leave.end_date);
          return date >= leaveStart && date <= leaveEnd;
        });

        if (onLeave) {
          return {
            date: format(date, 'dd/MM/yyyy'),
            day: dayName,
            hours: 0,
            status: 'On Leave',
            task: ''
          };
        }

        if (attendanceRecord) {
          return {
            date: format(date, 'dd/MM/yyyy'),
            day: dayName,
            hours: Number(attendanceRecord.total_hours) || 0,
            status: attendanceRecord.status === 'present' ? 'Present' : 
                    attendanceRecord.status === 'late' ? 'Late' : 'Absent',
            task: ''
          };
        }

        // No attendance record
        return {
          date: format(date, 'dd/MM/yyyy'),
          day: dayName,
          hours: 0,
          status: 'No Attendance',
          task: ''
        };
      });

      setAttendanceData(dailyData);
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employee attendance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!employeeDetails) return;

    const totalHours = attendanceData.reduce((sum, day) => sum + day.hours, 0);

    const ws_data = [
      ['HINFINITY SOLUTIONS PRIVATE LIMITED'],
      ['REG : OFFICE : HITECH CITY ROAD JUBILEE ENCLAVE , 4TH FLOOR , BIZNESS SQUARE , 98/3/5/23 , MADHAPUR , HYDERABAD , TELENGANA 500081'],
      [],
      [`ATTENDENCE MASTER SHEET : ${format(parseISO(startDate), 'dd/MM/yyyy')} to ${format(parseISO(endDate), 'dd/MM/yyyy')}`],
      [],
      [`EMPLOYEE NAME : ${employeeDetails.first_name} ${employeeDetails.last_name}`],
      [`EMPLOYEE ID : ${employeeDetails.employee_id || 'N/A'}`],
      [`EMAIL ID : ${employeeDetails.email}`],
      [`DESIGNATION : ${employeeDetails.job_title || 'N/A'}`],
      [`CLIENT : ${employeeDetails.department || 'N/A'}`],
      [],
      ['SI.NO', 'DATE/MONTH/YEAR', 'DAY', 'TOTAL WORKING HOURS', 'TASK'],
    ];

    attendanceData.forEach((day, index) => {
      ws_data.push([
        String(index + 1),
        day.date,
        day.day,
        `${day.hours}Hrs`,
        day.task
      ]);
    });

    ws_data.push([]);
    ws_data.push([`Total Working Hours = ${totalHours}Hrs`]);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 15 },
      { wch: 22 },
      { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `${employeeDetails.employee_id}_Attendance_${format(parseISO(startDate), 'yyyy-MM-dd')}_to_${format(parseISO(endDate), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: "Success",
      description: "Excel file downloaded successfully",
    });
  };

  const downloadPDF = () => {
    if (!employeeDetails) return;

    const totalHours = attendanceData.reduce((sum, day) => sum + day.hours, 0);

    const doc = new jsPDF();

    // Company Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('HINFINITY SOLUTIONS PRIVATE LIMITED', 105, 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('REG : OFFICE : HITECH CITY ROAD JUBILEE ENCLAVE , 4TH FLOOR , BIZNESS SQUARE ,', 105, 22, { align: 'center' });
    doc.text('98/3/5/23 , MADHAPUR , HYDERABAD , TELENGANA 500081', 105, 27, { align: 'center' });

    // Attendance Master Sheet Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`ATTENDENCE MASTER SHEET : ${format(parseISO(startDate), 'dd/MM/yyyy')} to ${format(parseISO(endDate), 'dd/MM/yyyy')}`, 105, 37, { align: 'center' });

    // Employee Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 47;
    doc.text(`EMPLOYEE NAME : ${employeeDetails.first_name} ${employeeDetails.last_name}`, 14, yPos);
    yPos += 6;
    doc.text(`EMPLOYEE ID : ${employeeDetails.employee_id || 'N/A'}`, 14, yPos);
    yPos += 6;
    doc.text(`EMAIL ID : ${employeeDetails.email}`, 14, yPos);
    yPos += 6;
    doc.text(`DESIGNATION : ${employeeDetails.job_title || 'N/A'}`, 14, yPos);
    yPos += 6;
    doc.text(`CLIENT : ${employeeDetails.department || 'N/A'}`, 14, yPos);

    // Attendance Table
    const tableData = attendanceData.map((day, index) => [
      index + 1,
      day.date,
      day.day,
      `${day.hours}Hrs`,
      day.task
    ]);

    autoTable(doc, {
      startY: yPos + 10,
      head: [['SI.NO', 'DATE/MONTH/YEAR', 'DAY', 'TOTAL WORKING HOURS', 'TASK']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [66, 66, 66] as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40 },
        4: { cellWidth: 60 }
      }
    });

    // Total Hours
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Working Hours = ${totalHours}Hrs`, 14, finalY);

    doc.save(`${employeeDetails.employee_id}_Attendance_${format(parseISO(startDate), 'yyyy-MM-dd')}_to_${format(parseISO(endDate), 'yyyy-MM-dd')}.pdf`);

    toast({
      title: "Success",
      description: "PDF file downloaded successfully",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'default';
      case 'Late': return 'secondary';
      case 'Absent': return 'destructive';
      case 'On Leave': return 'outline';
      case 'No Attendance': return 'destructive';
      default: return 'outline';
    }
  };

  const totalHours = attendanceData.reduce((sum, day) => sum + day.hours, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employeeName} - Attendance Details
            <div className="text-sm font-normal text-muted-foreground mt-1">
              {format(parseISO(startDate), 'MMM dd, yyyy')} - {format(parseISO(endDate), 'MMM dd, yyyy')}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Loading attendance data...</div>
        ) : (
          <div className="space-y-4">
            {/* Employee Info */}
            {employeeDetails && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
                <div>
                  <span className="font-semibold">Employee ID:</span> {employeeDetails.employee_id || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Email:</span> {employeeDetails.email}
                </div>
                <div>
                  <span className="font-semibold">Department:</span> {employeeDetails.department || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Designation:</span> {employeeDetails.job_title || 'N/A'}
                </div>
              </div>
            )}

            {/* Attendance Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Day</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((day, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">{day.date}</td>
                      <td className="p-3">{day.day}</td>
                      <td className="p-3">
                        <Badge variant={getStatusColor(day.status)}>
                          {day.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-medium">{day.hours}h</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted font-semibold">
                  <tr>
                    <td colSpan={3} className="p-3 text-right">Total Working Hours:</td>
                    <td className="p-3 text-right">{totalHours}h</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Download Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={downloadExcel}
                disabled={!employeeDetails}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
              <Button
                variant="outline"
                onClick={downloadPDF}
                disabled={!employeeDetails}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
