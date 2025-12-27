
import React, { useState, useEffect, useRef, useCallback } from 'react';
import CDGraphics from 'cdgraphics';
import { Song, UserSettings, ThemeConfig } from '../types';

interface KaraokeStageProps {
  song: Song;
  settings: UserSettings;
  onExit: () => void;
  theme: ThemeConfig;
}

const KaraokeStage: React.FC<KaraokeStageProps> = ({ song, settings, onExit, theme }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(song.duration || 0);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const cdgRef = useRef<CDGraphics | null>(null);

  // Initialize CDGraphics renderer when song changes
  useEffect(() => {
    if (song.cdgData) {
      // Convert Uint8Array to ArrayBuffer for cdgraphics library
      const buffer = song.cdgData.buffer.slice(
        song.cdgData.byteOffset,
        song.cdgData.byteOffset + song.cdgData.byteLength
      );
      cdgRef.current = new CDGraphics(buffer);
      console.log("[KaraokeStage] Initialized CDGraphics renderer for song:", song.id);
    }
    
    return () => {
      cdgRef.current = null;
    };
  }, [song.id, song.cdgData]);

  const renderFrame = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const cdg = cdgRef.current;
    if (!canvas || !cdg) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = cdg.render(time);
    if (!frame.isChanged) return;

    // Use createImageBitmap for better performance
    createImageBitmap(frame.imageData)
      .then(bitmap => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      })
      .catch(() => {
        // Fallback to putImageData if createImageBitmap fails
        ctx.putImageData(frame.imageData, 0, 0);
      });
  }, []);

  const tick = useCallback(() => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    renderFrame(time);
    rafRef.current = requestAnimationFrame(tick);
  }, [renderFrame]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, tick]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => {
          console.error("Playback blocked", e);
          setError("Interaction required. Click play to start!");
        });
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, []);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, time));
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col p-4 overflow-hidden select-none">
      <audio 
        ref={audioRef} 
        src={song.audioUrl} 
        onEnded={onExit}
        onCanPlay={() => setIsReady(true)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setError("Error loading media file.")}
      />

      <div className="flex justify-between items-center mb-4 relative z-20 px-4">
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white leading-tight truncate">{song.title}</h2>
            <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest">{theme.name} Studio Mode</p>
          </div>
        </div>
        <button onClick={onExit} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full text-sm font-bold transition-all border border-white/10">
          Exit Room
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div 
          onClick={togglePlay}
          className="relative w-full max-w-5xl aspect-[300/216] bg-slate-900 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.9)] border-4 border-slate-800 overflow-hidden cursor-pointer group"
        >
          <canvas ref={canvasRef} width={300} height={216} className="w-full h-full" style={{ imageRendering: 'pixelated' }} />

          {!isReady && !error && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white">
              <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: `${theme.primaryHex} #00000000 #00000000 #00000000` }}></div>
              <p className="font-bold tracking-widest text-sm uppercase">Optimizing Stream...</p>
            </div>
          )}

          {isReady && !isPlaying && !error && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
              <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all group-hover:scale-110" style={{ backgroundColor: theme.primaryHex }}>
                <svg className="w-12 h-12 translate-x-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
              </div>
              <p className="mt-8 font-bold text-xl tracking-widest uppercase bg-black/60 px-10 py-4 rounded-full border border-white/10">Tap to Start Show</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center text-white p-10 text-center">
              <p className="font-bold text-2xl mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="bg-white text-red-950 px-8 py-3 rounded-full font-bold">Refresh Page</button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto mt-6 bg-slate-900/90 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-30">
        <div className="flex items-center space-x-6 mb-4 px-2">
          <span className="text-[10px] font-mono text-gray-500 w-12 text-right">{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
          <div className="flex-1 h-3 bg-black/60 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - rect.left) / rect.width) * duration);
          }}>
            <div className="h-full transition-all duration-100" style={{ width: `${(currentTime / (duration || 1)) * 100}%`, backgroundColor: theme.primaryHex }}></div>
          </div>
          <span className="text-[10px] font-mono text-gray-500 w-12">{Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
        </div>

        <div className="flex justify-center items-center space-x-12">
          <button onClick={() => seek(currentTime - 10)} className="text-gray-400 hover:text-white transition-all transform hover:scale-125">
             <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M8.445 14.832A1 1 0 0010 14V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4zM16.445 14.832A1 1 0 0018 14V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"></path></svg>
          </button>
          
          <button onClick={togglePlay} className="w-24 h-24 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 shadow-2xl" style={{ backgroundColor: theme.primaryHex }}>
             {isPlaying ? <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg> : <svg className="w-12 h-12 translate-x-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>}
          </button>

          <button onClick={() => seek(currentTime + 10)} className="text-gray-400 hover:text-white transition-all transform hover:scale-125">
             <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4zM11.555 5.168A1 1 0 0010 6v8a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default KaraokeStage;
