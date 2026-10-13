### Fixed

- **`@reticlehq/server`: ending a leased session now releases its lease.** `reticle_session { action: "end" }` on a tab taken with `reticle_lease { action: "acquire" }` left the lease connected until the reaper took it, so the next agent's every call was refused with "multiple sessions connected — pass sessionId" for up to five minutes. The lease is now released the same way `reticle_lease { action: "release" }` does it, and the answer says `leaseReleased: true`. Only the ending agent's own lease is released, never another agent's.

### Changed

- **`@reticlehq/server`: `reticle_verify { action: "coverage" }` no longer returns `featureUse` or `toolHitRate`.** Both were internal instruments, not answers for the agent: they cost tokens on every call, and the tool counts reset on a page reload, so a tool called several times could be listed as never called.
