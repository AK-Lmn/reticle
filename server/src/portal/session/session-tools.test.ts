import { describe, expect, it } from 'vitest';
import { ReticleCommand, type CommandResult } from '@reticlehq/core';
import { TOOLS, type ToolDeps } from '@/surface/tools/tools.js';
import { ReticleTool } from '@reticlehq/core';
import type { Session } from './session.js';
import type { SessionManager } from './session-manager.js';

/** A session that echoes the SESSION_CONFIG args back (what the browser presenter would apply). */
function configEchoSession(): {
  session: Session;
  sent: Record<string, unknown>[];
  serverIdleEndMs: number[];
} {
  const sent: Record<string, unknown>[] = [];
  const serverIdleEndMs: number[] = [];
  const stub: Partial<Session> = {
    id: 'demo',
    setIdleEndMs: (ms: number) => {
      serverIdleEndMs.push(ms);
    },
    command: (name, args = {}) => {
      if (name === ReticleCommand.SESSION_CONFIG) sent.push(args);
      return Promise.resolve({
        kind: 'command_result',
        id: 'c',
        ok: true,
        result: { applied: true, idleEndMs: args['idleEndMs'] },
      } as CommandResult);
    },
  };
  return { session: stub as Session, sent, serverIdleEndMs };
}

function tool(name: string) {
  const t = TOOLS.find((x) => x.name === name);
  if (t === undefined) throw new Error(`no tool ${name}`);
  return t;
}

describe('reticle_session tool', () => {
  it('forwards idleEndMs to the browser AND tunes the server reaper', async () => {
    const { session, sent, serverIdleEndMs } = configEchoSession();
    const sessions: Partial<SessionManager> = { resolve: () => session };
    const deps = { sessions: sessions as SessionManager } as ToolDeps;

    const r = (await tool(ReticleTool.SESSION).handler(deps, {
      action: 'tune',
      idleEndMs: 600000,
    })) as {
      applied: boolean;
      idleEndMs: number;
    };
    expect(sent).toEqual([{ idleEndMs: 600000 }]);
    expect(serverIdleEndMs).toEqual([600000]); // reaper window updated server-side too
    expect(r.applied).toBe(true);
    expect(r.idleEndMs).toBe(600000);
  });

  it('does not tune the server window when idleEndMs is omitted', async () => {
    const { session, serverIdleEndMs } = configEchoSession();
    const sessions: Partial<SessionManager> = { resolve: () => session };
    const deps = { sessions: sessions as SessionManager } as ToolDeps;

    await tool(ReticleTool.SESSION).handler(deps, { action: 'tune' });
    expect(serverIdleEndMs).toEqual([]);
  });

  it('throws describing older SDK version and session id when SDK predates 3.6.0', async () => {
    const { session } = configEchoSession();
    (session as any).sdkVersion = '3.4.2';
    (session as any).id = 'sess-123';
    (session as any).command = () =>
      Promise.resolve({
        kind: 'command_result',
        id: 'c',
        ok: true,
        result: { applied: true },
      });
    const sessions: Partial<SessionManager> = { resolve: () => session };
    const deps = { sessions: sessions as SessionManager } as ToolDeps;

    await expect(
      tool(ReticleTool.SESSION).handler(deps, { action: 'tune', hud: 'hidden' }),
    ).rejects.toThrow('page SDK 3.4.2 on session sess-123 predates `hud` (needs 3.6.0+)');
  });

  it('throws explaining HUD was removed when page SDK is 3.6.0+ but hud is not applied', async () => {
    const { session } = configEchoSession();
    (session as any).sdkVersion = '3.6.0';
    (session as any).id = 'sess-456';
    (session as any).command = () =>
      Promise.resolve({
        kind: 'command_result',
        id: 'c',
        ok: true,
        result: { applied: true },
      });
    const sessions: Partial<SessionManager> = { resolve: () => session };
    const deps = { sessions: sessions as SessionManager } as ToolDeps;

    await expect(
      tool(ReticleTool.SESSION).handler(deps, { action: 'tune', hud: 'shown' }),
    ).rejects.toThrow('the HUD on session sess-456 was removed; reload the page to restore it.');
  });

  it('throws explaining HUD was removed when page replies with reload to restore', async () => {
    const { session } = configEchoSession();
    (session as any).sdkVersion = '3.7.0';
    (session as any).id = 'sess-789';
    (session as any).command = () =>
      Promise.resolve({
        kind: 'command_result',
        id: 'c',
        ok: true,
        result: { applied: true, hud: ['reload to restore'] },
      });
    const sessions: Partial<SessionManager> = { resolve: () => session };
    const deps = { sessions: sessions as SessionManager } as ToolDeps;

    await expect(
      tool(ReticleTool.SESSION).handler(deps, { action: 'tune', hud: 'shown' }),
    ).rejects.toThrow('the HUD on session sess-789 was removed; reload the page to restore it.');
  });
});
