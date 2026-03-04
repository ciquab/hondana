'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type Props = {
  onDetected: (isbn: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;

    async function startScanning() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Try native BarcodeDetector first, fall back to @zxing/library
        if ('BarcodeDetector' in window) {
          const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({
            formats: ['ean_13'],
          });

          const tick = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const isbn = barcodes[0].rawValue;
                if (isbn.startsWith('978') || isbn.startsWith('979')) {
                  stopCamera();
                  onDetected(isbn);
                  return;
                }
              }
            } catch {
              // detection frame error, continue
            }
            if (!cancelled) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        } else {
          // Fallback: @zxing/library continuous decode
          const { BrowserMultiFormatReader } = await import('@zxing/library');
          const reader = new BrowserMultiFormatReader();

          const tick = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const result = await reader.decodeFromVideoElement(videoRef.current);
              if (cancelled) return;
              const isbn = result.getText();
              if (/^97[89]\d{10}$/.test(isbn)) {
                reader.reset();
                stopCamera();
                onDetected(isbn);
                return;
              }
            } catch {
              // no barcode in this frame
            }
            if (!cancelled) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        }
      } catch {
        if (!cancelled) {
          setError('カメラにアクセスできません。カメラの許可を確認してください。');
        }
      }
    }

    startScanning();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [scanning, onDetected, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-black/80 p-3">
        <span className="text-sm text-white">バーコードをカメラに映してください</span>
        <button
          onClick={() => {
            setScanning(false);
            stopCamera();
            onClose();
          }}
          className="rounded bg-white/20 px-3 py-1 text-sm text-white"
        >
          閉じる
        </button>
      </div>

      {error ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-center text-white">{error}</p>
        </div>
      ) : (
        <div className="relative flex flex-1 items-center justify-center">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />
          {/* Scan guide overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-64 rounded-lg border-2 border-white/60" />
          </div>
        </div>
      )}
    </div>
  );
}
