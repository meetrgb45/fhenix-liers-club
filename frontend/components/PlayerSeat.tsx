'use client';
import { RouletteWheel } from './RouletteWheel';

interface PlayerSeatProps {
  address:       string;
  isCurrentTurn: boolean;
  isEliminated:  boolean;
  pullCount:     number;
  isInRoulette:  boolean;
}

export function PlayerSeat({ address, isCurrentTurn, isEliminated, pullCount, isInRoulette }: PlayerSeatProps) {
  return (
    <div className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 w-32 ${
      isCurrentTurn ? 'border-yellow-400 shadow-[0_0_12px_rgba(245,197,24,0.4)]' : 'border-gray-700'
    } ${isEliminated ? 'opacity-40 grayscale' : ''}`}>
      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">
        {isEliminated ? '💀' : '🎭'}
      </div>
      <span className="text-xs font-mono text-gray-400 truncate w-full text-center">
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
      <RouletteWheel pulledCount={pullCount} isActive={isInRoulette} />
      <span className="text-xs text-gray-500">{pullCount}/6</span>
    </div>
  );
}
