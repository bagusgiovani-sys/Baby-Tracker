import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
export function SwipeSurface({
  children,
  index,
  onNext,
  onPrevious,
}: {
  children: ReactNode;
  index: number;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <div style={{ position: 'relative', padding: '14px 4px', perspective: 1000 }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '24px 16px 6px',
          borderRadius: 28,
          background: 'var(--bb-blue)',
          transform: 'rotate(-3deg)',
        }}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          data-motion="daily-swipe-card"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.35}
          onDragEnd={(_, info) => {
            if (info.offset.x < -65) onNext();
            else if (info.offset.x > 65) onPrevious();
          }}
          initial={{ opacity: 0, x: 60, rotate: 3 }}
          animate={{ opacity: 1, x: 0, rotate: [0, 0.7, 0, -0.7, 0], y: [0, -7, 0] }}
          exit={{ opacity: 0, x: -70, rotate: -4 }}
          transition={{
            opacity: { duration: 0.2 },
            x: { type: 'spring', stiffness: 260, damping: 25 },
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
          }}
          style={{
            position: 'relative',
            touchAction: 'pan-y',
            cursor: 'grab',
            borderRadius: 28,
            background: 'var(--bb-paper)',
            border: '1px solid var(--bb-border)',
            padding: 24,
            boxShadow: '0 20px 70px rgba(var(--bb-glow),.12)',
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
