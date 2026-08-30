'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
}

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);

  useEffect(() => {
    const scannerId = 'qr-reader';
    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        if (!isScanningRef.current) {
          isScanningRef.current = true;
          await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              if (isScanningRef.current) {
                isScanningRef.current = false;
                html5QrCode
                  .stop()
                  .then(() => {
                    onScanSuccess(decodedText);
                  })
                  .catch(console.error);
              }
            },
            () => {}
          );
        }
      } catch (err) {
        console.error('Camera initialization error:', err);
        isScanningRef.current = false;
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && isScanningRef.current) {
        isScanningRef.current = false;
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(console.error);
        }
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      <div className="w-full relative overflow-hidden rounded-2xl border-2 border-cyan-500/40 bg-slate-950">
        <div id="qr-reader" className="w-full"></div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase transition-all"
        >
          Cancel Scan
        </button>
      )}
    </div>
  );
}
