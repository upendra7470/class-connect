import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ShieldCheck, TrendingDown, CalendarDays } from "lucide-react";

// The actual timetable data from your image
const TIMETABLE_DATA = {
  monday: ["DBMS", "OS LAB", "OS LAB", "OS LAB", "SE", "SE", "OS"],
  tuesday: ["WEET TEST", "WEET TEST", "DM", "BEFA", "DBMS", "OS", "SE"],
  wednesday: ["SDC LAB", "SDC LAB", "COI", "DM", "OS", "BEFA", "RTP"],
  thursday: ["DM", "DM", "BEFA", "COI", "RTP", "DBMS", "SPORTS"],
  friday: ["OS", "DBMS LAB", "DBMS LAB", "DBMS LAB", "SE", "BEFA", "DBMS"],
  saturday: ["SEP/DBMS LAB", "SEP/DBMS LAB", "SEP/OS LAB", "SEP/OS LAB", "SEP/NODE JS LAB", "SEP/NODE JS LAB", "LIB"],
};

interface SubjectAttendance {
  id: string;
  subject_name: string; // e.g., "DBMS"
  attended: number;
  total: number;
}

interface SimResult {
  subject_name: string;
  currentPct: number;
  newPct: number;
  classesMissed: number;
  safe: boolean;
}

export function BunkSimulator({ subjectAttendance }: { subjectAttendance: SubjectAttendance[] }) {
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  const [results, setResults] = useState<SimResult[]>([]);

  useEffect(() => {
    calculateImpact();
  }, [selectedDay, subjectAttendance]);

  const calculateImpact = () => {
    // 1. Get the subjects occurring on the chosen day
    const subjectsToday = TIMETABLE_DATA[selectedDay as keyof typeof TIMETABLE_DATA];
    
    // 2. Map how many times each subject appears today
    const countsToday: Record<string, number> = {};
    subjectsToday.forEach(sub => {
      countsToday[sub] = (countsToday[sub] || 0) + 1;
    });

    // 3. Calculate new percentages for all subjects in user's list
    const simResults = subjectAttendance.map((sa) => {
      const missedToday = countsToday[sa.subject_name] || 0;
      
      const currentPct = sa.total > 0 ? (sa.attended / sa.total) * 100 : 100;
      // When you bunk, the "Total Classes Held" increases, but "Attended" stays the same
      const newTotal = sa.total + missedToday;
      const newPct = newTotal > 0 ? (sa.attended / newTotal) * 100 : 100;

      return {
        subject_name: sa.subject_name,
        currentPct: Math.round(currentPct * 10) / 10,
        newPct: Math.round(newPct * 10) / 10,
        classesMissed: missedToday,
        safe: newPct >= 75,
      };
    });

    setResults(simResults);
  };

  return (
    <div className="space-y-6 p-4 border rounded-xl bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">Day-Off Simulator</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="day-select">If I bunk all classes on:</Label>
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger id="day-select" className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select Day" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(TIMETABLE_DATA).map((day) => (
                <SelectItem key={day} value={day} className="capitalize">
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg border border-dashed">
          <p className="text-sm font-medium mb-2">Periods you will miss:</p>
          <div className="flex flex-wrap gap-2">
            {TIMETABLE_DATA[selectedDay as keyof typeof TIMETABLE_DATA].map((sub, i) => (
              <span key={i} className="px-2 py-1 bg-background border rounded text-xs font-mono">
                P{i + 1}: {sub}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {results.map((r, i) => (
          <Card key={i} className={`overflow-hidden border-l-4 ${r.classesMissed > 0 ? (r.safe ? "border-l-yellow-500" : "border-l-destructive") : "border-l-muted"}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-sm uppercase">{r.subject_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {r.classesMissed > 0 ? `Misses ${r.classesMissed} period(s)` : "No classes today"}
                  </p>
                </div>
                {r.classesMissed > 0 && (
                  r.safe ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-destructive" />
                )}
              </div>

              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold tracking-tighter">
                  {r.newPct}%
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (was {r.currentPct}%)
                  </span>
                </div>
                {r.classesMissed > 0 && (
                  <div className="flex items-center text-destructive text-xs font-bold">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    -{Math.round((r.currentPct - r.newPct) * 10) / 10}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
