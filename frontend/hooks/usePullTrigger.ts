'use client';
import { cofheClient } from '@/lib/cofhe';
import { GAME_ADDRESS, GAME_ABI } from '@/lib/contracts';
import { usePublicClient, useWriteContract } from 'wagmi';

export function usePullTrigger() {
  const publicClient           = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const executeTriggerPull = async (gameId: bigint, player: `0x${string}`, ctHash: bigint) => {
    if (!publicClient) throw new Error('No public client');

    const { decryptedValue, signature } = await cofheClient
      .decryptForTx(ctHash)
      .withoutPermit()
      .execute();

    const fees = await publicClient.estimateFeesPerGas();
    const gas  = { maxFeePerGas: fees.maxFeePerGas * 2n, maxPriorityFeePerGas: fees.maxPriorityFeePerGas };

    const hash = await writeContractAsync({
      address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'publishTriggerResult',
      args: [gameId, player, ctHash, decryptedValue, signature], ...gas,
    });
    await publicClient.waitForTransactionReceipt({ hash });

    return { survived: decryptedValue === 0n };
  };

  return { executeTriggerPull };
}
