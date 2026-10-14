import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import * as Crypto from 'expo-crypto';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { openLocal } from '../data/local/open';
import { LocalRepository } from '../data/local/repository';
import { SyncWorker } from '../data/sync/worker';
import { listBabies, pullEvents, remote, createBaby } from '../data/remote/supabase';
import {
  validateEvent,
  type Baby,
  type BabyInput,
  type CareEvent,
  type SavedEvent,
} from '../domain/events';
import { errorKey, translate, type Locale, type TextKey } from './i18n';
import { readPreferences, writePreferences } from './preferences';
type Store = {
  authReady: boolean;
  ready: boolean;
  profilesReady: boolean;
  busy: boolean;
  session: Session | null;
  error: TextKey | null;
  online: boolean;
  journalReady: boolean;
  babies: Baby[];
  baby: Baby | null;
  events: SavedEvent[];
  locale: Locale;
  hour12: boolean;
  syncErrors: Record<string, TextKey>;
  t: (key: TextKey) => string;
  setLocale: (locale: Locale) => void;
  setHour12: (hour12: boolean) => void;
  selectBaby: (id: string) => void;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  save: (
    event: CareEvent,
    operation: 'create' | 'update' | 'delete',
    futureConfirmed?: boolean,
    baselineVersion?: number,
  ) => Promise<void>;
  addBaby: (input: BabyInput) => Promise<void>;
  serverConflict: (id: string) => Promise<SavedEvent | null>;
  resolve: (id: string, choice: 'mine' | 'server') => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!supabase);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<TextKey | null>(null);
  const [babies, setBabies] = useState<Baby[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [syncErrors, setSyncErrors] = useState<Record<string, TextKey>>({});
  const [local, setLocal] = useState<LocalRepository | null>(null);
  const [localAttempt, setLocalAttempt] = useState(0);
  const [profilesReady, setProfilesReady] = useState(false);
  const [locale, setLocale] = useState<Locale>('id-ID');
  const [hour12, setHour12] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const owner = useRef<string | null>(null);
  const refreshing = useRef(false);
  const worker = useRef(new SyncWorker());
  const net = Network.useNetworkState();
  const online = net.isConnected === true && net.isInternetReachable !== false;
  const [journalReady, setJournalReady] = useState(false);
  useEffect(() => {
    if (!session || !online || !supabase) return;
    let active = true;
    void supabase.rpc('journal_schema_version').then(({ data, error }) => {
      if (active && !error) setJournalReady(data === 3);
    });
    return () => {
      active = false;
    };
  }, [session, online]);
  const baby = babies.find((b) => b.id === selected) ?? babies[0] ?? null;
  const selectedBabyId = baby?.id;
  useEffect(() => {
    let active = true;
    readPreferences()
      .then((value) => {
        if (!active || !value) return;
        try {
          const pref = JSON.parse(value);
          if (pref.locale === 'en' || pref.locale === 'id-ID') setLocale(pref.locale);
          if (typeof pref.hour12 === 'boolean') setHour12(pref.hour12);
        } catch {
          /* use defaults */
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setPreferencesReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (preferencesReady)
      void writePreferences(JSON.stringify({ locale, hour12 })).catch(() => undefined);
  }, [preferencesReady, locale, hour12]);
  useEffect(() => {
    if (!supabase) {
      return;
    }
    let active = true;
    const change = (value: Session | null) => {
      if (!active) return;
      if (owner.current !== (value?.user.id ?? null)) {
        owner.current = value?.user.id ?? null;
        setBabies([]);
        setEvents([]);
        setSelected(null);
        setLocal(null);
        setProfilesReady(false);
        setJournalReady(false);
        setBusy(false);
        setError(null);
      }
      setSession(value);
      setReady(true);
    };
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error && active) setError('error');
        change(data.session);
      })
      .catch(() => {
        if (active) {
          setError('storage_error');
          setReady(true);
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, value) => change(value));
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session?.user.id) return;
    let active = true;
    const id = session.user.id;
    (async () => {
      try {
        const repo = new LocalRepository(await openLocal(), id);
        await repo.initialize();
        const cached = await repo.babies();
        if (active && owner.current === id) {
          setLocal(repo);
          setBabies(cached);
          if (cached.length) setProfilesReady(true);
        }
      } catch (e) {
        if (active) {
          const key = errorKey(e);
          setError(key === 'error' ? 'storage_error' : key);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [session?.user.id, localAttempt]);
  const load = useCallback(async () => {
    if (!local || !selectedBabyId) {
      return;
    }
    const list = await local.events(selectedBabyId);
    const failures = (await local.pending()).filter(
      (item) => item.baby_id === selectedBabyId && item.status === 'error',
    );
    if (owner.current === local.ownerId) {
      setEvents(list);
      setSyncErrors(
        Object.fromEntries(
          failures.map((item) => [
            item.event_id,
            errorKey(new Error(item.error_code ?? 'sync_error')),
          ]),
        ),
      );
    }
  }, [local, selectedBabyId]);
  useEffect(() => {
    void load().catch(() => setError('storage_error'));
  }, [load]);
  const refresh = useCallback(async () => {
    if (!local || refreshing.current) return;
    refreshing.current = true;
    setBusy(true);
    try {
      const permitted = online ? await listBabies() : await local.babies();
      if (owner.current !== local.ownerId) return;
      if (!online && !permitted.length) throw new Error('offline_profile_unavailable');
      if (online) {
        await local.setBabies(permitted);
        setBabies(permitted);
      }
      setProfilesReady(true);
      if (owner.current !== local.ownerId) return;
      await worker.current.run(local, remote, online, new Date());
      if (online)
        for (const b of permitted) {
          if (owner.current !== local.ownerId) break;
          try {
            const cursor = await pullEvents(
              b.id,
              (event) => local.merge(event),
              await local.pullCursor(b.id),
            );
            if (cursor) await local.setPullCursor(b.id, cursor);
          } catch (e) {
            if (errorKey(e) === 'unauthorized') await local.purgeBaby(b.id);
            else throw e;
          }
        }
      if (owner.current === local.ownerId) {
        setBabies(await local.babies());
        setError(null);
        await load();
      }
    } catch (e) {
      if (owner.current === local.ownerId) setError(errorKey(e));
    } finally {
      refreshing.current = false;
      if (owner.current === local.ownerId) setBusy(false);
    }
  }, [local, online, load]);
  useEffect(() => {
    let active = true;
    // Start external synchronization asynchronously and cancel an obsolete effect.
    void Promise.resolve().then(() => {
      if (active) void refresh();
    });
    const timer = setInterval(() => {
      void refresh();
    }, 15000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase?.auth.startAutoRefresh();
        void refresh();
      } else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      clearInterval(timer);
      listener.remove();
    };
  }, [refresh]);
  const save = async (
    event: CareEvent,
    operation: 'create' | 'update' | 'delete',
    futureConfirmed = false,
    baselineVersion?: number,
  ) => {
    if (!local || !session || local.ownerId !== owner.current || event.baby_id !== baby?.id)
      throw new Error('unauthorized');
    if (
      !journalReady &&
      (['meal', 'measurement', 'checkin'].includes(event.event_type) ||
        (event.event_type === 'feeding' && event.detail.nutrition))
    )
      throw new Error('backend_update_required');
    validateEvent(event, new Date(), futureConfirmed);
    await local.save(
      event,
      Crypto.randomUUID(),
      operation,
      futureConfirmed,
      new Date(),
      baselineVersion,
    );
    await load();
    void refresh();
  };
  const serverConflict = useCallback(
    async (id: string) => local?.serverConflict(id) ?? null,
    [local],
  );
  const value: Store = {
    authReady: ready,
    ready: ready && (!session || local !== null || error !== null),
    profilesReady,
    busy,
    session,
    error,
    online,
    journalReady,
    babies,
    baby,
    events: events.filter((event) => event.baby_id === baby?.id),
    syncErrors,
    locale,
    hour12,
    t: (key) => translate(locale, key),
    setLocale,
    setHour12,
    selectBaby: (id) => {
      setEvents([]);
      setSelected(id);
    },
    refresh,
    retry: async () => {
      setError(null);
      if (!local) {
        setLocalAttempt((attempt) => attempt + 1);
        return;
      }
      await local?.retry();
      await refresh();
    },
    save,
    addBaby: async (input) => {
      if (!local || owner.current !== local.ownerId) throw new Error('storage_error');
      const created = await createBaby(input);
      if (owner.current !== local.ownerId) return;
      const updated = [...(await local.babies()), created];
      await local.setBabies(updated);
      setBabies(updated);
      setProfilesReady(true);
      setSelected(created.id);
      await refresh();
    },
    serverConflict,
    resolve: async (id, choice) => {
      if (!local) return;
      await local.resolve(id, choice, Crypto.randomUUID());
      await load();
      void refresh();
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error('StoreProvider missing');
  return value;
}
