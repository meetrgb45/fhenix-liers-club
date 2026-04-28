'use client';

export function RouletteWheel({ pulledCount, isActive, survived }: { pulledCount: number; isActive: boolean; survived?: boolean }) {
  const ANGLES = [0, 60, 120, 180, 240, 300];

  return (
    <div className={`relative w-20 h-20 ${isActive ? 'animate-pulse' : ''}`}>
      <div className="absolute inset-0 rounded-full border-4 border-gray-600 bg-gray-800" />
      {ANGLES.map((angle, i) => {
        const isPulled  = i < pulledCount;
        const isCurrent = isActive && i === pulledCount;
        const rad = (angle * Math.PI) / 180;
        const cx  = 50 + 30 * Math.sin(rad);
        const cy  = 50 - 30 * Math.cos(rad);
        return (
          <div
            key={i}
            className={`absolute w-5 h-5 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 ${
              isPulled  ? 'bg-gray-900 border-gray-700' :
              isCurrent ? 'bg-yellow-400 border-yellow-300 shadow-[0_0_8px_yellow]' :
              'bg-gray-400 border-gray-300'
            }`}
            style={{ left: `${cx}%`, top: `${cy}%` }}
          />
        );
      })}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-gray-500" />
      </div>
      {survived === true  && <div className="absolute inset-0 flex items-center justify-center text-xl">✅</div>}
      {survived === false && <div className="absolute inset-0 flex items-center justify-center text-xl">💀</div>}
    </div>
  );
}
