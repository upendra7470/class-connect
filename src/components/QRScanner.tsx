import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (data: string) => void;
  active: boolean;
}

export function QRScanner({ onScan, active }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerId = "qr-reader";

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {}
      )
      .catch((err) => {
        setError("Camera access denied or not available. Please allow camera permissions.");
        console.error("QR Scanner error:", err);
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [active, onScan]);

  return (
    <div className="w-full">
      <div id={containerId} className="rounded-xl overflow-hidden" />
      {error && <p className="text-destructive text-sm mt-2 text-center">{error}</p>}
    </div>
  );
}
