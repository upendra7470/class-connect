import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type AppRole = "student" | "leader" | "faculty" | "hod";
const roleLabels: Record<AppRole, string> = { student: "Student", leader: "Class Leader", faculty: "Faculty", hod: "HOD" };

export default function Login() {
  const [searchParams] = useSearchParams();
  const roleParam = (searchParams.get("role") as AppRole) || "student";
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppRole>(roleParam);
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, { name, role, department, year, section });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Please check your email to confirm.");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged in successfully!");
        // Fetch role and redirect
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).single();
          const userRole = roleData?.role || "student";
          navigate(`/dashboard/${userRole}`, { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl gradient-primary items-center justify-center mb-4">
            <QrCode className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Smart QR Attendance</h1>
          <p className="text-muted-foreground mt-1">{isSignUp ? "Create your account" : "Sign in"} as <span className="font-medium text-primary">{roleLabels[roleParam]}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-4">
          {isSignUp && (
            <>
              <div>
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="leader">Class Leader</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="hod">HOD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Department</Label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="CSE" required />
                </div>
                <div>
                  <Label>Year</Label>
                  <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="3" required />
                </div>
                <div>
                  <Label>Section</Label>
                  <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="A" required />
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@college.edu" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-primary hover:underline font-medium">
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </form>

        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto mt-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to role selection
        </button>
      </div>
    </div>
  );
}
