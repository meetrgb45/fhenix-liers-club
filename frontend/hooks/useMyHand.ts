'use client';
import { FheTypes } from '@cofhe/sdk';
import { cofheClient } from '@/lib/cofhe';

/**
 * Decrypt the current player's 3 cards for UI display.
 * Uses decryptForView — no on-chain tx needed.
 * Requires a valid permit — always call .withPermit() explicitly.
 */
export async function decryptMyHand(ctHashes: bigint[]): Promise<number[]> {
  const validHashes = ctHashes.filter(h => h !== 0n);
  if (!validHashes.length) return [];

  await cofheClient.permits.getOrCreateSelfPermit();

  const cards = await Promise.all(
    validHashes.map(hash =>
      cofheClient.decryptForView(hash, FheTypes.Uint64).withPermit().execute()
    )
  );

  return cards.map(Number);
}
