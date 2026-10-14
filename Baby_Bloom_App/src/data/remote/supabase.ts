import { eventSchema, type Baby, type BabyInput, type SavedEvent } from '../../domain/events';
import { supabase } from '../../lib/supabase';
import type { Json } from '../../lib/database';
import type { Mutation } from '../local/repository';
import type { MutationResult, RemoteRepository } from '../sync/worker';
type WireEvent = SavedEvent & {
  updated_at: string;
};
function normalize(input: unknown): SavedEvent {
  const wire = input as WireEvent;
  const event = eventSchema.parse({
    id: wire.id,
    baby_id: wire.baby_id,
    event_type: wire.event_type,
    occurred_at: wire.occurred_at,
    ended_at: wire.ended_at,
    note: wire.note,
    detail: wire.detail,
  });
  return {
    ...event,
    recorded_by: wire.recorded_by,
    server_version: wire.server_version,
    deleted_at: wire.deleted_at,
    sync_status: 'synced',
  };
}
export async function listBabies(): Promise<Baby[]> {
  if (!supabase) throw new Error('config_required');
  const { data, error, status } = await supabase.rpc('list_babies');
  if (error) throw new Error(status === 401 ? 'unauthorized' : 'error');
  return data as unknown as Baby[];
}
export async function createBaby(input: BabyInput): Promise<Baby> {
  if (!supabase) throw new Error('config_required');
  const { data, error } = await supabase.rpc('create_baby', { p_input: input as unknown as Json });
  if (error)
    throw new Error(
      ['birth_in_future', 'invalid_timezone', 'consent_required'].find((code) =>
        error.message.includes(code),
      ) ?? 'error',
    );
  return data as unknown as Baby;
}
export async function pullEvents(
  babyId: string,
  onEvent: (event: SavedEvent) => Promise<void>,
  cursor: string | null,
): Promise<string | null> {
  if (!supabase) return cursor;
  // Small overlap handles equal timestamps; repository versions deduplicate rows.
  let after: string | null = cursor ? new Date(Date.parse(cursor) - 1000).toISOString() : null;
  let afterId: string | null = null;
  let latest = cursor;
  for (let page = 0; page < 100; page++) {
    const { data, error } = await supabase.rpc('list_events', {
      p_baby_id: babyId,
      p_after: after,
      p_after_id: afterId,
    });
    if (error) throw new Error(error.message.includes('unauthorized') ? 'unauthorized' : 'error');
    const events = data as unknown as WireEvent[];
    for (const event of events) {
      await onEvent(normalize(event));
      latest = event.updated_at;
    }
    if (events.length < 500) return latest;
    const last = events[events.length - 1]!;
    after = last.updated_at;
    afterId = last.id;
  }
  return latest;
}
export const remote: RemoteRepository = {
  async save(mutation: Mutation): Promise<MutationResult> {
    if (!supabase) return { ok: false, kind: 'retryable' };
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user.id !== mutation.owner_id) return { ok: false, kind: 'retryable' };
    const { data, error } = await supabase.rpc('save_care_event', {
      p_event: mutation.payload as unknown as Json,
      p_mutation_id: mutation.mutation_id,
      p_expected_version: mutation.expected_version,
      p_operation: mutation.operation,
      p_future_confirmed: mutation.future_confirmed,
    });
    if (error) {
      if (error.code === 'P0001' && error.message.includes('unauthorized'))
        return { ok: false, kind: 'unauthorized' };
      if (error.message.includes('active_sleep_conflict'))
        return { ok: false, kind: 'active_sleep_conflict' };
      if (error.code.startsWith('22') || error.code.startsWith('23') || error.code === 'P0001')
        return { ok: false, kind: 'validation' };
      return { ok: false, kind: 'retryable' };
    }
    const result = data as unknown as {
      ok: boolean;
      event?: WireEvent;
      accepted_version: number;
      kind?: string;
      current?: WireEvent;
    };
    return result.ok
      ? { ok: true, event: normalize(result.event), acceptedVersion: result.accepted_version }
      : { ok: false, kind: 'conflict', current: normalize(result.current) };
  },
};
