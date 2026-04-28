'use client';
import { RANK_NAMES } from '@/lib/cardHelpers';

export interface LogEntry {
  type:    'claim' | 'challenge' | 'reveal' | 'trigger' | 'eliminated' | 'gameover';
  player:  string;
  rank?:   number;
  count?:  number;
  wasLying?: boolean;
  survived?: boolean;
  winner?: string;
}

export function GameLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="bg-saloon-card border border-saloon-border rounded-xl p-3 h-48 overflow-y-auto flex flex-col gap-1">
      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Game Log</h4>
      {entries.length === 0 && <p className="text-xs text-gray-600">No events yet.</p>}
      {entries.map((e, i) => (
        <div key={i} className="text-xs text-gray-300">
          {e.type === 'claim'      && <span><span className="text-white font-mono">{e.player.slice(0,6)}</span> claimed {e.count} {RANK_NAMES[e.rank!]}{(e.count ?? 0) > 1 ? 's' : ''}</span>}
          {e.type === 'challenge'  && <span><span className="text-yellow-400 font-mono">{e.player.slice(0,6)}</span> 🔫 called Liar!</span>}
          {e.type === 'reveal'     && <span className={e.wasLying ? 'text-red-400' : 'text-green-400'}>Reveal: {e.wasLying ? 'was lying' : 'was honest'} → <span className="font-mono">{e.player.slice(0,6)}</span> loses</span>}
          {e.type === 'trigger'    && <span><span className="font-mono">{e.player.slice(0,6)}</span> pulled trigger → {e.survived ? <span className="text-green-400">CLICK ✓</span> : <span className="text-red-400">BANG 💥</span>}</span>}
          {e.type === 'eliminated' && <span className="text-red-500"><span className="font-mono">{e.player.slice(0,6)}</span> eliminated 💀</span>}
          {e.type === 'gameover'   && <span className="text-yellow-400 font-bold">🏆 Winner: <span className="font-mono">{e.winner?.slice(0,6)}</span></span>}
        </div>
      ))}
    </div>
  );
}
