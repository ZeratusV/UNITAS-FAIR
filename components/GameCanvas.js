'use client';

import { useEffect, useRef } from 'react';
import { startGame } from '@/game/engine';

export default function GameCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cleanup = startGame(canvasRef.current);
    return cleanup;
  }, []);

  return <canvas ref={canvasRef} width={1280} height={540} />;
}
