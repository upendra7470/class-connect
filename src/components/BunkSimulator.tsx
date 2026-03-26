import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldCheck, TrendingDown } from "lucide-react";

interface SubjectAttendance {
  id: string;
  subject_name: string;
  subject_code: string;
  attended: number;
  total: number;
}

interface SimResult {
  subject_name: string;
  currentPct: number;
  newPct: number;
  diff: number;
  safe: boolean;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

interface BunkSimulatorProps {
  subjectAttendance: SubjectAttendance[];
  timetable: { day_of_week: string; period_number: number; subject_id: string }[];
}

export function BunkSimulator({ subjectAttendance, timetable }: BunkSimulatorProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [bunkCount, setBunkCount] = useState<string>("1");
  const [dayFilter, setDayFilter] = useState<string>("any");
  const [results, setResults] = useState<SimResult[]>([]);

  // Auto-simulate whenever inputs change
  useEffect(() => {
    simulate();
  }, [selectedSubject, bunkCount, dayFilter, subjectAttendance]);

  const simulate = () => {
    const bunks = Math.max(1, parseInt(bunkCount) || 1);

    const targetsIds =
      selectedSubject === "all"
        ? subjectAttendance.map((s) => s.id)
        : [selectedSubject];

    const simResults: SimResult[] = [];

    for (const sid of targetsIds) {
      const sa = subjectAttendance.find((s) => s.id === sid);
      if (!sa) continue;

      let extraClasses = bunks;

      if (dayFilter !== "any") {
        const periodsOnDay = timetable.filter(
          (t) => t.subject_id === sid && t.day_of_week.toLowerCase() === dayFilter
        ).length;
        if (periodsOnDay === 0) {
          const pct = sa.total > 0 ? Math.round((sa.attended / sa.total) * 100) : 0;
          simResults.push({
            subject_name: sa.subject_name,
            currentPct: pct,
            newPct: pct,
            diff: 0,
            safe: pct >= 75,
          });
          continue;
        }
        extraClasses = bunks * periodsOnDay;
      }

      const currentPct = sa.total > 0 ? (sa.attended / sa.total) * 100 : 0;
      const newTotal = sa.total + extraClasses;
      const newPct = newTotal > 0 ? (sa.attended / newTotal) * 100 : 0;
      const diff = newPct - currentPct;

      simResults.push({
        subject_name: sa.subject_name,
        currentPct: Math.round(currentPct * 10) / 10,
        newPct: Math.round(newPct * 10) / 10,
        diff: Math.round(diff * 10) / 10,
        safe: newPct >= 75,
      });
    }

    setResults(simResults);
  };

  const totalLoss = results.length > 0
    ? Math.round((results.reduce((s, r) => s + Math.abs(r.diff), 0) / results.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Bunk Simulator</h2>
      <p className="text-sm text-muted-foreground">
        See how bunking classes affects your attendance — results update instantly.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjectAttendance.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Classes to Bunk</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={bunkCount}
            onChange={(e) => setBunkCount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Day Filter (optional)</Label>
          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Day</SelectItem>
              {DAYS.map((d) => (
                <SelectItem key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary banner */}
      {results.length > 0 && totalLoss > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <TrendingDown className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm font-medium">
            Bunking <strong>{bunkCount}</strong> class{parseInt(bunkCount) !== 1 ? "es" : ""} will drop your attendance by an average of <strong className="text-destructive">{totalLoss}%</strong>
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((r, i) => (
            <Card key={i} className={`border-l-4 ${r.safe ? "border-l-green-500" : "border-l-red-500"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {r.safe ? <ShieldCheck className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                  {r.subject_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current</span>
                  <span className="font-semibold">{r.currentPct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">After Bunk</span>
                  <span className={`font-semibold ${r.safe ? "text-green-600" : "text-red-600"}`}>{r.newPct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">% Lost</span>
                  <span className="font-bold text-destructive">{r.diff}%</span>
                </div>
                <p className={`text-xs font-medium mt-1 ${r.safe ? "text-green-600" : "text-red-600"}`}>
                  {r.safe ? "✓ Safe — above 75%" : "✗ Risk — below 75%"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {subjectAttendance.length === 0 && (
        <p className="text-muted-foreground text-center py-6">No subjects found. Attendance data is needed to simulate.</p>
      )}
    </div>
  );
}
