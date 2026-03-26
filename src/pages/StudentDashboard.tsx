import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { QRGenerator } from "@/components/QRGenerator";
import { StatCard } from "@/components/StatCard";
import { BookOpen, CheckCircle, BarChart3, Calendar, FlaskConical, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BunkSimulator } from "@/components/BunkSimulator";
import { Button } from "@/components/ui/button";

interface AttendanceRecord {
  id: string;
  date: string;
  period_number: number;
  created_at: string;
  subject_id: string;
}

interface SubjectInfo {
  id: string;
  subject_name: string;
  subject_code: string;
}

interface TimetableEntry {
  day_of_week: string;
  period_number: number;
  subject_id: string;
  subjects: { subject_name: string; subject_code: string } | null;
}

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get("tab") || "dashboard";
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [totalClassesMap, setTotalClassesMap] = useState<Record<string, number>>({});
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!user || !profile || hasFetched.current) return;
    hasFetched.current = true;

    const fetchData = async () => {
      setLoading(true);

      const [subRes, attRes, ttRes] = await Promise.all([
        supabase.from("subjects").select("id, subject_name, subject_code").eq("department", profile.department),
        supabase.from("attendance").select("id, date, period_number, created_at, subject_id").eq("student_id", user.id),
        supabase.from("timetable").select("day_of_week, period_number, subject_id, subjects(subject_name, subject_code)").eq("department", profile.department).eq("year", profile.year).eq("section", profile.section),
      ]);

      const subjectsList: SubjectInfo[] = subRes.data || [];
      setSubjects(subjectsList);
      if (attRes.data) setAttendance(attRes.data);
      if (ttRes.data) setTimetable(ttRes.data as unknown as TimetableEntry[]);

      // Build total classes map
      const classesMap: Record<string, number> = {};
      for (const sub of subjectsList) {
        const studentCount = (attRes.data || []).filter(a => a.subject_id === sub.id).length;
        const weeklySlots = (ttRes.data || []).filter((t: any) =>
          t.subjects?.subject_code === sub.subject_code || t.subject_id === sub.id
        ).length;
        classesMap[sub.id] = Math.max(weeklySlots * 4, studentCount, 1);
      }
      setTotalClassesMap(classesMap);
      setLoading(false);
    };
    fetchData();
  }, [user, profile]);

  const subjectAttendance = subjects.map((s) => {
    const attended = attendance.filter((a) => a.subject_id === s.id).length;
    const total = totalClassesMap[s.id] || 1;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { ...s, attended, total, percentage };
  });

  const totalClassesAll = subjectAttendance.reduce((sum, s) => sum + s.total, 0);
  const totalAttended = subjectAttendance.reduce((sum, s) => sum + s.attended, 0);
  const overallPercentage = totalClassesAll > 0 ? Math.round((totalAttended / totalClassesAll) * 100) : 0;

  const filteredAttendance = filterSubject === "all"
    ? attendance
    : attendance.filter((a) => a.subject_id === filterSubject);

  const timetableWithIds = timetable.map((t) => ({
    day_of_week: t.day_of_week,
    period_number: t.period_number,
    subject_id: t.subject_id || "",
  }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {tab !== "dashboard" && (
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/student")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}

      {tab === "qr" ? (
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-xl font-bold">My QR Code</h2>
          <QRGenerator studentId={user?.id || ""} />
        </div>
      ) : tab === "bunk" ? (
        <BunkSimulator
          subjectAttendance={subjectAttendance.map((s) => ({
            id: s.id, subject_name: s.subject_name, subject_code: s.subject_code,
            attended: s.attended, total: s.total,
          }))}
          timetable={timetableWithIds}
        />
      ) : tab === "attendance" ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Attendance History</h2>

          <div className="max-w-xs">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger><SelectValue placeholder="Filter by subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectAttendance.map((s) => (
              <div key={s.id} className="stat-card">
                <p className="font-semibold">{s.subject_name}</p>
                <p className="text-sm text-muted-foreground">{s.subject_code}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold">{s.percentage}%</span>
                  <span className="text-sm text-muted-foreground">({s.attended}/{s.total} classes)</span>
                </div>
                <div className={`text-xs font-medium mt-1 ${s.percentage >= 75 ? "text-green-600" : "text-red-600"}`}>
                  {s.percentage >= 75 ? "✓ Safe" : "✗ Below 75%"}
                </div>
              </div>
            ))}
          </div>

          {filteredAttendance.length > 0 ? (
            <div className="bg-card border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.slice(0, 50).map((a) => {
                    const sub = subjects.find((s) => s.id === a.subject_id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>{a.date}</TableCell>
                        <TableCell>{sub?.subject_name || "—"}</TableCell>
                        <TableCell>Period {a.period_number}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircle className="h-3.5 w-3.5" /> Present
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No attendance records found.</p>
            </div>
          )}
        </div>
      ) : tab === "timetable" ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Timetable</h2>
          {timetable.length === 0 ? (
            <p className="text-muted-foreground">No timetable configured yet.</p>
          ) : (
            <div className="bg-card border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Subject</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetable.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="capitalize">{t.day_of_week}</TableCell>
                      <TableCell>Period {t.period_number}</TableCell>
                      <TableCell>{t.subjects?.subject_name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Welcome, {profile?.name || "Student"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Total Classes" value={totalClassesAll} icon={BookOpen} />
            <StatCard title="Classes Attended" value={totalAttended} icon={CheckCircle} variant="success" />
            <StatCard title="Attendance %" value={`${overallPercentage}%`} icon={BarChart3} variant={overallPercentage < 75 ? "warning" : "success"} />
          </div>
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <a href="/dashboard/student?tab=qr" className="stat-card text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">View QR Code</p>
              </a>
              <a href="/dashboard/student?tab=attendance" className="stat-card text-center">
                <BarChart3 className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">View Attendance</p>
              </a>
              <a href="/dashboard/student?tab=bunk" className="stat-card text-center">
                <FlaskConical className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Bunk Simulator</p>
              </a>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
