import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldCheck } from "lucide-react";

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
  const [results, setResults] = useState<SimResult[] | null>(null);

  const simulate = () => {
    const bunks = Math.max(1, parseInt(bunkCount) || 1);

    const targetsIds =
      selectedSubject === "all"
        ? subjectAttendance.map((s) => s.id)
        : [selectedSubject];

    // If day filter is set, figure out how many classes per subject fall on that day
    // and distribute bunks proportionally (simple: just add bunks to total for filtered subjects on that day)
    const simResults: SimResult[] = [];

    for (const sid of targetsIds) {
      const sa = subjectAttendance.find((s) => s.id === sid);
      if (!sa) continue;

      let extraClasses = bunks;

      if (dayFilter !== "any") {
        // Count how many periods this subject has on the selected day
        const periodsOnDay = timetable.filter(
          (t) => t.subject_id === sid && t.day_of_week.toLowerCase() === dayFilter
        ).length;
        if (periodsOnDay === 0) {
          // Subject doesn't occur on this day — skip
          simResults.push({
            subject_name: sa.subject_name,
            currentPct: sa.total > 0 ? Math.round((sa.attended / sa.total) * 100) : 0,
            newPct: sa.total > 0 ? Math.round((sa.attended / sa.total) * 100) : 0,
            diff: 0,
            safe: true,
          });
          continue;
        }
        // Each bunk day adds periodsOnDay missed classes
        extraClasses = bunks * periodsOnDay;
      }

      const currentPct = sa.total > 0 ? (sa.attended / sa.total) * 100 : 0;
      const newTotal = sa.total + extraClasses;
      const newPct = newTotal > 0 ? (sa.attended / newTotal) * 100 : 0;

      simResults.push({
        subject_name: sa.subject_name,
        currentPct: Math.round(currentPct),
        newPct: Math.round(newPct),
        diff: Math.round(newPct - currentPct),
        safe: newPct >= 75,
      });
    }

    setResults(simResults);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Bunk Simulator</h2>
      <p className="text-sm text-muted-foreground">
        Check how bunking classes affects your attendance percentage.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <Button onClick={simulate} className="w-full sm:w-auto">Simulate</Button>

      {results && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {results.map((r, i) => (
            <Card key={i} className={`border-l-4 ${r.safe ? "border-l-green-500" : "border-l-red-500"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {r.safe ? <ShieldCheck className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                  {r.subject_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current</span>
                  <span className="font-semibold">{r.currentPct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">After Bunk</span>
                  <span className={`font-semibold ${r.safe ? "text-green-600" : "text-red-600"}`}>{r.newPct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Change</span>
                  <span className="font-semibold">{r.diff}%</span>
                </div>
                <p className={`text-xs font-medium mt-1 ${r.safe ? "text-green-600" : "text-red-600"}`}>
                  {r.safe ? "✓ Safe" : "✗ Risk — below 75%"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
