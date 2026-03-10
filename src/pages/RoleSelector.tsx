import { useNavigate } from "react-router-dom";
import { QrCode, GraduationCap, Users, BookOpen, Shield } from "lucide-react";

const roles = [
  {
    key: "student",
    label: "Student",
    description: "View your QR code, attendance & timetable",
    icon: GraduationCap,
    color: "bg-primary/10 text-primary",
  },
  {
    key: "leader",
    label: "Class Leader",
    description: "Scan QR codes & record attendance",
    icon: Users,
    color: "bg-success/10 text-success",
  },
  {
    key: "faculty",
    label: "Faculty",
    description: "View subjects & attendance records",
    icon: BookOpen,
    color: "bg-warning/10 text-warning",
  },
  {
    key: "hod",
    label: "HOD",
    description: "Department analytics & oversight",
    icon: Shield,
    color: "bg-destructive/10 text-destructive",
  },
];

export default function RoleSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center mb-10">
        <div className="inline-flex h-16 w-16 rounded-2xl gradient-primary items-center justify-center mb-4">
          <QrCode className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Smart QR Attendance</h1>
        <p className="text-muted-foreground mt-2">Select your role to continue</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {roles.map((role) => (
          <button
            key={role.key}
            onClick={() => navigate(`/login?role=${role.key}`)}
            className="stat-card text-left flex items-start gap-4 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
          >
            <div className={`p-3 rounded-xl ${role.color} shrink-0`}>
              <role.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">{role.label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{role.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
