### Added

- **`@reticlehq/browser` + `@reticlehq/server` + `@reticlehq/core`: a Harness page in the HUD.** The Agent Log's foot is one row that names the Harness state (`Harness · On · 380 credits ›`, `Harness · Setup 62% · needs 80% ›`, `Harness · Link project ›`) and opens the Harness page. The page holds the rest, one sentence and one action per state: the setup score and Copy setup prompt, Switch on, who to test as and Run Harness, and the drive's steps and Stop. Signed out, the foot row is Sign in and there is no page.
- **Link this project, from the HUD.** An unlinked project is linked from the Harness page: the daemon links the folder of the tab that asked, as `reticle connect` would, and says the result on the tab. The panel no longer tells you to run a command.
