'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
}

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const isScanningRef = useRef(false);

  useEffect(() => {
    const html5Qrcode = new Html5Qrcode('qr-reader');

    const startScanner = async () => {
      try {
        isScanningRef.current = true;
        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minDimension = Math.min(viewfinderWidth, viewfinderHeight);
              return {
                width: Math.floor(minDimension * 0.85),
                height: Math.floor(minDimension * 0.85),
              };
            },
          },
          (decodedText) => {
            if (isScanningRef.current) {
              isScanningRef.current = false;
              html5Qrcode.stop().then(() => {
                onScanSuccess(decodedText);
              }).catch(console.error);
            }
          },
          () => {}
        );
      } catch (err) {
        console.error('Camera initialization error:', err);
      }
    };

    startScanner();

    return () => {
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(console.error);
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
