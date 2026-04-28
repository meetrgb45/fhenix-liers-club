'use client';
import { useState } from 'react';
import { RANK_NAMES } from '@/lib/cardHelpers';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rank: number, count: number) => void;
}

export function ClaimModal({ isOpen, onClose, onConfirm }: ClaimModalProps) {
  const [rank, setRank]   = useState(0);
  const [count, setCount] = useState(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-saloon-card border border-saloon-border rounded-xl p-6 w-96" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">Make Your Claim</h3>

        <div className="mb-4">
          <label className="text-sm text-gray-400 block mb-2">Rank</label>
          <div className="flex flex-wrap gap-2">
            {RANK_NAMES.map((r, i) => (
              <button key={i} onClick={() => setRank(i)}
                className={`px-3 py-1 rounded border ${rank === i ? 'bg-saloon-green border-saloon-green text-black' : 'border-gray-600 hover:border-gray-400'}`}
              >{r}</button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-400 block mb-2">Count</label>
          <div className="flex gap-2">
            {[1, 2, 3].map(c => (
              <button key={c} onClick={() => setCount(c)}
                className={`px-4 py-2 rounded border ${count === c ? 'bg-saloon-green border-saloon-green text-black' : 'border-gray-600 hover:border-gray-400'}`}
              >{c}</button>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-4">I'm playing {count} {RANK_NAMES[rank]}{count > 1 ? 's' : ''}</p>

        <div className="flex gap-2">
          <button onClick={() => onConfirm(rank, count)} className="flex-1 bg-saloon-green text-black font-bold py-2 rounded hover:bg-saloon-green/90">Confirm</button>
          <button onClick={onClose} className="flex-1 bg-gray-700 py-2 rounded hover:bg-gray-600">Cancel</button>
        </div>
      </div>
    </div>
  );
}
