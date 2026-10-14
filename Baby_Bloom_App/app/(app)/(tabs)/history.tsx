import { lazy } from 'react';
import { DeferredScreen } from '../../../src/components/deferred-screen';
const HistoryScreen = lazy(() => import('../../../src/features/history-screen'));
export default function History() {
  return (
    <DeferredScreen>
      <HistoryScreen />
    </DeferredScreen>
  );
}
