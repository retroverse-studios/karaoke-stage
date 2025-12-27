
import React, { useEffect, useState } from 'react';

const Snowfall: React.FC = () => {
  const [flakes, setFlakes] = useState<{ id: number; left: string; size: string; duration: string; delay: string }[]>([]);

  useEffect(() => {
    const newFlakes = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      size: `${Math.random() * 10 + 5}px`,
      duration: `${Math.random() * 10 + 10}s`,
      delay: `-${Math.random() * 20}s`
    }));
    setFlakes(newFlakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {flakes.map(flake => (
        <div
          key={flake.id}
          className="snowflake opacity-50 text-white"
          style={{
            left: flake.left,
            fontSize: flake.size,
            animationDuration: flake.duration,
            animationDelay: flake.delay
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
};

export default Snowfall;
