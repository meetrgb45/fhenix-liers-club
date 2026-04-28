'use client';
import { useEffect, useState } from 'react';
import { decryptMyHand } from '@/hooks/useMyHand';
import { cardLabel, SUIT_COLORS, cardSuit } from '@/lib/cardHelpers';
import { useCofheStore } from '@/hooks/useCofheClient';

export function CardHand({ ctHashes, isOwnHand }: { ctHashes: bigint[]; isOwnHand: boolean }) {
  const [cards, setCards] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isReady = useCofheStore(s => s.isReady);

  useEffect(() => {
    if (!isOwnHand || !ctHashes.length || !isReady) return;
    setCards(null);
    setError(null);
    console.log('[CardHand] decrypting', ctHashes.length, 'hashes, isReady:', isReady);
    decryptMyHand(ctHashes)
      .then(c => { console.log('[CardHand] decrypted:', c); setCards(c); })
      .catch(e => { console.error('[CardHand] decrypt error:', e); setError(e instanceof Error ? e.message : String(e)); });
  }, [ctHashes, isOwnHand, isReady]);

  const cardBox = (content: React.ReactNode, key: number) => (
    <div key={key} className="w-14 h-20 bg-white rounded-lg flex items-center justify-center shadow-lg border border-gray-200 text-lg font-bold select-none">
      {content}
    </div>
  );

  if (!isOwnHand) return (
    <div className="flex gap-2">
      {Array(3).fill(null).map((_, i) => (
        <div key={i} className="w-14 h-20 bg-[#1a2a1a] rounded-lg flex items-center justify-center border border-[#2dc653]/20 text-2xl select-none">🂠</div>
      ))}
    </div>
  );

  if (error) return <div className="text-red-400 text-xs">Decrypt failed: {error}</div>;

  if (!cards) return (
    <div className="flex gap-2 items-center">
      {Array(3).fill(null).map((_, i) => cardBox(<span className="text-gray-400 text-xs animate-pulse">…</span>, i))}
      <span className="text-xs text-yellow-400 ml-1 animate-pulse">
        {isReady ? 'Decrypting…' : '⏳ CoFHE loading…'}
      </span>
    </div>
  );

  return (
    <div className="flex gap-2 items-center">
      {cards.map((card, i) => {
        const suit = cardSuit(card);
        const color = suit === 1 || suit === 2 ? '#dc2626' : '#111827';
        return (
          <div key={i} className="w-14 h-20 bg-white rounded-lg flex items-center justify-center shadow-lg border border-gray-200 text-lg font-bold select-none"
            style={{ color }}>
            {cardLabel(card)}
          </div>
        );
      })}
      <span className="text-xs text-[#2dc653] ml-1">🔒 only you</span>
    </div>
  );
}
