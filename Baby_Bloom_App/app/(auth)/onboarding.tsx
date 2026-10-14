import { lazy } from 'react';
import { DeferredScreen } from '../../src/components/deferred-screen';
const OnboardingScreen = lazy(() => import('../../src/features/onboarding-screen'));
export default function Onboarding() {
  return (
    <DeferredScreen form>
      <OnboardingScreen />
    </DeferredScreen>
  );
}
