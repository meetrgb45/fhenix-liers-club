'use client';
import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, usePublicClient } from 'wagmi';
import { useRouter } from 'next/navigation';
import { GAME_ADDRESS, GAME_ABI } from '@/lib/contracts';

export default function LobbyPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors }  = useConnect();
  const { disconnect }           = useDisconnect();
  const router                   = useRouter();
  const { writeContractAsync }   = useWriteContract();
  const publicClient             = usePublicClient();

  const [mounted, setMounted]         = useState(false);
  const [creating, setCreating]       = useState(false);
  const [joining, setJoining]         = useState(false);
  const [gameIdInput, setGameIdInput] = useState('');

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const getGasOverrides = async () => {
    const fees = await publicClient!.estimateFeesPerGas();
    return { maxFeePerGas: fees.maxFeePerGas * 2n, maxPriorityFeePerGas: fees.maxPriorityFeePerGas };
  };

  const handleCreateGame = async () => {
    setCreating(true);
    try {
      const gas = await getGasOverrides();
      const hash = await writeContractAsync({ address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'createGame', ...gas });
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      const { parseEventLogs } = await import('viem');
      const logs = parseEventLogs({ abi: GAME_ABI, logs: receipt.logs, eventName: 'PlayerJoined' });
      const gameId = logs[0]?.args?.gameId;
      if (gameId !== undefined) router.push(`/game/${gameId}`);
    } catch (err: unknown) {
      console.error('createGame:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (!gameIdInput) return;
    setJoining(true);
    try {
      const gas = await getGasOverrides();
      const hash = await writeContractAsync({ address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'joinGame', args: [BigInt(gameIdInput)], ...gas });
      console.log('Joined game:', hash);
      router.push(`/game/${gameIdInput}`);
    } catch (err: unknown) {
      console.error('joinGame:', err);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-saloon-card border border-saloon-border rounded-xl p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-center mb-2">🃏🔫 Liar's Bar</h1>
        <p className="text-center text-gray-400 text-sm mb-6">Encrypted cards. Secret bullets. On Fhenix CoFHE.</p>

        {!isConnected ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-3">Connect your wallet to play:</p>
            {connectors.map(connector => (
              <button key={connector.id} onClick={() => connect({ connector })}
                className="w-full bg-saloon-green text-black font-bold py-3 rounded-lg hover:bg-saloon-green/90"
              >Connect {connector.name}</button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-gray-500 font-mono text-center">
              {address?.slice(0, 6)}…{address?.slice(-4)}
              <button onClick={() => disconnect()} className="ml-2 text-red-400 hover:underline">Disconnect</button>
            </div>

            <button onClick={handleCreateGame} disabled={creating}
              className="w-full bg-saloon-green text-black font-bold py-3 rounded-lg hover:bg-saloon-green/90 disabled:opacity-50"
            >{creating ? 'Creating…' : 'Create New Game'}</button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-xs text-gray-500">OR</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            <div className="space-y-2">
              <input type="text" placeholder="Game ID" value={gameIdInput} onChange={e => setGameIdInput(e.target.value)}
                className="w-full bg-saloon-bg border border-saloon-border rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={handleJoinGame} disabled={joining || !gameIdInput}
                className="w-full bg-gray-700 font-bold py-3 rounded-lg hover:bg-gray-600 disabled:opacity-50"
              >{joining ? 'Joining…' : 'Join Game'}</button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-saloon-border text-xs text-gray-500 text-center">
          <p>🔒 All cards and bullet positions are FHE-encrypted.</p>
          <p className="mt-1">Nobody knows your hand or the bullet chamber until revealed.</p>
        </div>
      </div>
    </div>
  );
}
