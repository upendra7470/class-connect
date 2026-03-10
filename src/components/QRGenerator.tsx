import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRGeneratorProps {
  studentId: string;
  size?: number;
  intervalMs?: number;
}

export function QRGenerator({ studentId, size = 220, intervalMs = 7000 }: QRGeneratorProps) {
  const [qrData, setQrData] = useState(() =>
    JSON.stringify({ student_id: studentId, ts: Date.now() })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setQrData(JSON.stringify({ student_id: studentId, ts: Date.now() }));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [studentId, intervalMs]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-card border rounded-2xl p-8 transition-all">
        <QRCodeSVG value={qrData} size={size} level="H" />
      </div>
      <p className="text-xs text-muted-foreground">QR refreshes every {intervalMs / 1000}s — show to your class leader</p>
    </div>
  );
}
