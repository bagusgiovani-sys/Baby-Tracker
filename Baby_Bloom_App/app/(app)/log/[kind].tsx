import { lazy } from 'react';
import { DeferredScreen } from '../../../src/components/deferred-screen';
import { loadLogScreen } from '../../../src/features/screen-loaders';
const LogScreen = lazy(loadLogScreen);
export default function Log() {
  return (
    <DeferredScreen form>
      <LogScreen />
    </DeferredScreen>
  );
}
