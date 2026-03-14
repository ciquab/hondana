'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface BarcodeDetectResult {
  rawValue: string;
}
interface BarcodeDetectorInstance {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectResult[]>;
}
interface WindowWithBarcodeDetector extends Window {
  BarcodeDetector: new (opts: { formats: string[] }) => BarcodeDetectorInstance;
}

type Props = {
  onDetected: (isbn: string) => void;
  onClose: () => void;
  ageMode?: 'junior' | 'standard';
};

export default function BarcodeScanner({ onDetected, onClose, ageMode = 'standard' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roiCanvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const stableIsbnRef = useRef<string | null>(null);
  const stableCountRef = useRef(0);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const getRoiCanvas = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current;
    const canvas = roiCanvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const roiWidth = Math.round(video.videoWidth * 0.72);
    const roiHeight = Math.round(video.videoHeight * 0.28);
    const startX = Math.round((video.videoWidth - roiWidth) / 2);
    const startY = Math.round((video.videoHeight - roiHeight) / 2);

    canvas.width = roiWidth;
    canvas.height = roiHeight;
    ctx.drawImage(
      video,
      startX,
      startY,
      roiWidth,
      roiHeight,
      0,
      0,
      roiWidth,
      roiHeight
    );

    return canvas;
  }, []);

  const detectStableIsbn = useCallback(
    (isbn: string): boolean => {
      if (stableIsbnRef.current === isbn) {
        stableCountRef.current += 1;
      } else {
        stableIsbnRef.current = isbn;
        stableCountRef.current = 1;
      }

      if (stableCountRef.current >= 2) {
        stopCamera();
        onDetected(isbn);
        return true;
      }

      return false;
    },
    [onDetected, stopCamera]
  );

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;

    async function startScanning() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
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
          const detector = new (
            window as unknown as WindowWithBarcodeDetector
          ).BarcodeDetector({
            formats: ['ean_13']
          });

          const tick = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const roiCanvas = getRoiCanvas();
              if (!roiCanvas) {
                if (!cancelled) requestAnimationFrame(tick);
                return;
              }
              const barcodes = await detector.detect(roiCanvas);
              if (barcodes.length > 0) {
                const isbn = barcodes[0].rawValue;
                if (
                  (isbn.startsWith('978') || isbn.startsWith('979')) &&
                  detectStableIsbn(isbn)
                ) {
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
              const result = await reader.decodeFromVideoElement(
                videoRef.current
              );
              if (cancelled) return;
              const isbn = result.getText();
              if (/^97[89]\d{10}$/.test(isbn) && detectStableIsbn(isbn)) {
                reader.reset();
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
          setError(
            ageMode === 'junior'
              ? 'カメラがつかえません。おうちのひとに たすけてもらおう。'
              : 'カメラにアクセスできません。カメラの許可を確認してください。'
          );
        }
      }
    }

    startScanning();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [scanning, detectStableIsbn, getRoiCanvas, onDetected, stopCamera, ageMode]);

  const t = {
    header:
      ageMode === 'junior'
        ? 'バーコードを カメラに みせてね'
        : 'バーコードをカメラに映してください',
    close: ageMode === 'junior' ? 'とじる' : '閉じる',
    hint:
      ageMode === 'junior'
        ? 'しかくのなかに いれてね'
        : '枠の中に入れると読み取りやすいです',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-black/80 p-3">
        <span className="text-sm text-white">{t.header}</span>
        <button
          onClick={() => {
            setScanning(false);
            stopCamera();
            onClose();
          }}
          className={`rounded bg-white/20 px-4 text-white ${ageMode === 'junior' ? 'py-2 text-base' : 'py-1 text-sm'}`}
        >
          {t.close}
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
            <div className="h-32 w-64 rounded-lg border-2 border-white/70 bg-black/10" />
          </div>
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-4 py-2 text-xs text-white">
            {t.hint}
          </div>
        </div>
      )}
      <canvas ref={roiCanvasRef} className="hidden" aria-hidden />
    </div>
  );
}
