import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { QRScanner } from "@/components/QRScanner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScanLine, Users, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SubjectInfo { id: string; subject_name: string; subject_code: string; }
interface ScannedStudent { student_id: string; name: string; time: string; }

export default function LeaderDashboard() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";
  
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("1");
  const [scanning, setScanning] = useState(false);
  const [scannedStudents, setScannedStudents] = useState<ScannedStudent[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    const fetchSubjects = async () => {
      const { data } = await supabase.from("subjects").select("id, subject_name, subject_code").eq("department", profile.department);
      if (data) setSubjects(data);
    };

    // Try auto-detect from timetable
    const autoDetect = async () => {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const today = days[new Date().getDay()];
      const { data } = await supabase.from("timetable")
        .select("subject_id, period_number")
        .eq("department", profile.department)
        .eq("year", profile.year)
        .eq("section", profile.section)
        .eq("day_of_week", today);
      
      if (data && data.length > 0) {
        // Find current period based on time (rough: 9am start, 1hr each)
        const hour = new Date().getHours();
        const currentPeriod = Math.max(1, Math.min(8, hour - 8));
        const match = data.find((d) => d.period_number === currentPeriod);
        if (match) {
          setSelectedSubject(match.subject_id);
          setSelectedPeriod(String(match.period_number));
        }
      }
    };

    fetchSubjects();
    autoDetect();
  }, [profile]);

  useEffect(() => {
    // Count today's attendance
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    supabase.from("attendance").select("id", { count: "exact" }).eq("marked_by", user.id).eq("date", today)
      .then(({ count }) => setTodayCount(count || 0));
  }, [user, scannedStudents]);

  const handleScan = useCallback(async (studentId: string) => {
    if (!selectedSubject || !user) {
      toast.error("Please select a subject first");
      return;
    }
    if (scannedStudents.some((s) => s.student_id === studentId)) {
      toast.warning("Student already scanned this period");
      return;
    }

    // Validate student exists
    const { data: studentProfile } = await supabase.from("profiles").select("name").eq("user_id", studentId).single();
    if (!studentProfile) {
      toast.error("Invalid QR code - student not found");
      return;
    }

    // Record attendance
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("attendance").insert({
      student_id: studentId,
      subject_id: selectedSubject,
      date: today,
      period_number: parseInt(selectedPeriod),
      marked_by: user.id,
    });

    if (error) {
      if (error.code === "23505") {
        toast.warning("Attendance already recorded for this student");
      } else {
        toast.error("Failed to record attendance");
        console.error(error);
      }
      return;
    }

    setScannedStudents((prev) => [...prev, {
      student_id: studentId,
      name: studentProfile.name,
      time: new Date().toLocaleTimeString(),
    }]);
    toast.success(`✓ ${studentProfile.name} - Attendance recorded`);
  }, [selectedSubject, selectedPeriod, user, scannedStudents]);

  return (
    <DashboardLayout>
      {tab === "scanner" ? (
        <div className="space-y-4 max-w-lg mx-auto">
          <h2 className="text-xl font-bold">QR Scanner</h2>
          
          <div className="space-y-3 bg-card border rounded-xl p-4">
            <div>
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8].map((p) => (
                    <SelectItem key={p} value={String(p)}>Period {p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => setScanning(!scanning)} 
              className="w-full" 
              variant={scanning ? "destructive" : "default"}
              disabled={!selectedSubject}
            >
              <ScanLine className="h-4 w-4 mr-2" />
              {scanning ? "Stop Scanning" : "Start Scanning"}
            </Button>
          </div>

          {scanning && <QRScanner onScan={handleScan} active={scanning} />}

          {scannedStudents.length > 0 && (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="p-3 border-b">
                <p className="font-semibold text-sm">{scannedStudents.length} students scanned</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scannedStudents.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.time}</TableCell>
                      <TableCell><CheckCircle className="h-4 w-4 text-success" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : tab === "scanned" ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Scanned Students Today</h2>
          {scannedStudents.length === 0 ? (
            <p className="text-muted-foreground">No students scanned yet today. Go to QR Scanner to start.</p>
          ) : (
            <div className="bg-card border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scannedStudents.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Class Leader Dashboard</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard title="Scanned Today" value={todayCount} icon={ScanLine} variant="success" />
            <StatCard title="This Session" value={scannedStudents.length} icon={Users} />
          </div>
          <div className="bg-card border rounded-xl p-6 text-center">
            <ScanLine className="h-12 w-12 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Ready to take attendance?</h3>
            <p className="text-sm text-muted-foreground mb-4">Select a subject and start scanning student QR codes</p>
            <Button onClick={() => window.location.href = "/dashboard/leader?tab=scanner"}>
              Open Scanner
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
