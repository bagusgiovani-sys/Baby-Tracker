import { lazy } from 'react';
import { DeferredScreen } from '../../src/components/deferred-screen';
const ProfileScreen = lazy(() => import('../../src/features/profile-screen'));
export default function Profile() {
  return (
    <DeferredScreen>
      <ProfileScreen />
    </DeferredScreen>
  );
}
