'use client';
import { motion, AnimatePresence } from 'framer-motion';

type Phase = 'suspense' | 'click' | 'bang' | null;

export function TriggerAnimation({ playerName, phase }: { playerName: string; phase: Phase }) {
  return (
    <AnimatePresence>
      {phase && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            background:
              phase === 'bang'  ? 'radial-gradient(circle, #ff0000 0%, #0d0d0d 70%)' :
              phase === 'click' ? 'radial-gradient(circle, #004400 0%, #0d0d0d 70%)' :
              '#0d0d0d',
          }}
        >
          <motion.div className="text-8xl mb-6"
            animate={phase === 'suspense' ? { rotate: [0, -5, 5, -5, 5, 0], transition: { duration: 1.5, repeat: Infinity } } : {}}
          >🔫</motion.div>

          <h2 className="text-2xl font-bold mb-4">{playerName}</h2>

          {phase === 'suspense' && (
            <motion.p className="text-yellow-400 text-xl"
              animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}
            >Pulling the trigger…</motion.p>
          )}
          {phase === 'click' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
              <p className="text-5xl font-black text-green-400">CLICK</p>
              <p className="text-gray-400 mt-2">Safe… this time.</p>
            </motion.div>
          )}
          {phase === 'bang' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.5, 1] }} className="text-center">
              <p className="text-5xl font-black text-red-400">💥 BANG</p>
              <p className="text-gray-300 mt-2">Eliminated.</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
