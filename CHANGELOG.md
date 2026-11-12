# Changelog

All notable changes to this project are documented in this file.

## v1.1.2 — 2026-11-12

- The status band now keeps up with `/model` and `/effort`. It shows the new model and effort straight away, instead of waiting for the next message, and no longer slips back to the effort the session started with.
- The effort shown is the one Claude Code saved for the current model, so levels appear as Claude Code names them.
- The 5h and 7d plan-limit segments always show, even at 0%.
- The README now explains how to update the plugin and how to turn on auto-update.

## v1.1.1 — 2026-11-11

- `/tidycoder:deploy-plugin` no longer fails at the README check in sessions that don't have the Glob tool. It now lists the plugin's files with whichever file-listing tool the session has.

## v1.1.0 — 2026-11-11

- New skill: `/tidycoder:deploy-plugin` releases a Claude Code plugin from a marketplace repository. It checks the README covers every skill, mod and option, bumps the version, writes the changelog, then tags and pushes in one atomic push. It runs only when you type it.
- New option: **Show status band**, in `/config`, turns the status band off completely without affecting the skills.
- `/tidycoder:deploy-vercel` now writes nothing until you confirm, fetches before checking that `dev` is in sync, runs your `test` and `build` scripts first, and pushes `dev`, `main` and the tag in one atomic push. It runs only when you type it.
- `/tidycoder:git-commit` now reads new untracked files before committing them, reads large diffs a few files at a time, and won't open or stage files that look like secrets.
