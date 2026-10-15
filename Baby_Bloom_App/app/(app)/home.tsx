import { lazy } from 'react';
import { DeferredScreen } from '../../src/components/deferred-screen';
const HomeScreen = lazy(() => import('../../src/features/home-screen'));
export default function Home() {
  return (
    <DeferredScreen>
      <HomeScreen />
    </DeferredScreen>
  );
}
