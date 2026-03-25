import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { QRGenerator } from "@/components/QRGenerator";
import { StatCard } from "@/components/StatCard";
import { BookOpen, CheckCircle, BarChart3, Calendar, FlaskConical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BunkSimulator } from "@/components/BunkSimulator";

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
  subjects: { subject_name: string; subject_code: string } | null;
}

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;
    const fetchData = async () => {
      setLoading(true);
      const [attRes, subRes, ttRes] = await Promise.all([
        supabase.from("attendance").select("id, date, period_number, created_at, subject_id").eq("student_id", user.id),
        supabase.from("subjects").select("id, subject_name, subject_code").eq("department", profile.department),
        supabase.from("timetable").select("day_of_week, period_number, subjects(subject_name, subject_code)").eq("department", profile.department).eq("year", profile.year).eq("section", profile.section),
      ]);
      if (attRes.data) setAttendance(attRes.data);
      if (subRes.data) setSubjects(subRes.data);
      if (ttRes.data) setTimetable(ttRes.data as unknown as TimetableEntry[]);
      setLoading(false);
    };
    fetchData();
  }, [user, profile]);

  const totalClasses = subjects.length * 30; // estimate
  const attended = attendance.length;
  const percentage = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;

  // Per-subject breakdown with total estimate
  const subjectAttendance = subjects.map((s) => {
    const count = attendance.filter((a) => a.subject_id === s.id).length;
    // Count how many timetable slots this subject has per week
    const weeklySlots = timetable.filter((t) => {
      // timetable has subjects relation, match by name/code
      return t.subjects?.subject_code === s.subject_code;
    }).length;
    const estimatedTotal = Math.max(weeklySlots * 4, 1); // ~4 weeks estimate, min 1
    return { ...s, count, total: estimatedTotal };
  });

  // Timetable entries with subject_id for bunk simulator
  const timetableWithIds = timetable.map((t) => {
    const sub = subjects.find((s) => s.subject_code === t.subjects?.subject_code);
    return { day_of_week: t.day_of_week, period_number: t.period_number, subject_id: sub?.id || "" };
  });

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
      {tab === "qr" ? (
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-xl font-bold">My QR Code</h2>
          <QRGenerator studentId={user?.id || ""} />
        </div>
      ) : tab === "bunk" ? (
        <BunkSimulator
          subjectAttendance={subjectAttendance.map((s) => ({
            id: s.id, subject_name: s.subject_name, subject_code: s.subject_code,
            attended: s.count, total: s.total,
          }))}
          timetable={timetableWithIds}
        />
      ) : tab === "attendance" ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Attendance History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectAttendance.map((s) => (
              <div key={s.id} className="stat-card">
                <p className="font-semibold">{s.subject_name}</p>
                <p className="text-sm text-muted-foreground">{s.subject_code}</p>
                <p className="text-2xl font-bold mt-2">{s.count} <span className="text-sm font-normal text-muted-foreground">classes</span></p>
              </div>
            ))}
          </div>
          {attendance.length > 0 && (
            <div className="bg-card border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Subject</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.slice(0, 50).map((a) => {
                    const sub = subjects.find((s) => s.id === a.subject_id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>{a.date}</TableCell>
                        <TableCell>Period {a.period_number}</TableCell>
                        <TableCell>{sub?.subject_name || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
            <StatCard title="Total Classes" value={totalClasses} icon={BookOpen} />
            <StatCard title="Classes Attended" value={attended} icon={CheckCircle} variant="success" />
            <StatCard title="Attendance %" value={`${percentage}%`} icon={BarChart3} variant={percentage < 75 ? "warning" : "success"} />
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
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
