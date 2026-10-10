import { describe, expect, it } from 'vitest';
import { ReticleTool } from '@reticlehq/core';
import { checkExpect, checkGoals, goalsIn, goalsMet, unprovedGoals } from './goals.js';

describe('the goals a drive was asked to prove (#1316)', () => {
  it('are the strings the persona quoted', () => {
    expect(
      goalsIn('check that "Ada Lovelace" and “Grace Hopper” are listed, don\'t delete'),
    ).toEqual(['Ada Lovelace', 'Grace Hopper']);
    expect(goalsIn('click around')).toEqual([]);
    expect(goalsIn(undefined)).toEqual([]);
  });

  const page = (tree: string, assertSays: string) => {
    const asked: [string, Record<string, unknown>][] = [];
    const invoke = (name: string, args: Record<string, unknown>): Promise<unknown> => {
      asked.push([name, args]);
      return Promise.resolve(ReticleTool.SNAPSHOT === name ? { tree } : { verified: assertSays });
    };
    return { asked, invoke };
  };
  const asserts = (asked: [string, Record<string, unknown>][]) =>
    asked.filter(([name]) => ReticleTool.ASSERT === name).map(([, args]) => args['predicate']);

  it('records one assert over the quotes the page shows, and reads the rest as not shown', async () => {
    const p = page('heading "Ada Lovelace"', 'yes');
    const checks = await checkGoals(p.invoke, ['Ada Lovelace', 'Grace Hopper']);
    expect(asserts(p.asked)).toEqual([{ kind: 'text', contains: 'Ada Lovelace' }]);
    expect(checks).toEqual([
      { text: 'Ada Lovelace', verified: 'yes' },
      { text: 'Grace Hopper', verified: 'no' },
    ]);
    expect(unprovedGoals(checks)).toContain('"Grace Hopper" (no)');
  });

  it('records a failed check when the page shows none of them', async () => {
    const p = page('heading "Dashboard"', 'no');
    const checks = await checkGoals(p.invoke, ['Ada Lovelace', 'Grace Hopper']);
    expect(asserts(p.asked)).toEqual([
      {
        kind: 'allOf',
        predicates: [
          { kind: 'text', contains: 'Ada Lovelace' },
          { kind: 'text', contains: 'Grace Hopper' },
        ],
      },
    ]);
    expect(checks.map((c) => c.verified)).toEqual(['no', 'no']);
  });

  it('never records a "no" for the start state a working app replaced', async () => {
    // "goes from "Count is 0" to "Count is 1"": one assert, on the end state, and it held.
    const p = page('button "Count is 1"', 'yes');
    await checkGoals(p.invoke, ['Count is 0', 'Count is 1']);
    expect(asserts(p.asked)).toEqual([{ kind: 'text', contains: 'Count is 1' }]);
  });

  /*
   * A Harness drive asked to "check the page shows "Compose"" synced as Passed: "Compose" was a
   * sidebar label on the page before the drive did anything, so asserting it at the end held and
   * proved nothing. A goal the opening page already showed is not checked and is not proved.
   */
  it('never checks a goal the page showed before the drive started, and never calls it proved', async () => {
    const p = page('button "Compose"', 'yes');
    const checks = await checkGoals(p.invoke, ['Compose'], 'link "Compose" heading "Deployments"');
    expect(asserts(p.asked)).toEqual([]);
    expect(checks).toEqual([
      {
        text: 'Compose',
        verified: 'unknown',
        reason: 'it was on the page before the drive started, so seeing it proves nothing',
      },
    ]);
    expect(unprovedGoals(checks)).toContain(
      '"Compose" (it was on the page before the drive started',
    );
  });

  it('still checks the goals the opening page did not show', async () => {
    const p = page('heading "Saved" button "Compose"', 'yes');
    const checks = await checkGoals(p.invoke, ['Compose', 'Saved'], 'link "Compose"');
    expect(asserts(p.asked)).toEqual([{ kind: 'text', contains: 'Saved' }]);
    expect(checks.map((c) => [c.text, c.verified])).toEqual([
      ['Compose', 'unknown'],
      ['Saved', 'yes'],
    ]);
  });

  it('counts a check that could not run as not proved', async () => {
    const checks = await checkGoals(() => Promise.reject(new Error('tab gone')), ['Ada']);
    expect(checks).toEqual([{ text: 'Ada', verified: 'unknown' }]);
    expect(unprovedGoals([{ text: 'Ada', verified: 'yes' }])).toBeUndefined();
  });
});

describe('an outcome the journey must end in', () => {
  const route = { kind: 'route', path: '/orders/confirmed' };

  it('is asserted as given and graded by the engine', async () => {
    const asked: [string, Record<string, unknown>][] = [];
    const check = await checkExpect((name, args) => {
      asked.push([name, args]);
      return Promise.resolve({ verified: 'no' });
    }, route);
    expect(asked).toEqual([[ReticleTool.ASSERT, { predicate: route }]]);
    expect(check.verified).toBe('no');
    expect(check.text).toContain('/orders/confirmed');
    expect(unprovedGoals([check])).toContain('/orders/confirmed');
  });

  it('is unknown, never a pass, when the assert cannot run', async () => {
    const check = await checkExpect(() => Promise.reject(new Error('gone')), route);
    expect(check.verified).toBe('unknown');
  });
});

/*
 * A drive whose one click held synced as Passed while the goal it was given ("check the page shows
 * "Compose"") was not proved. The goals decide whether the journey was done; a held click does not.
 */
describe('whether the drive met the goals it was given', () => {
  it('says nothing when it was given none', () => {
    expect(goalsMet([])).toBeUndefined();
  });
  it('is met only when every goal was proved', () => {
    expect(goalsMet([{ text: 'Saved', verified: 'yes' }])).toBe(true);
    expect(
      goalsMet([
        { text: 'Saved', verified: 'yes' },
        { text: 'Compose', verified: 'unknown' },
      ]),
    ).toBe(false);
    expect(goalsMet([{ text: 'Saved', verified: 'no' }])).toBe(false);
  });
});
