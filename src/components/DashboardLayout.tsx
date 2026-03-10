import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, QrCode, BarChart3, BookOpen, Users, Calendar, ScanLine, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const roleNavItems: Record<string, { label: string; path: string; icon: React.ElementType }[]> = {
  student: [
    { label: "Dashboard", path: "/dashboard/student", icon: Home },
    { label: "My QR Code", path: "/dashboard/student?tab=qr", icon: QrCode },
    { label: "Attendance", path: "/dashboard/student?tab=attendance", icon: BarChart3 },
    { label: "Timetable", path: "/dashboard/student?tab=timetable", icon: Calendar },
  ],
  leader: [
    { label: "Dashboard", path: "/dashboard/leader", icon: Home },
    { label: "QR Scanner", path: "/dashboard/leader?tab=scanner", icon: ScanLine },
    { label: "Scanned List", path: "/dashboard/leader?tab=scanned", icon: Users },
  ],
  faculty: [
    { label: "Dashboard", path: "/dashboard/faculty", icon: Home },
    { label: "Subjects", path: "/dashboard/faculty?tab=subjects", icon: BookOpen },
    { label: "Attendance", path: "/dashboard/faculty?tab=attendance", icon: BarChart3 },
  ],
  hod: [
    { label: "Dashboard", path: "/dashboard/hod", icon: Home },
    { label: "Students", path: "/dashboard/hod?tab=students", icon: Users },
    { label: "Analytics", path: "/dashboard/hod?tab=analytics", icon: BarChart3 },
  ],
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = roleNavItems[role || "student"] || [];

  const roleLabels: Record<string, string> = {
    student: "Student",
    leader: "Class Leader",
    faculty: "Faculty",
    hod: "HOD",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top navbar */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <QrCode className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">Smart QR Attendance</h1>
            <p className="text-xs text-muted-foreground">{roleLabels[role || "student"]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">{profile?.name || profile?.email}</span>
          <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate("/login"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full animate-fade-in">
        {children}
      </main>

      {/* Bottom nav for mobile */}
      <nav className="border-t bg-card px-2 py-2 flex justify-around md:hidden sticky bottom-0 z-50">
        {navItems.slice(0, 4).map((item) => {
          const isActive = location.pathname + location.search === item.path || (location.search === "" && item.path === `/dashboard/${role}`);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
