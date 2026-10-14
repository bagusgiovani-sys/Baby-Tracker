import { AnimatePresence, motion } from 'framer-motion';
import { FetusMark } from './fetus-mark';
import type { LaunchTransitionProps } from './launch-motion';

export function LaunchTransition({ visible, greeting, subtitle, children }: LaunchTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      {visible ? (
        <motion.div
          key="launch"
          role="status"
          aria-label={greeting}
          aria-live="polite"
          data-motion="launch-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--bb-canvas, #060A08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 18,
            padding: 24,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.75, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <FetusMark size={280} />
          </motion.div>
          <motion.h1
            aria-label={greeting}
            style={{
              margin: 0,
              color: 'var(--bb-ink, #EDF5EF)',
              fontSize: 'clamp(38px,8vw,64px)',
              fontWeight: 800,
              letterSpacing: '-2px',
              fontFamily: 'system-ui,sans-serif',
              textAlign: 'center',
            }}
          >
            {[...greeting].map((letter, index) => (
              <motion.span
                aria-hidden="true"
                key={index}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.2 + index * 0.055,
                  duration: 0.45,
                  type: 'spring',
                  stiffness: 180,
                  damping: 16,
                }}
                style={{ display: 'inline-block', whiteSpace: 'pre' }}
              >
                {letter}
              </motion.span>
            ))}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            style={{
              margin: 0,
              maxWidth: 320,
              color: 'var(--bb-muted, #9AADA0)',
              textAlign: 'center',
              fontSize: 16,
              fontFamily: 'system-ui,sans-serif',
              lineHeight: 1.6,
            }}
          >
            {subtitle}
          </motion.p>
          <div
            aria-hidden="true"
            style={{
              height: 2,
              width: 120,
              background: 'var(--bb-mint, #17291B)',
              borderRadius: 2,
              marginTop: 16,
              overflow: 'hidden',
            }}
          >
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                height: '100%',
                width: '100%',
                background:
                  'linear-gradient(90deg,transparent,var(--bb-brand, #ADFF70),transparent)',
              }}
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="application"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', minHeight: 0 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
