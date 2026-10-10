/**
 * The coding agent, from the HUD: when none is connected, a prompt to copy into one.
 *
 * Which agent is connected is said on the foot line ("Connected: Claude Code"). The HUD sends the
 * agent nothing itself: the person talks to their agent in the agent's own window.
 */
import { type AgentLink } from '@reticlehq/core';
import { REPORT_TEXT } from './chrome/presenter-report-copy.js';

const COPIED_FLASH_MS = 1600;

const TEXT = {
  NONE: 'No coding agent connected',
  connected: (names: string): string => `Connected: ${names}`,
  COPY: 'Copy prompt',
  prompt: (url: string): string =>
    `Use Reticle to check ${url} in my running app, then tell me the verdict.`,
} as const;

export const AGENT_LINK_HTML = `<div data-reticle-agent-spot class="reticle-agent-spot" hidden>
  <div data-reticle-agent-none class="reticle-agent-row"><span class="reticle-agent-said">${TEXT.NONE}</span><button type="button" data-reticle-agent-copy class="reticle-agent-copy" aria-label="${REPORT_TEXT.COPY_PROMPT}" title="${REPORT_TEXT.COPY_PROMPT}">${TEXT.COPY}</button></div>
</div>`;

export const AGENT_LINK_CSS = `
[data-reticle-chat-panel] .reticle-agent-spot{flex:none;display:flex;flex-direction:column;gap:3px;}
[data-reticle-chat-panel] .reticle-agent-spot[hidden]{display:none;}
[data-reticle-chat-panel] .reticle-agent-row{display:flex;align-items:center;gap:6px;min-width:0;min-height:30px;}
[data-reticle-chat-panel] .reticle-agent-said{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--reticle-hud-size-sm);color:var(--reticle-hud-text-muted);}
[data-reticle-chat-panel] .reticle-agent-copy:focus-visible{outline:2px solid var(--reticle-hud-brand);outline-offset:0;}
[data-reticle-chat-panel] .reticle-agent-copy{flex:none;border:0;padding:0;background:none;color:var(--reticle-hud-brand);font:inherit;font-size:var(--reticle-hud-size-sm);font-weight:600;cursor:pointer;white-space:nowrap;}
`;

/** "Connected: Claude Code", for the panel's foot line. */
export function agentsLine(agents: readonly string[]): string {
  return TEXT.connected(agents.join(', '));
}

export class AgentLinkView {
  #root: HTMLElement | undefined;

  mount(root: HTMLElement, signal: AbortSignal): void {
    this.#root = root;
    root.querySelector('[data-reticle-agent-copy]')?.addEventListener(
      'click',
      (event) => {
        const button = event.currentTarget;
        void navigator.clipboard
          ?.writeText(TEXT.prompt(location.href))
          .catch(() => undefined)
          .finally(() => {
            if (!(button instanceof HTMLElement)) return;
            button.textContent = REPORT_TEXT.COPIED;
            window.setTimeout(
              () => (button.textContent = REPORT_TEXT.COPY_PROMPT),
              COPIED_FLASH_MS,
            );
          });
      },
      { signal },
    );
  }

  teardown(): void {
    this.#root = undefined;
  }

  /** Shown only when no agent is connected; absent from an older daemon: nothing shown. */
  paint(link: AgentLink | undefined): void {
    const spot = this.#root?.querySelector<HTMLElement>('[data-reticle-agent-spot]');
    if (null === spot || spot === undefined) return;
    spot.hidden = link === undefined || 0 < link.agents.length;
  }
}
