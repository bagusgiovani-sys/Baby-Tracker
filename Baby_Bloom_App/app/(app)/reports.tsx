import { lazy } from 'react';
import { DeferredScreen } from '../../src/components/deferred-screen';
const Reports = lazy(() => import('../../src/features/reports-screen'));
export default function ReportsRoute() {
  return (
    <DeferredScreen>
      <Reports />
    </DeferredScreen>
  );
}
