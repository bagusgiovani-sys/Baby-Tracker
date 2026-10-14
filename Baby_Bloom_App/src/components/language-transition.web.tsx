import { useEffect, useRef } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import type { LanguageTransitionProps } from './language-transition';

export function LanguageTransition({ locale, children }: LanguageTransitionProps) {
  const previousLocale = useRef(locale);
  const controls = useAnimationControls();
  useEffect(() => {
    if (previousLocale.current === locale) return;
    previousLocale.current = locale;
    controls.stop();
    controls.set({ opacity: 0.2, y: 8 });
    void controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
    });
    return () => controls.stop();
  }, [locale, controls]);
  return (
    <motion.div
      data-motion="language-switch"
      initial={false}
      animate={controls}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}
    >
      {children}
    </motion.div>
  );
}
