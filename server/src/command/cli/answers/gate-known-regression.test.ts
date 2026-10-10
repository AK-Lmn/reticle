/**
 * A CI persona expects `reticle gate` to be the one command that fails the build on a regression.
 * It exited 2 on a project with no saved flows and said nothing about a regression the dashboard
 * already knew, while `reticle runs regression` was the command that exited 3.
 */
import { describe, expect, it } from 'vitest';
import { GateExit, MSG_GATE_NO_FLOWS, gateExitWith } from './gate-exit.js';

describe('the gate and a regression the platform knows about', () => {
  it('fails with the exit code `reticle runs regression` uses, whatever the local answer', () => {
    expect(gateExitWith(GateExit.PASS, 1)).toBe(GateExit.REGRESSION);
    expect(gateExitWith(GateExit.NOTHING_TO_CHECK, 2)).toBe(GateExit.REGRESSION);
    expect(gateExitWith(GateExit.FAIL, 1)).toBe(GateExit.REGRESSION);
    expect(GateExit.REGRESSION).toBe(3);
  });

  it('leaves the local answer alone when nothing regressed, or nothing could be asked', () => {
    expect(gateExitWith(GateExit.PASS, 0)).toBe(GateExit.PASS);
    expect(gateExitWith(GateExit.NOTHING_TO_CHECK, undefined)).toBe(GateExit.NOTHING_TO_CHECK);
  });

  it('says what to do when there are no saved flows, and that the change did not fail', () => {
    expect(MSG_GATE_NO_FLOWS).toContain('not a failure of this change');
    expect(MSG_GATE_NO_FLOWS).toContain('reticle verify');
  });
});
