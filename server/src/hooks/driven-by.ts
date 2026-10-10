import { AsyncLocalStorage } from 'node:async_hooks';
import type { DrivenBy } from '@reticlehq/core';

/**
 * Which Harness drive the current tool call belongs to, carried across every await under it.
 *
 * The Harness dispatches through the same tools an agent calls, so nothing in a tool's arguments can
 * say who called it, and adding a field to every tool's schema would advertise it to every agent.
 * The context is set once around each Harness call and read where the journal writes the action.
 */
const current = new AsyncLocalStorage<DrivenBy>();

export function runDrivenBy<T>(by: DrivenBy, fn: () => Promise<T>): Promise<T> {
  return current.run(by, fn);
}

/** The Harness drive this call is part of, or undefined when the connected agent made it. */
export function currentDrivenBy(): DrivenBy | undefined {
  return current.getStore();
}

/**
 * Bind a callback to the Harness drive running NOW, so it is still the Harness's when it fires later.
 *
 * A wait re-checks its predicate from a page-event listener and a timer, outside the awaited chain,
 * where this context does not reach. Those re-checks went to the page untagged and the HUD filed the
 * Harness's own "Finding…" rows in the Agent Log. Returns `fn` unchanged outside a drive.
 */
export function bindDrivenBy<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
  const by = current.getStore();
  if (by === undefined) return fn;
  return (...args: A): void => {
    current.run(by, () => fn(...args));
  };
}
