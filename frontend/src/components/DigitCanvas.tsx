import { useCallback, useEffect, useRef, useState } from 'react';

interface DigitCanvasProps {
  onImageCapture: (imageData: string) => void;
  disabled?: boolean;
  size?: number;
}

export function DigitCanvas({ onImageCapture, disabled = false, size = 280 }: DigitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas with black background
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Black background (MNIST format: white digit on black)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    const pos = getCanvasCoords(e);
    lastPosRef.current = pos;
  }, [disabled, getCanvasCoords]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPosRef.current) return;

    const pos = getCanvasCoords(e);

    // Draw white stroke (MNIST format)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(20, size / 14); // Adjust brush size based on canvas size

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPosRef.current = pos;
    setHasDrawn(true);
  }, [isDrawing, disabled, getCanvasCoords, size]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPosRef.current = null;
  }, []);

  const handleClear = useCallback(() => {
    initCanvas();
  }, [initCanvas]);

  const handleCapture = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas for resizing to 28x28
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Use high-quality downsampling
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    
    // Draw the original canvas onto the small canvas
    tempCtx.drawImage(canvas, 0, 0, 28, 28);

    // Get base64 PNG
    const imageData = tempCanvas.toDataURL('image/png');
    onImageCapture(imageData);
  }, [onImageCapture]);

  return (
    <div className="flex flex-col gap-4">
      {/* Canvas Container */}
      <div 
        className={`
          relative rounded-lg overflow-hidden border-2 
          ${disabled ? 'border-gray-600 opacity-50' : 'border-tt-purple/50 hover:border-tt-purple'}
          transition-colors
        `}
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className={`
            ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}
            touch-none
          `}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {/* Drawing hint overlay */}
        {!hasDrawn && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-2 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <p className="text-sm">Draw a digit (0-9)</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCapture}
          disabled={disabled || !hasDrawn}
          className={`
            flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200
            flex items-center justify-center gap-2
            ${disabled || !hasDrawn
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-tt-purple to-indigo-600 hover:from-tt-purple-dark hover:to-indigo-700 text-white shadow-lg shadow-tt-purple/25 hover:shadow-tt-purple/40'
            }
          `}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Run Inference
        </button>
        <button
          onClick={handleClear}
          disabled={disabled}
          className={`
            px-4 py-2.5 rounded-lg font-medium transition-all duration-200
            ${disabled
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
            }
          `}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
