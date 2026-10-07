import { useEffect, useRef, useState } from "react";

type Props = {
  onScan: (barcode: string) => void;
};

let pendingStop: Promise<unknown> = Promise.resolve();

export function Scanner({ onScan }: Props) {
  const regionId = useRef(`scan-${crypto.randomUUID()}`).current;
  const [error, setError] = useState<string | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let cancelled = false;
    let handled = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    const run = pendingStop.then(async () => {
      if (cancelled) return;
      if (!window.isSecureContext) {
        setError("Camera needs HTTPS. Open the https:// address, or type the barcode below.");
        return;
      }
      const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import("html5-qrcode");
      if (cancelled) return;
      scanner = new Html5Qrcode(regionId, {
        verbose: false,
        formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128],
        useBarCodeDetectorIfSupported: true,
      });
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (w, h) => ({ width: Math.min(w * 0.85, 320), height: Math.min(h * 0.5, 150) }) },
        (text) => {
          if (handled) return;
          handled = true;
          navigator.vibrate?.(40);
          onScanRef.current(text);
        },
        () => {},
      );
    });

    run.catch(() => {
      if (!cancelled) setError("Camera access failed. Type the barcode below or add the food manually.");
    });

    return () => {
      cancelled = true;
      pendingStop = run
        .catch(() => {})
        .then(async () => {
          if (!scanner) return;
          if (scanner.isScanning) await scanner.stop();
          scanner.clear();
        })
        .catch(() => {});
    };
  }, [regionId]);

  return (
    <div>
      <div id={regionId} className="scanner" />
      {error ? <p className="error">{error}</p> : <p className="hint">Point the camera at a barcode.</p>}
    </div>
  );
}
