import { useEffect, useState } from 'react';
import { useStore } from './store';
import { babyOverview } from '../domain/baby-overview';

export function useBabyOverview() {
  const { baby, events } = useStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  return baby ? babyOverview(events, baby, now) : null;
}
