import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { BookOpen, Users, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SubjectInfo { id: string; subject_name: string; subject_code: string; }
interface AttendanceRow { id: string; student_id: string; date: string; period_number: number; profiles?: { name: string } | null; }

export default function FacultyDashboard() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("subjects").select("id, subject_name, subject_code").eq("faculty_id", user.id)
      .then(({ data }) => {
        if (data) setSubjects(data);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!selectedSubject) return;
    const fetchAttendance = async () => {
      let query = supabase.from("attendance")
        .select("id, student_id, date, period_number")
        .eq("subject_id", selectedSubject);
      if (selectedDate) query = query.eq("date", selectedDate);
      const { data } = await query.order("date", { ascending: false }).limit(100);
      
      if (data && data.length > 0) {
        // Fetch student names
        const studentIds = [...new Set(data.map((d) => d.student_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", studentIds);
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p.name]) || []);
        
        setAttendanceRecords(data.map((d) => ({ ...d, profiles: { name: profileMap.get(d.student_id) || "Unknown" } })));
      } else {
        setAttendanceRecords([]);
      }
    };
    fetchAttendance();
  }, [selectedSubject, selectedDate]);

  return (
    <DashboardLayout>
      {tab === "subjects" ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">My Subjects</h2>
          {subjects.length === 0 ? (
            <p className="text-muted-foreground">No subjects assigned yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((s) => (
                <div key={s.id} className="stat-card">
                  <p className="font-semibold">{s.subject_name}</p>
                  <p className="text-sm text-muted-foreground">{s.subject_code}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === "attendance" ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Attendance Records</h2>
          <div className="flex gap-3 flex-wrap">
            <div className="min-w-[200px]">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          {attendanceRecords.length > 0 ? (
            <div className="bg-card border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{r.profiles?.name || "Unknown"}</TableCell>
                      <TableCell>{r.date}</TableCell>
                      <TableCell>Period {r.period_number}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground">{selectedSubject ? "No records found for this date." : "Select a subject to view records."}</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Faculty Dashboard</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard title="My Subjects" value={subjects.length} icon={BookOpen} />
            <StatCard title="Total Records" value={attendanceRecords.length} icon={BarChart3} variant="success" />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
