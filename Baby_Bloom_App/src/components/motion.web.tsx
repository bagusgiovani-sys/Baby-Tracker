import { useContext, useEffect, useRef } from 'react';
import { motion, useAnimationControls, useInView } from 'framer-motion';
import type {
  CareIconKind,
  MotionPageProps,
  MotionSurfaceProps,
  SkeletonBlockProps,
} from './motion';
import { MotionCycle } from './motion-context';

const ease = [0.22, 1, 0.36, 1] as const;
// The owner explicitly requested always-on motion, including device-reduced mode.
const reduced = false;
export function MotionPage({ children, cycle }: MotionPageProps) {
  const controls = useAnimationControls();
  useEffect(() => {
    controls.stop();
    controls.set({ opacity: reduced ? 1 : 0, x: reduced ? 0 : 20 });
    void controls.start({ opacity: 1, x: 0, transition: { duration: reduced ? 0 : 0.38, ease } });
  }, [cycle, controls]);
  return (
    <MotionCycle.Provider value={cycle}>
      <motion.div animate={controls} style={{ width: '100%', minWidth: 0 }}>
        {children}
      </motion.div>
    </MotionCycle.Provider>
  );
}

export function MotionSurface({
  children,
  delay = 0,
  hover = false,
  compact = false,
  interactive = false,
  reveal = true,
}: MotionSurfaceProps) {
  const cycle = useContext(MotionCycle);
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true, amount: 'some' });
  const controls = useAnimationControls();
  useEffect(() => {
    controls.stop();
    if (!reveal || reduced) {
      controls.set({ opacity: 1, y: 0, scale: 1 });
      return;
    }
    controls.set({ opacity: 0, y: 28, scale: 0.98 });
    if (visible)
      void controls.start({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.55, delay, ease },
      });
  }, [cycle, visible, reveal, delay, controls]);
  return (
    <motion.div
      ref={ref}
      tabIndex={interactive ? -1 : undefined}
      initial={reduced || !reveal ? false : { opacity: 0, y: 28, scale: 0.98 }}
      animate={controls}
      whileHover={hover && !reduced ? { y: -5, transition: { duration: 0.2 } } : undefined}
      whileTap={interactive && !reduced ? { scale: 0.96 } : undefined}
      style={{ width: compact ? 'auto' : '100%', minWidth: 0 }}
    >
      {children}
    </motion.div>
  );
}

export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
    >
      <style>{`html {  background: var(--bb-canvas, #060A08); } ::selection { background: var(--bb-brand, #ADFF70); color: #101B0B; } input:focus-visible, textarea:focus-visible, [role="button"]:focus-visible, [role="radio"]:focus-visible { outline: 2px solid var(--bb-brand, #ADFF70) !important; outline-offset: 4px; }`}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(var(--bb-glow, 173,255,112),.035) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--bb-glow, 173,255,112),.035) 1px,transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'linear-gradient(to bottom,black,transparent 85%)',
        }}
      />
      <motion.div
        animate={
          reduced
            ? { opacity: 0.35, x: 0, y: 0 }
            : { opacity: [0.35, 0.8, 0.35], x: [0, 55, 0], y: [0, 25, 0] }
        }
        transition={
          reduced ? { duration: 0 } : { duration: 8, repeat: Infinity, ease: 'easeInOut' }
        }
        style={{
          position: 'absolute',
          top: -260,
          right: -230,
          width: 800,
          height: 800,
          borderRadius: '50%',
          background:
            'radial-gradient(circle,rgba(var(--bb-glow, 173,255,112),.18),transparent 65%)',
        }}
      />
    </div>
  );
}

// A decorative care symbol, not a heart-rate reading or medical visualization.
export function HeartMark({ size = 300 }: { size?: number }) {
  return (
    <div
      aria-hidden="true"
      data-motion="care-heart"
      style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}
    >
      <motion.div
        animate={
          reduced
            ? { opacity: 0.25, scale: 1 }
            : { opacity: [0.25, 0.65, 0.25], scale: [0.85, 1.12, 0.85] }
        }
        transition={
          reduced ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
        }
        style={{
          position: 'absolute',
          inset: '6%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle,rgba(var(--bb-glow, 173,255,112),.26),transparent 70%)',
        }}
      />
      <svg viewBox="0 0 320 320" width={size} height={size} style={{ overflow: 'visible' }}>
        {[0, 1].map((index) => (
          <motion.circle
            key={index}
            cx="160"
            cy="160"
            r="112"
            fill="none"
            stroke="var(--bb-brand, #ADFF70)"
            strokeWidth="1"
            initial={false}
            animate={reduced ? { opacity: 0.2 } : { scale: [0.88, 1.3], opacity: [0.4, 0] }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 2.8, delay: index * 1.4, repeat: Infinity, ease: 'easeOut' }
            }
            style={{ transformOrigin: '160px 160px' }}
          />
        ))}
        <motion.g
          animate={reduced ? { scale: 1 } : { scale: [1, 1.09, 1, 1.05, 1] }}
          transition={
            reduced
              ? { duration: 0 }
              : {
                  duration: 2.4,
                  times: [0, 0.18, 0.32, 0.46, 1],
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
          style={{
            transformOrigin: '160px 160px',
            filter: 'drop-shadow(0 0 14px rgba(var(--bb-glow, 173,255,112),.35))',
          }}
        >
          <path
            d="M160 240C145 226 78 181 78 134C78 108 98 89 123 89C140 89 152 99 160 112C168 99 180 89 197 89C222 89 242 108 242 134C242 181 175 226 160 240Z"
            fill="var(--bb-mint, #17291B)"
            stroke="var(--bb-brand, #ADFF70)"
            strokeWidth="3"
          />
          <circle cx="163" cy="141" r="15" fill="var(--bb-brand, #ADFF70)" fillOpacity=".9" />
          <path
            d="M181 163C191 171 190 193 173 202C157 211 137 201 139 187C140 176 150 174 160 180"
            fill="none"
            stroke="var(--bb-brand, #ADFF70)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M152 157C142 164 139 172 140 179"
            fill="none"
            stroke="var(--bb-brand, #ADFF70)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </motion.g>
        {[
          { x: 56, y: 140 },
          { x: 263, y: 112 },
          { x: 231, y: 256 },
        ].map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="var(--bb-brand, #ADFF70)"
            animate={
              reduced ? { y: 0, opacity: 0.35 } : { y: [0, -12, 0], opacity: [0.35, 1, 0.35] }
            }
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 3, delay: index * 0.4, repeat: Infinity, ease: 'easeInOut' }
            }
          />
        ))}
      </svg>
    </div>
  );
}

const iconPaths: Record<CareIconKind, string> = {
  feeding: 'M10 3h4v4l3 3v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10l3-3V3Zm-3 10h10M10 16h3',
  diaper: 'M4 6h16v5c0 6-4 9-8 9s-8-3-8-9V6Zm0 4 5 3m11-3-5 3M8 17c1-4 7-4 8 0',
  sleep: 'M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11ZM17 3v4m-2-2h4',
  today:
    'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  history: 'M5 4h14v17H5V4Zm4-2v4m6-4v4M9 10h6m-6 4h6m-6 4h3',
  growth: 'M5 3v18h16M9 16l4-5 3 2 5-7m-5 0h5v5',
  development: 'M12 4c-5-4-10 2-7 6l7 10 7-10c3-4-2-10-7-6Z',
  health: 'M12 4c-5-4-10 2-7 6l7 10 7-10c3-4-2-10-7-6Zm0 4v6m-3-3h6',
};
export function CareIcon({
  kind,
  size = 30,
  color = 'var(--bb-brand, #ADFF70)',
  active = false,
}: {
  kind: CareIconKind;
  size?: number;
  color?: string;
  active?: boolean;
}) {
  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={
        reduced
          ? { y: 0, rotate: 0, scale: 1 }
          : {
              y: [0, -3, 0],
              rotate: kind === 'sleep' ? [0, -8, 0] : [0, 3, 0],
              scale: active ? [1, 1.12, 1] : 1,
            }
      }
      transition={
        reduced ? { duration: 0 } : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <path d={iconPaths[kind]} />
    </motion.svg>
  );
}

export function SkeletonBlock({
  width = '100%',
  height = 20,
  rounded = false,
}: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      data-motion="skeleton"
      style={{
        width,
        height,
        borderRadius: rounded ? 18 : 6,
        background: 'var(--bb-elevated, #1B2B20)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {!reduced && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg,transparent,rgba(var(--bb-glow, 173,255,112),.14),transparent)',
          }}
        />
      )}
    </div>
  );
}
