import { Redirect } from 'expo-router';
import { useStore } from '../src/lib/store';
import { Loading } from '../src/components/ui';
export default function Index() { const { ready, session } = useStore(); if (!ready)
    return <Loading />; return <Redirect href={session ? '/today' : '/welcome'}/>; }
