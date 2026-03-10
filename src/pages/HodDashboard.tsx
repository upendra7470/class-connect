import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Users, BarChart3, AlertTriangle, BookOpen } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface StudentStat { user_id: string; name: string; department: string; year: string; section: string; attended: number; percentage: number; }

export default function HodDashboard() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [avgAttendance, setAvgAttendance] = useState(0);
  const [lowAttendance, setLowAttendance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetchData = async () => {
      setLoading(true);
      // Get all student profiles
      const { data: allProfiles } = await supabase.from("profiles").select("user_id, name, department, year, section");
      
      // Get all student roles
      const { data: studentRoles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      const studentIds = new Set(studentRoles?.map((r) => r.user_id) || []);
      
      const studentProfiles = (allProfiles || []).filter((p) => studentIds.has(p.user_id));
      setTotalStudents(studentProfiles.length);

      // Get attendance counts per student
      const { data: attData } = await supabase.from("attendance").select("student_id");
      const attMap = new Map<string, number>();
      (attData || []).forEach((a) => {
        attMap.set(a.student_id, (attMap.get(a.student_id) || 0) + 1);
      });

      const totalClassesEstimate = 120; // rough estimate
      const stats: StudentStat[] = studentProfiles.map((p) => {
        const attended = attMap.get(p.user_id) || 0;
        const percentage = totalClassesEstimate > 0 ? Math.round((attended / totalClassesEstimate) * 100) : 0;
        return { ...p, attended, percentage: Math.min(100, percentage) };
      });

      setStudents(stats);
      const avg = stats.length > 0 ? Math.round(stats.reduce((s, st) => s + st.percentage, 0) / stats.length) : 0;
      setAvgAttendance(avg);
      setLowAttendance(stats.filter((s) => s.percentage < 75).length);
      setLoading(false);
    };
    fetchData();
  }, [profile]);

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
      {tab === "students" ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">All Students</h2>
          <div className="bg-card border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Attended</TableHead>
                  <TableHead>Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.user_id} className={s.percentage < 75 ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.department}</TableCell>
                    <TableCell>{s.year}</TableCell>
                    <TableCell>{s.section}</TableCell>
                    <TableCell>{s.attended}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={s.percentage} className="w-16 h-2" />
                        <span className={`text-sm font-medium ${s.percentage < 75 ? "text-destructive" : "text-success"}`}>{s.percentage}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : tab === "analytics" ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Attendance Analytics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Total Students" value={totalStudents} icon={Users} />
            <StatCard title="Average Attendance" value={`${avgAttendance}%`} icon={BarChart3} variant="success" />
            <StatCard title="Below 75%" value={lowAttendance} icon={AlertTriangle} variant={lowAttendance > 0 ? "destructive" : "success"} />
          </div>
          {lowAttendance > 0 && (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="p-3 border-b bg-destructive/5">
                <p className="font-semibold text-sm text-destructive">⚠ Students Below 75% Attendance</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.filter((s) => s.percentage < 75).map((s) => (
                    <TableRow key={s.user_id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.department} - {s.year}{s.section}</TableCell>
                      <TableCell className="text-destructive font-medium">{s.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">HOD Dashboard</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Total Students" value={totalStudents} icon={Users} />
            <StatCard title="Average Attendance" value={`${avgAttendance}%`} icon={BarChart3} variant="success" />
            <StatCard title="Below 75%" value={lowAttendance} icon={AlertTriangle} variant={lowAttendance > 0 ? "warning" : "success"} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
