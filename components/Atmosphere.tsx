
import React, { useEffect, useState } from 'react';
import { ThemeId } from '../types';

interface AtmosphereProps {
  type: 'snow' | 'confetti' | 'egg' | 'star' | 'bubble' | 'bat' | 'heart' | 'sparkle';
}

const Atmosphere: React.FC<AtmosphereProps> = ({ type }) => {
  const [particles, setParticles] = useState<{ id: number; left: string; size: string; duration: string; delay: string; content: string; color?: string }[]>([]);

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

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
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
    </div>
  );
};

export default Atmosphere;
