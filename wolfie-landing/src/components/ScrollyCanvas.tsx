'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionValueEvent, MotionValue } from 'framer-motion';
import { productData } from '@/data/productData';

interface ScrollyCanvasProps {
  progress: MotionValue<number>;
}

export default function ScrollyCanvas({ progress }: ScrollyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const totalFrames = useRef(0);

  useEffect(() => {
    // Preload all images from all sequences
    const loadImages = async () => {
      const loadedImages: HTMLImageElement[] = [];
      const promises = [];
      let globalIndex = 0;

      for (const sequence of productData.sequences) {
        for (let i = 1; i <= sequence.frameCount; i++) {
          const currentIndex = globalIndex;
          const promise = new Promise<void>((resolve) => {
            const img = new Image();
            const paddedIndex = i.toString().padStart(sequence.padLength, '0');
            img.src = `${sequence.framePrefix}${paddedIndex}${sequence.frameSuffix}`;
            img.onload = () => {
              loadedImages[currentIndex] = img;
              resolve();
            };
            img.onerror = () => {
              console.error(`Failed to load image: ${img.src}`);
              // Resolve anyway so we don't block
              resolve();
            };
          });
          promises.push(promise);
          globalIndex++;
        }
      }

      totalFrames.current = globalIndex;
      await Promise.all(promises);
      imagesRef.current = loadedImages;
      setImagesLoaded(true);

      // Draw first frame immediately
      if (loadedImages[0] && canvasRef.current) {
        drawFrame(0);
      }
    };

    loadImages();
  }, []);

  const drawFrame = (frameIndex: number) => {
    if (!canvasRef.current || !imagesRef.current[frameIndex]) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[frameIndex];

    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;

    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let offsetX = 0;
    let offsetY = 0;

    const scale = 0.85; // Zoom out slightly

    if (canvasRatio > imgRatio) {
      drawHeight = canvas.height * scale;
      drawWidth = (img.width * (canvas.height / img.height)) * scale;
    } else {
      drawWidth = canvas.width * scale;
      drawHeight = (img.height * (canvas.width / img.width)) * scale;
    }

    // Keep perfectly centered in the canvas container
    offsetX = (canvas.width - drawWidth) / 2;
    offsetY = (canvas.height - drawHeight) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  useMotionValueEvent(progress, 'change', (latest) => {
    if (!imagesLoaded || totalFrames.current === 0) return;

    const maxFrame = totalFrames.current - 1;
    let currentFrame = Math.floor(latest * maxFrame);

    if (currentFrame < 0) currentFrame = 0;
    if (currentFrame > maxFrame) currentFrame = maxFrame;

    requestAnimationFrame(() => drawFrame(currentFrame));
  });

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !canvasRef.current.parentElement) return;
      canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
      canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
      
      if (imagesLoaded && totalFrames.current > 0) {
        const maxFrame = totalFrames.current - 1;
        let currentFrame = Math.floor(progress.get() * maxFrame);
        drawFrame(currentFrame);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [imagesLoaded, progress]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  );
}
