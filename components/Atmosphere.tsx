
import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

export type ParticleType = 'snow' | 'confetti' | 'egg' | 'star' | 'bubble' | 'bat' | 'heart' | 'sparkle';

interface Particle {
  id: number;
  left: string;
  size: string;
  duration: string;
  delay: string;
  content: string;
  color?: string;
}

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  content: string;
  size: number;
  angle: number;
  velocity: number;
  opacity: number;
}

interface AtmosphereProps {
  type: ParticleType;
}

export interface AtmosphereRef {
  triggerConfettiBurst: () => void;
}

const Atmosphere = forwardRef<AtmosphereRef, AtmosphereProps>(({ type }, ref) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [burstParticles, setBurstParticles] = useState<BurstParticle[]>([]);

  // Generate background particles
  useEffect(() => {
    const pickRandom = (options: string[]) => options[Math.floor(Math.random() * options.length)];
    
    const getContent = () => {
      switch (type) {
        case 'snow': return pickRandom(['❄', '❄', '❄', '✨', '⭐']);
        case 'confetti': return pickRandom(['🎊', '🎉', '🎈', '🎁', '✨']);
        case 'egg': return pickRandom(['🥚', '🌸', '🐰', '🌷', '🦋']);
        case 'star': return pickRandom(['⭐', '✨', '🎵', '🎶']);
        case 'bubble': return pickRandom(['🫧', '💿', '✨', '⚡']);
        case 'bat': return pickRandom(['🦇', '🎃', '👻', '🕷', '💀', '🕸']);
        case 'heart': return pickRandom(['💕', '💗', '💖', '🌹', '💋', '❤️']);
        case 'sparkle': return pickRandom(['✨', '⭐', '🦄', '🌈', '🎀', '💫']);
        default: return '•';
      }
    };

    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      size: type === 'bubble' ? `${Math.random() * 20 + 10}px` : `${Math.random() * 10 + 10}px`,
      duration: `${Math.random() * 10 + 10}s`,
      delay: `-${Math.random() * 20}s`,
      content: getContent()
    }));
    setParticles(newParticles);
  }, [type]);

  // Confetti burst animation
  const triggerConfettiBurst = useCallback(() => {
    const confettiEmojis = ['🎊', '🎉', '✨', '⭐', '💫', '🌟', '🎵', '🎶', '🔥'];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    const newBurst: BurstParticle[] = Array.from({ length: 30 }).map((_, i) => ({
      id: Date.now() + i,
      x: centerX,
      y: centerY,
      content: confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)],
      size: Math.random() * 20 + 15,
      angle: (Math.PI * 2 * i) / 30 + Math.random() * 0.5,
      velocity: Math.random() * 300 + 200,
      opacity: 1,
    }));
    
    setBurstParticles(prev => [...prev, ...newBurst]);
    
    // Animate burst particles
    let frame = 0;
    const maxFrames = 60;
    
    const animate = () => {
      frame++;
      
      setBurstParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + Math.cos(p.angle) * p.velocity * 0.016,
          y: p.y + Math.sin(p.angle) * p.velocity * 0.016 + frame * 2, // Add gravity
          velocity: p.velocity * 0.95, // Slow down
          opacity: Math.max(0, 1 - frame / maxFrames),
        })).filter(p => p.opacity > 0)
      );
      
      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, []);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    triggerConfettiBurst,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Background particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="snowflake opacity-30 select-none pointer-events-none"
          style={{
            left: p.left,
            fontSize: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            position: 'fixed',
            top: '-50px',
            color: 'white',
            filter: type === 'bubble' ? 'blur(1px)' : 'none'
          }}
        >
          {p.content}
        </div>
      ))}
      
      {/* Burst particles (confetti on streak) */}
      {burstParticles.map(p => (
        <div
          key={p.id}
          className="select-none pointer-events-none"
          style={{
            position: 'fixed',
            left: p.x,
            top: p.y,
            fontSize: p.size,
            opacity: p.opacity,
            transform: 'translate(-50%, -50%)',
            transition: 'none',
            zIndex: 1000,
          }}
        >
          {p.content}
        </div>
      ))}
    </div>
  );
});

Atmosphere.displayName = 'Atmosphere';

export default Atmosphere;
