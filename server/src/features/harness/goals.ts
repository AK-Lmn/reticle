/**
 * The goals a drive was asked to prove, and whether it did.
 *
 * A drive asked to "check that "Ada Lovelace" and "Grace Hopper" are listed" replayed old journeys,
 * dismissed a reminder and reported `finished` without looking for either name (#1316). The driver's
 * word for it is not evidence, so after every drive the harness checks each goal itself, with the
 * same assert any agent would make, and reports one verdict per goal.
 */
import { PredicateKind, ReticleTool, Verified, VerifiedReason, asRecord } from '@reticlehq/core';

/** More than this and the persona is a document, not a set of goals. */
const MAX_GOALS = 10;
const MAX_GOAL_LENGTH = 200;

/** A string the persona quoted: "straight" or “curly”. Single quotes are apostrophes too often. */
const QUOTED = /"([^"\n]{1,200})"|“([^”\n]{1,200})”/g;

export interface GoalCheck {
  /** The text that had to be on the page. */
  text: string;
  /** The engine's verdict on it: only `yes` is proved. */
  verified: string;
  /** Why it was not checked, when it was not. */
  reason?: string;
}

/** Said of a goal the page showed before the drive did anything. */
const ALREADY_SHOWN = `${VerifiedReason.ALREADY_TRUE}: it was on the page before the drive started, so seeing it proves nothing`;

/** The observable goals in a persona: whatever it quoted. */
export function goalsIn(persona: string | undefined): string[] {
  if (persona === undefined) return [];
  const found = [...persona.matchAll(QUOTED)].map((m) => (m[1] ?? m[2] ?? '').trim());
  return [...new Set(found.filter((g) => 0 < g.length))].slice(0, MAX_GOALS);
}

/**
 * Check each goal on the page the drive ended on, recording ONE assert for the drive.
 *
 * Each quote used to be its own assert, and every assert is a check in the drive's run, so a goal
 * that quotes where it starts ("from "Count is 0" to "Count is 1"") recorded a "no" for the start
 * text a working app had rightly replaced, and the run synced as a failing flow. The page is read
 * once to answer each quote; the one recorded assert covers the quotes shown, or all of them when
 * none is, so a goal the page never reached still leaves a failed check behind. A check that cannot
 * run is `unknown`, never skipped.
 */
export async function checkGoals(
  invoke: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  goals: readonly string[],
  /** The page as it read before the drive: a goal it already showed proves nothing at the end. */
  opening?: string,
): Promise<GoalCheck[]> {
  const all = [
    ...new Set(goals.slice(0, MAX_GOALS).map((g) => g.trim().slice(0, MAX_GOAL_LENGTH))),
  ].filter((t) => 0 < t.length);
  const before = all.filter((t) => true === opening?.includes(t));
  const texts = all.filter((t) => !before.includes(t));
  const unchecked = (text: string): GoalCheck => ({
    text,
    verified: Verified.UNKNOWN,
    reason: ALREADY_SHOWN,
  });
  if (0 === texts.length) return before.map(unchecked);
  let page: string | undefined;
  try {
    const tree = asRecord(await invoke(ReticleTool.SNAPSHOT, { mode: SNAPSHOT_FULL }))['tree'];
    if ('string' === typeof tree) page = tree;
  } catch {
    /* unread: every quote rests on the assert below */
  }
  const shown = texts.filter((t) => true === page?.includes(t));
  const recorded = 0 < shown.length ? shown : texts;
  let verified: string = Verified.UNKNOWN;
  try {
    const result = asRecord(await invoke(ReticleTool.ASSERT, { predicate: allOf(recorded) }));
    if ('string' === typeof result['verified']) verified = result['verified'];
  } catch {
    /* stays unknown: the goal was not proved */
  }
  // A quote the page read did not show is a "no" only beside one it did: with none shown, every
  // quote rests on the recorded assert.
  return all.map((text) =>
    before.includes(text)
      ? unchecked(text)
      : { text, verified: 0 === shown.length || shown.includes(text) ? verified : Verified.NO },
  );
}

const SNAPSHOT_FULL = 'full';

/** The page as it reads now, or undefined when it cannot be read. Taken before a drive starts. */
export async function readOpening(
  invoke: (name: string, args: Record<string, unknown>) => Promise<unknown>,
): Promise<string | undefined> {
  try {
    const tree = asRecord(await invoke(ReticleTool.SNAPSHOT, { mode: SNAPSHOT_FULL }))['tree'];
    return 'string' === typeof tree ? tree : undefined;
  } catch {
    return undefined;
  }
}

function allOf(texts: readonly string[]): Record<string, unknown> {
  const each = texts.map((contains) => ({ kind: PredicateKind.TEXT, contains }));
  return 1 === each.length ? (each[0] ?? {}) : { kind: PredicateKind.ALL_OF, predicates: each };
}

/**
 * The end state the caller declared, checked like any assert.
 *
 * Quoted text only proves some words are on the last page, which is how a drive that never used the
 * app could pass: from the field, "it only checks that I have certain titles on my page". An `expect`
 * names an OUTCOME — a route reached, a request made, state changed — in the same predicate grammar
 * as reticle_assert, and is graded the same way. A check that cannot run is `unknown`.
 */
export async function checkExpect(
  invoke: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  predicate: Record<string, unknown>,
): Promise<GoalCheck> {
  let verified: string = Verified.UNKNOWN;
  try {
    const result = asRecord(await invoke(ReticleTool.ASSERT, { predicate }));
    if ('string' === typeof result['verified']) verified = result['verified'];
  } catch {
    /* stays unknown: the outcome was not proved */
  }
  return { text: `expect ${JSON.stringify(predicate).slice(0, MAX_GOAL_LENGTH)}`, verified };
}

/** Whether the drive met the goals it was given: undefined when it was given none. */
export function goalsMet(checks: readonly GoalCheck[]): boolean | undefined {
  return 0 === checks.length ? undefined : checks.every((c) => Verified.YES === c.verified);
}

/**
 * Whether the drive met its goal, as the answer and the run report it. The driver's own `goalMet`
 * is its word, never evidence: a run answered `goalMet: true` after zero actions on a tab that
 * already showed the end state, and another with both its goals `unknown`. Never true without an
 * action that ran; with goals, met only when every one was proved and the driver did not say it
 * missed; with none, the driver's word stands. Undefined when nothing judged it.
 */
export function goalOfDrive(
  claimed: boolean | undefined,
  checks: readonly GoalCheck[],
  acted: boolean,
): boolean | undefined {
  const judged = 0 < checks.length ? false !== claimed && true === goalsMet(checks) : claimed;
  if (judged === undefined) return undefined;
  return acted && judged;
}

/** One line naming the goals the drive did not prove, or undefined when it proved them all. */
export function unprovedGoals(checks: readonly GoalCheck[]): string | undefined {
  const missed = checks.filter((c) => Verified.YES !== c.verified);
  if (0 === missed.length) return undefined;
  return (
    `Not proved: ${missed.map((c) => `"${c.text}" (${c.reason ?? c.verified})`).join(', ')}. ` +
    'The drive did not finish the job it was given, whatever its own account says.'
  );
}
