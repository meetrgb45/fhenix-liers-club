'use client';
import { FheTypes } from '@cofhe/sdk';
import { useCofheClient } from './useCofheClient';

export function useDecryptHand() {
  const { cofheClient, isReady } = useCofheClient();

  const decryptHand = async (ctHashes: bigint[]): Promise<number[]> => {
    if (!isReady) throw new Error('CoFHE not ready');
    const validHashes = ctHashes.filter(h => h !== 0n);
    if (!validHashes.length) return [];

    await cofheClient.permits.getOrCreateSelfPermit();

    const BACKOFF = [3000, 5000, 8000, 10000, 15000];
    const decryptOne = async (hash: bigint): Promise<bigint> => {
      for (let i = 0; i <= BACKOFF.length; i++) {
        try {
          return await cofheClient.decryptForView(hash, FheTypes.Uint64).withPermit().execute();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const isTransient = /sealOutput|HTTP\s*[3-5]\d{2}|Failed to fetch|NetworkError|ETIMEDOUT/i.test(msg);
          if (isTransient && i < BACKOFF.length) {
            await new Promise(r => setTimeout(r, BACKOFF[i]));
            continue;
          }
          throw err;
        }
      }
      throw new Error('Decrypt retries exhausted');
    };

    const cards = await Promise.all(validHashes.map(decryptOne));
    return cards.map(Number);
  };

  return { decryptHand, isReady };
}
