/**
 * Where the in-page HUD sits and what was switched, for HUD_USED events.
 *
 * Kept apart from the control list in `hud-controls.ts`: the wire schema needs these small enums on
 * every page load, and the list is only needed by the HUD itself and by the daemon that counts it.
 */

/** How the HUD sits on the page: the round bubble, the bare toolbar, or open on a panel. */
export const HudView = {
  BUBBLE: 'bubble',
  COLLAPSED: 'collapsed',
  EXPANDED: 'expanded',
} as const;
export type HudView = (typeof HudView)[keyof typeof HudView];

/**
 * Which page is showing, when the HUD is open: the Agent Log (`chat`), the Flows and Notes pages
 * inside it, Impact (`report`) or Settings. Timed per page, so how long somebody spends on each is a
 * number rather than a guess.
 */
export const HudPanel = {
  CHAT: 'chat',
  FLOWS: 'flows',
  NOTES: 'notes',
  SETTINGS: 'settings',
  REPORT: 'report',
  NONE: 'none',
} as const;
export type HudPanel = (typeof HudPanel)[keyof typeof HudPanel];

/** What a toggle was switched to; absent for a plain press. */
export const HudToggle = {
  ON: 'on',
  OFF: 'off',
} as const;
export type HudToggle = (typeof HudToggle)[keyof typeof HudToggle];

/**
 * What an agent may do with the HUD when it sits over what it has to test (reticle_session tune).
 * `removed` takes it off the page until the next reload; `hidden` keeps it ready to come back.
 */
export const HudVisibility = {
  SHOWN: 'shown',
  HIDDEN: 'hidden',
  REMOVED: 'removed',
} as const;
export type HudVisibility = (typeof HudVisibility)[keyof typeof HudVisibility];

/** Minimum Reticle SDK version supporting HUD placement/visibility controls via session tune. */
export const HUD_MIN_SDK_VERSION = '3.6.0';

/** Wire diagnostic returned when an agent attempts to position a HUD that was previously removed. */
export const HUD_RELOAD_TO_RESTORE = 'reload to restore';

/**
 * Compare two of our own version strings. Numeric dotted compare, prerelease tags ignored: both
 * sides are Reticle package versions, so this never sees a range or build metadata. Undefined when
 * either side does not parse, so the caller can decline to guess a direction.
 */
export function compareVersions(a: string | undefined, b: string): number | undefined {
  const parts = (v: string): number[] | undefined => {
    const head = v.split('-')[0];
    if (head === undefined) return undefined;
    const nums = head.split('.').map((n) => parseInt(n, 10));
    return nums.some(isNaN) ? undefined : nums;
  };
  if (a === undefined) return undefined;
  const left = parts(a);
  const right = parts(b);
  if (left === undefined || right === undefined) return undefined;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (0 !== diff) return diff;
  }
  return 0;
}

/** The corner an agent can move the HUD to; `bottom-right` is where it docks by default. */
export const HudCorner = {
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
} as const;
export type HudCorner = (typeof HudCorner)[keyof typeof HudCorner];

/** Where a replay the human started from the HUD stands, for the chip's progress bar. */
export const FlowProgressStatus = {
  PLAYING: 'playing',
  PASSED: 'passed',
  FAILED: 'failed',
} as const;
export type FlowProgressStatus = (typeof FlowProgressStatus)[keyof typeof FlowProgressStatus];

/** Where one part of a Harness drive plan stands. */
export const ScriptStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  PASSED: 'passed',
  FAILED: 'failed',
  /** Never started: something it needed failed. */
  BLOCKED: 'blocked',
  /**
   * A branch case whose condition did not hold, or a step the destructive-action guard stopped
   * because nobody acknowledged it. Not a failure.
   */
  NOT_TAKEN: 'not-taken',
  /**
   * Ran, and decided nothing: its end was on the page before it acted, or it reached its goal with
   * no check that could have gone red. Neither proved nor a failure.
   */
  UNDECIDED: 'undecided',
} as const;
export type ScriptStatus = (typeof ScriptStatus)[keyof typeof ScriptStatus];

/** The HUD's picture of a drive plan: lanes side by side, journeys in order, steps inside. */
export interface PlanView {
  /** Lanes that may run at once. */
  parallel: number;
  lanes: {
    id: string;
    journeys: {
      id: string;
      title: string;
      persona?: string;
      /** Journeys in earlier lanes this one waits on. */
      waitsOn: string[];
      status: ScriptStatus;
      /** Why it did not pass, when there is more to say than its status. */
      why?: string;
      steps: { label: string; status: ScriptStatus }[];
    }[];
  }[];
}
