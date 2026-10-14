import type { SavedEvent } from '../../domain/events.ts';
import type { LocalRepository, Mutation } from '../local/repository.ts';
export type MutationResult =
  | {
      ok: true;
      event: SavedEvent;
      acceptedVersion?: number;
    }
  | {
      ok: false;
      kind: 'conflict';
      current: SavedEvent;
    }
  | {
      ok: false;
      kind: 'unauthorized' | 'validation' | 'retryable' | 'active_sleep_conflict';
    };
export interface RemoteRepository {
  save(mutation: Mutation): Promise<MutationResult>;
}
export class SyncWorker {
  private running = false;
  async run(
    local: LocalRepository,
    remote: RemoteRepository,
    online: boolean,
    now: Date,
    random = Math.random,
  ) {
    if (this.running) return;
    this.running = true;
    try {
      const blocked = new Set<string>();
      const snapshot = await local.pending();
      for (const item of snapshot.slice(0, 50)) {
        // Re-read after each ACK: chained local edits must use the accepted server version.
        const mutation = (await local.pending()).find((m) => m.mutation_id === item.mutation_id);
        if (!mutation || blocked.has(mutation.event_id)) continue;
        if (!online) {
          if (mutation.status !== 'conflict') await local.status(mutation, 'offline');
          continue;
        }
        if (
          mutation.status === 'conflict' ||
          mutation.next_attempt > now.getTime() ||
          (mutation.status === 'error' && mutation.next_attempt === 0)
        ) {
          blocked.add(mutation.event_id);
          continue;
        }
        await local.status(mutation, 'syncing');
        let result: MutationResult;
        try {
          result = await remote.save(mutation);
        } catch {
          result = { ok: false, kind: 'retryable' };
        }
        if (result.ok) await local.acknowledge(mutation, result.event, result.acceptedVersion);
        else {
          blocked.add(mutation.event_id);
          if (result.kind === 'conflict') await local.conflict(mutation, result.current);
          else if (result.kind === 'unauthorized') {
            await local.purgeBaby(mutation.baby_id);
          } else if (result.kind === 'retryable') {
            const delay =
              Math.min(300000, 1000 * 2 ** Math.min(mutation.attempts, 8)) *
              (0.75 + random() * 0.5);
            await local.status(mutation, 'error', now.getTime() + Math.floor(delay), 'sync_error');
          } else await local.status(mutation, 'error', 0, result.kind);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
