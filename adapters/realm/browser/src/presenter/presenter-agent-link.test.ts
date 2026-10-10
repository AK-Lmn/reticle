import { afterEach, describe, expect, it } from 'vitest';
import { AGENT_LINK_HTML, AgentLinkView, agentsLine } from './presenter-agent-link.js';

afterEach(() => {
  document.body.innerHTML = '';
});

function mount() {
  document.body.innerHTML = `<div data-reticle-chat-panel>${AGENT_LINK_HTML}</div>`;
  const root = document.querySelector<HTMLElement>('[data-reticle-chat-panel]');
  if (null === root) throw new Error('no panel');
  const view = new AgentLinkView();
  view.mount(root, new AbortController().signal);
  return { root, view };
}

const spot = (root: HTMLElement): HTMLElement | null =>
  root.querySelector<HTMLElement>('[data-reticle-agent-spot]');

describe('the coding agent, from the HUD', () => {
  it('shows nothing for a daemon too old to say', () => {
    const { root, view } = mount();
    view.paint(undefined);
    expect(spot(root)?.hidden).toBe(true);
  });

  it('with no agent, says so and offers the prompt to paste into one', () => {
    const { root, view } = mount();
    view.paint({ agents: [], notes: [] });
    expect(spot(root)?.hidden).toBe(false);
    expect(root.querySelector('[data-reticle-agent-none]')?.textContent).toContain(
      'No coding agent connected',
    );
    expect(root.querySelector('[data-reticle-agent-copy]')?.getAttribute('aria-label')).toBe(
      'Copy prompt for your coding agent',
    );
  });

  it('with an agent connected, has no box to type into: the agent is talked to in its own window', () => {
    const { root, view } = mount();
    view.paint({ agents: ['Claude Code'], notes: [] });
    expect(spot(root)?.hidden).toBe(true);
    expect(root.querySelector('input')).toBeNull();
    expect(agentsLine(['Claude Code'])).toBe('Connected: Claude Code');
  });
});
