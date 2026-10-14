import { lazy } from 'react';
import { DeferredScreen } from '../src/components/deferred-screen';
const SettingsScreen = lazy(() => import('../src/features/settings-screen'));
export default function Settings() {
  return (
    <DeferredScreen form>
      <SettingsScreen />
    </DeferredScreen>
  );
}
