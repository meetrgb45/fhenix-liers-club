'use client';
import { cofheClient } from '@/lib/cofhe';
import { GAME_ADDRESS, GAME_ABI } from '@/lib/contracts';
import { getContract } from 'viem';
import { usePublicClient, useWriteContract } from 'wagmi';

export function useChallenge() {
  const publicClient           = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const executeChallenge = async (gameId: bigint) => {
    if (!publicClient) throw new Error('No public client');

    const game = getContract({ address: GAME_ADDRESS, abi: GAME_ABI, client: publicClient });

    // Read the ctHash that challenge() already stored on-chain
    const matchCtHash = await game.read.getPendingRevealCtHash([gameId]) as bigint;
    console.log('[challenge] pendingRevealCtHash:', matchCtHash.toString());

    if (!matchCtHash || matchCtHash === 0n) throw new Error('No pending reveal ctHash — challenge tx may not have completed');

    console.log('[challenge] calling decryptForTx...');

    const { decryptedValue, signature } = await cofheClient
      .decryptForTx(matchCtHash)
      .withoutPermit()
      .execute();

    const fees = await publicClient.estimateFeesPerGas();
    const gas  = { maxFeePerGas: fees.maxFeePerGas * 2n, maxPriorityFeePerGas: fees.maxPriorityFeePerGas };

    const hash = await writeContractAsync({
      address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'publishRevealResult',
      args: [gameId, matchCtHash, decryptedValue, signature], ...gas,
    });
    await publicClient.waitForTransactionReceipt({ hash });

    return { matchCount: Number(decryptedValue) };
  };

  return { executeChallenge };
}
