import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';

interface QRCardGeneratorProps {
  token: string;
  bookTitle: string;
  pageNumber: number;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
}

export const QRCardGenerator: React.FC<QRCardGeneratorProps> = ({
  token,
  bookTitle,
  pageNumber,
  onRegenerate,
  showRegenerate = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fullUrl = `${window.location.origin}/learn/${token}`;

  useEffect(() => {
    generateHighResCard();
  }, [token, bookTitle, pageNumber]);

  const generateHighResCard = async () => {
    setIsGenerating(true);
    try {
      // 1. Generate clean QR code data
      const qrDataUrl = await QRCode.toDataURL(fullUrl, {
        width: 800,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });

      // 2. Composite onto a printable card canvas
      const canvas = document.createElement('canvas');
      const width = 1000;
      const height = 1300;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Solid white background for supreme print contrast
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Subtle thin black border for physical scissor cutting
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(30, 30, width - 60, height - 60);
      ctx.setLineDash([]);

      // Top Header: Application Title
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAI DIGITAL DICTIONARY', width / 2, 100);

      // Sub-line: Book & Page
      ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#374151';
      const truncatedTitle = bookTitle.length > 36 ? bookTitle.substring(0, 34) + '...' : bookTitle;
      ctx.fillText(truncatedTitle, width / 2, 150);

      // Big Page Badge
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.roundRect(width / 2 - 130, 180, 260, 56, 12);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`PAGE ${pageNumber}`, width / 2, 218);

      // Load QR code image onto canvas
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        qrImg.onload = () => {
          // Draw QR centered
          const qrSize = 700;
          const qrX = (width - qrSize) / 2;
          const qrY = 270;
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          resolve();
        };
        qrImg.src = qrDataUrl;
      });

      // Bottom Section: Instructions & Token
      ctx.fillStyle = '#4B5563';
      ctx.font = '22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Scan with smartphone camera to open audio & word lessons', width / 2, 1030);

      // Token box
      ctx.fillStyle = '#F3F4F6';
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(width / 2 - 200, 1070, 400, 60, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`TOKEN: ${token}`, width / 2, 1108);

      // Footer URL
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '18px monospace';
      ctx.fillText(fullUrl, width / 2, 1170);

      const finalUrl = canvas.toDataURL('image/png');
      setDataUrl(finalUrl);

      // Also render preview to onscreen canvas if exists
      if (canvasRef.current) {
        const previewCanvas = canvasRef.current;
        previewCanvas.width = width;
        previewCanvas.height = height;
        const pCtx = previewCanvas.getContext('2d');
        pCtx?.drawImage(canvas, 0, 0);
      }
    } catch (e) {
      console.error('Failed to generate high-res QR card', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `TaiDict_Page${pageNumber}_QR_${token}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!dataUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR - Page ${pageNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 1.5cm;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: system-ui, -apple-system, sans-serif;
            }
            img {
              max-width: 140mm;
              height: auto;
              border: 1px solid #ccc;
            }
            .note {
              margin-top: 10px;
              font-size: 11px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="QR Card Page ${pageNumber}" />
          <p class="note">Cut along dashed line and physically attach to page ${pageNumber} of ${bookTitle}</p>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 shadow-sm text-black dark:text-white flex flex-col items-center">
      {/* Information row */}
      <div className="w-full mb-4 text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider mb-2 border border-black dark:border-white">
          Page {pageNumber} QR Code
        </span>
        <h4 className="text-base font-bold text-black dark:text-white truncate">{bookTitle}</h4>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-stone-500 font-mono">
          <span>Token:</span>
          <span className="font-bold text-black dark:text-white bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-2 py-0.5 rounded">
            {token}
          </span>
        </div>
      </div>

      {/* Preview Card */}
      <div className="relative w-full max-w-[260px] aspect-[1000/1300] bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden flex items-center justify-center p-2 mb-4">
        {dataUrl ? (
          <img src={dataUrl} alt={`QR code for page ${pageNumber}`} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center justify-center text-xs text-stone-400">
            <RefreshCw className="w-6 h-6 animate-spin mb-2" />
            <span>Generating high-res card...</span>
          </div>
        )}
      </div>

      {/* URL display */}
      <div className="w-full bg-stone-50 dark:bg-stone-900 rounded-xl p-2.5 mb-4 flex items-center justify-between text-xs border border-stone-300 dark:border-stone-800">
        <span className="font-mono text-stone-700 dark:text-stone-300 truncate max-w-[200px] sm:max-w-[240px]">
          {fullUrl}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg text-black dark:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition"
            title="Copy URL"
          >
            {copied ? <Check className="w-4 h-4 text-black dark:text-white" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={`/learn/${token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-black dark:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition"
            title="Open Learning Page"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!dataUrl}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-black text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200 text-xs sm:text-sm font-semibold active:scale-95 transition shadow-xs disabled:opacity-50 border border-black dark:border-white"
        >
          <Download className="w-4 h-4" />
          <span>Download PNG</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          disabled={!dataUrl}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white dark:bg-black text-black dark:text-white text-xs sm:text-sm font-semibold hover:bg-stone-100 dark:hover:bg-stone-900 active:scale-95 transition border border-black dark:border-white disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          <span>Print QR</span>
        </button>
      </div>

      {/* Optional Regenerate Token */}
      {showRegenerate && onRegenerate && (
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                'Are you sure you want to regenerate this QR token? Any physical QR code already printed for this page will stop working!'
              )
            ) {
              onRegenerate();
            }
          }}
          className="mt-3 text-xs text-black dark:text-white hover:underline flex items-center gap-1.5 font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Regenerate QR Token</span>
        </button>
      )}
    </div>
  );
};
