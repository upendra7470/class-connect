import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ShieldCheck, GraduationCap, Info } from "lucide-react";

// Timetable mapping from your image
const TIMETABLE_DATA: Record<string, string[]> = {
  monday: ["DBMS", "OS LAB", "OS LAB", "OS LAB", "SE", "SE", "OS"],
  tuesday: ["WEET TEST", "WEET TEST", "DM", "BEFA", "DBMS", "OS", "SE"],
  wednesday: ["SDC LAB", "SDC LAB", "COI", "DM", "OS", "BEFA", "RTP"],
  thursday: ["DM", "DM", "BEFA", "COI", "RTP", "DBMS", "SPORTS"],
  friday: ["OS", "DBMS LAB", "DBMS LAB", "DBMS LAB", "SE", "BEFA", "DBMS"],
  saturday: ["SEP/DBMS LAB", "SEP/DBMS LAB", "SEP/OS LAB", "SEP/OS LAB", "SEP/NODE JS LAB", "SEP/NODE JS LAB", "LIB"],
};

interface SubjectAttendance {
  id: string;
  subject_name: string;
  attended: number;
  total: number;
}

export function BunkSimulator({ subjectAttendance }: { subjectAttendance: SubjectAttendance[] }) {
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]); // Array of period indices (0-6)

  // Reset selected periods when day changes
  useEffect(() => {
    setSelectedPeriods([]);
  }, [selectedDay]);

  const togglePeriod = (index: number) => {
    setSelectedPeriods(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const selectWholeDay = () => {
    setSelectedPeriods([0, 1, 2, 3, 4, 5, 6]);
  };

  // Calculate stats
  const simulation = subjectAttendance.map(sa => {
    const classesBunkedToday = selectedPeriods.filter(
      idx => TIMETABLE_DATA[selectedDay][idx] === sa.subject_name
    ).length;

    const currentPct = sa.total > 0 ? (sa.attended / sa.total) * 100 : 100;
    const newTotal = sa.total + classesBunkedToday;
    const newPct = newTotal > 0 ? (sa.attended / newTotal) * 100 : 100;
    const loss = currentPct - newPct;

    return { ...sa, newPct, loss, isAtRisk: newPct < 75 };
  });

  const totalLoss = simulation.reduce((acc, curr) => acc + curr.loss, 0);
  const isAnyAtRisk = simulation.some(s => s.isAtRisk && s.loss > 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6 bg-background border rounded-2xl shadow-sm">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" /> Class Connect Bunk Sim
        </h2>
      </div>

      {/* Day Selection */}
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="space-y-2 flex-1">
          <label className="text-sm font-medium">Select Day</label>
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(TIMETABLE_DATA).map(day => (
                <SelectItem key={day} value={day} className="capitalize">{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={selectWholeDay} className="w-full sm:w-auto">
          Bunk Whole Day
        </Button>
      </div>

      {/* Period Selector */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Select Periods to Bunk:</p>
        <div className="grid grid-cols-1 gap-2">
          {TIMETABLE_DATA[selectedDay].map((subject, idx) => (
            <div 
              key={idx} 
              onClick={() => togglePeriod(idx)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedPeriods.includes(idx) ? "bg-destructive/10 border-destructive" : "bg-card hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={selectedPeriods.includes(idx)} />
                <span className="font-medium text-sm">Period {idx + 1}: {subject}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {idx < 4 ? "Morning Session" : "Afternoon Session"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Results Banner */}
      {selectedPeriods.length > 0 && (
        <Card className={`border-2 ${isAnyAtRisk ? "border-destructive bg-destructive/5" : "border-primary bg-primary/5"}`}>
          <CardContent className="pt-6 text-center space-y-2">
            <h3 className="text-xl font-bold">
              {isAnyAtRisk ? "⚠️ GO MAN TO COLLEGE!" : "✅ You're relatively safe"}
            </h3>
            <p className="text-sm">
              Bunking <strong>{selectedPeriods.length}</strong> classes will cost you an aggregate of 
              <span className="text-destructive font-bold ml-1">{totalLoss.toFixed(1)}%</span> attendance.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {simulation.filter(s => s.loss > 0).map(s => (
          <div key={s.id} className="p-3 border rounded-lg flex justify-between items-center bg-card">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">{s.subject_name}</p>
              <p className="text-lg font-bold">{s.newPct.toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-destructive font-semibold">-{s.loss.toFixed(1)}%</p>
              {s.isAtRisk ? <AlertTriangle className="w-4 h-4 text-destructive ml-auto" /> : <ShieldCheck className="w-4 h-4 text-green-500 ml-auto" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
