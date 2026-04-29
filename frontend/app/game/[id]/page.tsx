'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, usePublicClient, useWriteContract, useWatchContractEvent } from 'wagmi';
import { getContract, parseEventLogs } from 'viem';
import { GAME_ADDRESS, DECK_ADDRESS, ROULETTE_ADDRESS, GAME_ABI, DECK_ABI, ROULETTE_ABI, GameState } from '@/lib/contracts';
import { useCofheClient } from '@/hooks/useCofheClient';
import { useChallenge } from '@/hooks/useChallenge';
import { usePullTrigger } from '@/hooks/usePullTrigger';
import { CardHand } from '@/components/CardHand';
import { PlayerSeat } from '@/components/PlayerSeat';
import { ClaimModal } from '@/components/ClaimModal';
import { TriggerAnimation } from '@/components/TriggerAnimation';
import { GameLog, LogEntry } from '@/components/GameLog';

export default function GamePage() {
  const { id }                 = useParams<{ id: string }>();
  const gameId                 = BigInt(id ?? '0');
  const { address }            = useAccount();
  const publicClient           = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { isReady }            = useCofheClient();
  const { executeChallenge }   = useChallenge();
  const { executeTriggerPull } = usePullTrigger();

  const [gameState, setGameState]           = useState<number>(GameState.WaitingForPlayers);
  const [players, setPlayers]               = useState<string[]>([]);
  const [eliminated, setEliminated]         = useState<boolean[]>([]);
  const [currentPlayer, setCurrentPlayer]   = useState<string>('');
  const [myHandHashes, setMyHandHashes]     = useState<bigint[]>([]);
  const [pullCounts, setPullCounts]         = useState<Record<string, number>>({});
  const [roulettePlayer, setRoulettePlayer] = useState<string>('');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [triggerPhase, setTriggerPhase]     = useState<'suspense' | 'click' | 'bang' | null>(null);
  const [log, setLog]                       = useState<LogEntry[]>([]);
  const [status, setStatus]                 = useState('');
  const [copied, setCopied]                 = useState(false);
  const [mounted, setMounted]               = useState(false);
  const startBlockRef                       = useRef<bigint | null>(null);
  const pullingRef                          = useRef(false); // prevent double-trigger

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!publicClient) return;
    publicClient.getBlockNumber().then(b => { startBlockRef.current = b; });
  }, [publicClient]);

  const addLog = useCallback((entry: LogEntry) =>
    setLog(prev => [...prev, entry]),
  []);

  // ─── Refresh on-chain state ───────────────────────────────────────
  const refreshState = useCallback(async () => {
    if (!publicClient) return;
    const game     = getContract({ address: GAME_ADDRESS,     abi: GAME_ABI,     client: publicClient });
    const roulette = getContract({ address: ROULETTE_ADDRESS, abi: ROULETTE_ABI, client: publicClient });

    const [state, current, [ps, elim]] = await Promise.all([
      game.read.getGameState([gameId])     as Promise<number>,
      game.read.getCurrentPlayer([gameId]) as Promise<string>,
      game.read.getPlayers([gameId])       as Promise<[string[], boolean[]]>,
    ]);

    setGameState(state); setCurrentPlayer(current); setPlayers(ps); setEliminated(elim);

    if (state === GameState.Roulette) {
      const rp = await game.read.getPendingRoulettePlayer([gameId]) as string;
      setRoulettePlayer(rp);
    } else {
      setRoulettePlayer('');
    }

    const counts: Record<string, number> = {};
    for (const p of ps) counts[p] = Number(await roulette.read.getPullCount([gameId, p as `0x${string}`]));
    setPullCounts(counts);

    if (address && state >= GameState.PlayerTurn) {
      const deck = getContract({ address: DECK_ADDRESS, abi: DECK_ABI, client: publicClient });
      const hashes = await deck.read.getHandHashes([gameId, address as `0x${string}`]) as bigint[];
      setMyHandHashes(hashes);
    }
  }, [publicClient, gameId, address]);

  // ─── Hydrate log from past events ────────────────────────────────
  const hydrateLog = useCallback(async () => {
    if (!publicClient) return;
    const fromBlock = startBlockRef.current ?? await publicClient.getBlockNumber();
    const [claims, challenges, reveals, triggers, eliminations] = await Promise.all([
      publicClient.getLogs({ address: GAME_ADDRESS, event: GAME_ABI.find(e => e.name === 'ClaimMade')     as any, args: { gameId }, fromBlock }),
      publicClient.getLogs({ address: GAME_ADDRESS, event: GAME_ABI.find(e => e.name === 'ChallengeIssued') as any, args: { gameId }, fromBlock }),
      publicClient.getLogs({ address: GAME_ADDRESS, event: GAME_ABI.find(e => e.name === 'RevealResult')  as any, args: { gameId }, fromBlock }),
      publicClient.getLogs({ address: GAME_ADDRESS, event: GAME_ABI.find(e => e.name === 'TriggerPulled') as any, args: { gameId }, fromBlock }),
      publicClient.getLogs({ address: GAME_ADDRESS, event: GAME_ABI.find(e => e.name === 'PlayerEliminated') as any, args: { gameId }, fromBlock }),
    ]);

    const entries: (LogEntry & { blockNumber: bigint })[] = [
      ...parseEventLogs({ abi: GAME_ABI, logs: claims,       eventName: 'ClaimMade'        }).map(l => ({ type: 'claim'      as const, player: l.args.claimant,   rank: l.args.rank,   count: l.args.count,     blockNumber: l.blockNumber ?? 0n })),
      ...parseEventLogs({ abi: GAME_ABI, logs: challenges,   eventName: 'ChallengeIssued'  }).map(l => ({ type: 'challenge'  as const, player: l.args.challenger,                                               blockNumber: l.blockNumber ?? 0n })),
      ...parseEventLogs({ abi: GAME_ABI, logs: reveals,      eventName: 'RevealResult'     }).map(l => ({ type: 'reveal'     as const, player: l.args.loser,                        wasLying: l.args.wasLying,  blockNumber: l.blockNumber ?? 0n })),
      ...parseEventLogs({ abi: GAME_ABI, logs: triggers,     eventName: 'TriggerPulled'    }).map(l => ({ type: 'trigger'    as const, player: l.args.player,                        survived: l.args.survived,  blockNumber: l.blockNumber ?? 0n })),
      ...parseEventLogs({ abi: GAME_ABI, logs: eliminations, eventName: 'PlayerEliminated' }).map(l => ({ type: 'eliminated' as const, player: l.args.player,                                                   blockNumber: l.blockNumber ?? 0n })),
    ];

    entries.sort((a, b) => Number(a.blockNumber - b.blockNumber));
    setLog(entries);
  }, [publicClient, gameId]);

  useEffect(() => {
    refreshState();
    hydrateLog();
    const t = setInterval(refreshState, 3000);
    return () => clearInterval(t);
  }, [refreshState, hydrateLog]);

  // ─── Real-time event watching (replaces polling) ──────────────────
  useWatchContractEvent({ address: GAME_ADDRESS, abi: GAME_ABI, eventName: 'PlayerJoined',    args: { gameId }, onLogs: () => refreshState() });
  useWatchContractEvent({ address: GAME_ADDRESS, abi: GAME_ABI, eventName: 'GameStarted',     args: { gameId }, onLogs: () => refreshState() });
  useWatchContractEvent({ address: GAME_ADDRESS, abi: GAME_ABI, eventName: 'ClaimMade',       args: { gameId }, onLogs: logs => { refreshState(); logs.forEach(l => addLog({ type: 'claim',      player: (l.args as any).claimant,   rank: (l.args as any).rank,  count: (l.args as any).count })); } });
  useWatchContractEvent({ address: GAME_ADDRESS, abi: GAME_ABI, eventName: 'ChallengeIssued', args: { gameId }, onLogs: logs => { refreshState(); logs.forEach(l => addLog({ type: 'challenge',  player: (l.args as any).challenger })); } });
  useWatchContractEvent({ address: GAME_ADDRESS, abi: GAME_ABI, eventName: 'RevealResult',    args: { gameId }, onLogs: logs => { refreshState(); logs.forEach(l => addLog({ type: 'reveal',     player: (l.args as any).loser,      wasLying: (l.args as any).wasLying })); } });
  useWatchContractEvent({ address: GAME_ADDRESS, abi: GAME_ABI, eventName: 'TriggerPulled',   args: { gameId }, onLogs: logs => { refreshState(); logs.forEach(l => addLog({ type: 'trigger',    player: (l.args as any).player,     survived: (l.args as any).survived })); } });
  useWatchContractEvent({ address: GAME_ADDRESS, abi: GAME_ABI, eventName: 'PlayerEliminated',args: { gameId }, onLogs: logs => { refreshState(); logs.forEach(l => addLog({ type: 'eliminated', player: (l.args as any).player })); } });
  useWatchContractEvent({ address: GAME_ADDRESS, abi: GAME_ABI, eventName: 'GameOver',        args: { gameId }, onLogs: logs => { refreshState(); logs.forEach(l => addLog({ type: 'gameover',   player: '', winner: (l.args as any).winner })); } });

  // ─── Auto-trigger roulette when RouletteStarted fires for me ─────
  useWatchContractEvent({
    address: GAME_ADDRESS,
    abi: GAME_ABI,
    eventName: 'RouletteStarted',
    args: { gameId },
    onLogs: async (logs) => {
      console.log('[RouletteStarted] event fired, logs:', logs.length, 'address:', address, 'isReady:', isReady, 'pullingRef:', pullingRef.current);
      const mine = logs.find(l => (l.args as any).player?.toLowerCase() === address?.toLowerCase());
      if (!mine) { console.log('[RouletteStarted] not for me'); return; }
      if (pullingRef.current) { console.log('[RouletteStarted] already pulling'); return; }
      if (!isReady) { console.log('[RouletteStarted] CoFHE not ready yet'); return; }
      console.log('[RouletteStarted] triggering pull...');
      pullingRef.current = true;
      setTriggerPhase('suspense');
      try {
        const roulette = getContract({ address: ROULETTE_ADDRESS, abi: ROULETTE_ABI, client: publicClient! });
        const ctHash   = await roulette.read.pendingTriggerCtHash([gameId, address as `0x${string}`]) as bigint;
        console.log('[trigger] ctHash:', ctHash.toString());
        const { survived } = await executeTriggerPull(gameId, address as `0x${string}`, ctHash);        setTriggerPhase(survived ? 'click' : 'bang');
        addLog({ type: 'trigger', player: address!, survived });
        setTimeout(() => { setTriggerPhase(null); refreshState(); }, 2500);
      } catch (err) {
        console.error('auto-trigger:', err);
        setTriggerPhase(null);
      } finally {
        pullingRef.current = false;
      }
    },
  });

  // ─── Actions ─────────────────────────────────────────────────────
  const withStatus = async (label: string, fn: () => Promise<void>) => {
    setStatus(label);
    try { await fn(); await refreshState(); }
    catch (err: unknown) { console.error(label, err); }
    setStatus('');
  };

  const getGasOverrides = async () => {
    const fees = await publicClient!.estimateFeesPerGas();
    return { maxFeePerGas: fees.maxFeePerGas * 2n, maxPriorityFeePerGas: fees.maxPriorityFeePerGas };
  };

  const handleStartGame = () => withStatus('Starting game…', async () => {
    const gas  = await getGasOverrides();
    const hash = await writeContractAsync({ address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'startGame', args: [gameId], ...gas });
    await publicClient!.waitForTransactionReceipt({ hash });
  });

  const handleClaim = (rank: number, count: number) => {
    setShowClaimModal(false);
    withStatus('Submitting claim…', async () => {
      const gas  = await getGasOverrides();
      const hash = await writeContractAsync({ address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'makeClaim', args: [gameId, rank, count], ...gas });
      await publicClient!.waitForTransactionReceipt({ hash });
    });
  };

  const handleChallenge = () => withStatus('Challenging…', async () => {
    const gas  = await getGasOverrides();
    const hash = await writeContractAsync({ address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'challenge', args: [gameId], ...gas });
    await publicClient!.waitForTransactionReceipt({ hash });

    setStatus('Decrypting claim…');
    await executeChallenge(gameId);
  });

  const handleManualTrigger = async () => {
    if (pullingRef.current) return;
    pullingRef.current = true;
    setTriggerPhase('suspense');
    try {
      const game     = getContract({ address: GAME_ADDRESS,     abi: GAME_ABI,     client: publicClient! });
      const roulette = getContract({ address: ROULETTE_ADDRESS, abi: ROULETTE_ABI, client: publicClient! });

      // Get the actual loser from the contract (not just the connected wallet)
      const player  = await game.read.getPendingRoulettePlayer([gameId]) as `0x${string}`;
      if (!player || player === '0x0000000000000000000000000000000000000000') throw new Error('No pending roulette player');

      const ctHash = await roulette.read.pendingTriggerCtHash([gameId, player]) as bigint;
      if (!ctHash || ctHash === 0n) throw new Error('No pending trigger ctHash');

      const { survived } = await executeTriggerPull(gameId, player, ctHash);
      setTriggerPhase(survived ? 'click' : 'bang');
      addLog({ type: 'trigger', player, survived });
      setTimeout(() => { setTriggerPhase(null); refreshState(); }, 2500);
    } catch (err) {
      console.error('manual trigger:', err);
      setTriggerPhase(null);
    } finally {
      pullingRef.current = false;
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMyTurn  = address?.toLowerCase() === currentPlayer?.toLowerCase();
  const shareLink = typeof window !== 'undefined' ? window.location.href : '';

  if (!mounted) return null;

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <TriggerAnimation playerName={address?.slice(0, 6) ?? ''} phase={triggerPhase} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">🃏 Game #{id}</h1>
        <span className={`text-xs ${isReady ? 'text-green-400' : 'text-yellow-400 animate-pulse'}`}>
          {isReady ? '🔒 CoFHE ready' : '⏳ CoFHE loading…'}
        </span>
      </div>

      {/* Share link (waiting room) */}
      {gameState === GameState.WaitingForPlayers && (
        <div className="mb-4 p-3 bg-saloon-card border border-saloon-border rounded-lg flex items-center gap-2">
          <span className="text-xs text-gray-400 flex-1 truncate">Invite: {shareLink}</span>
          <button onClick={copyShareLink}
            className="text-xs bg-saloon-green text-black px-3 py-1 rounded font-bold shrink-0">
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      )}

      {status && <p className="mb-3 text-sm text-yellow-400 animate-pulse">{status}</p>}

      {/* Players */}
      <div className="flex gap-3 flex-wrap mb-6">
        {players.map((p, i) => (
          <PlayerSeat key={p} address={p}
            isCurrentTurn={p.toLowerCase() === currentPlayer?.toLowerCase()}
            isEliminated={eliminated[i]}
            pullCount={pullCounts[p] ?? 0}
            isInRoulette={gameState === GameState.Roulette && p.toLowerCase() === currentPlayer?.toLowerCase()}
          />
        ))}
      </div>

      {/* My hand */}
      {myHandHashes.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-2">Your Hand</p>
          <CardHand ctHashes={myHandHashes} isOwnHand={true} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {gameState === GameState.WaitingForPlayers && players[0]?.toLowerCase() === address?.toLowerCase() && players.length >= 2 && (
          <button onClick={handleStartGame} className="bg-saloon-green text-black font-bold px-6 py-2 rounded-lg hover:bg-saloon-green/90">
            Start Game ({players.length} players)
          </button>
        )}
        {gameState === GameState.WaitingForPlayers && players[0]?.toLowerCase() === address?.toLowerCase() && players.length < 2 && (
          <p className="text-sm text-gray-500 animate-pulse">Waiting for players to join…</p>
        )}
        {gameState === GameState.PlayerTurn && isMyTurn && (
          <>
            <button onClick={() => setShowClaimModal(true)} className="bg-saloon-green text-black font-bold px-6 py-2 rounded-lg hover:bg-saloon-green/90">
              Make Claim
            </button>
            <button onClick={handleChallenge} className="bg-red-600 font-bold px-6 py-2 rounded-lg hover:bg-red-500">
              🔫 Call Liar!
            </button>
          </>
        )}
        {gameState === GameState.PlayerTurn && !isMyTurn && (
          <p className="text-sm text-gray-500 animate-pulse">Waiting for {currentPlayer.slice(0,6)}…</p>
        )}
        {gameState === GameState.Roulette && roulettePlayer.toLowerCase() === address?.toLowerCase() && (
          <button onClick={handleManualTrigger}
            className="bg-red-700 font-bold px-6 py-2 rounded-lg hover:bg-red-600 animate-pulse">
            🔫 Pull Trigger
          </button>
        )}
        {gameState === GameState.Roulette && roulettePlayer && roulettePlayer.toLowerCase() !== address?.toLowerCase() && (
          <p className="text-sm text-gray-500 animate-pulse">🔫 {roulettePlayer.slice(0,6)}… is pulling the trigger…</p>
        )}
        {gameState === GameState.GameOver && (
          <p className="text-yellow-400 font-bold text-xl">🏆 Game Over!</p>
        )}
      </div>

      <GameLog entries={log} />
      <ClaimModal isOpen={showClaimModal} onClose={() => setShowClaimModal(false)} onConfirm={handleClaim} />
    </div>
  );
}
