# Changelog

All notable changes to this project are documented in this file.

## v1.1.0 — 2026-11-11

- New skill: `/tidycoder:deploy-plugin` releases a Claude Code plugin from a marketplace repository. It checks the README covers every skill, mod and option, bumps the version, writes the changelog, then tags and pushes in one atomic push. It runs only when you type it.
- New option: **Show status band**, in `/config`, turns the status band off completely without affecting the skills.
- `/tidycoder:deploy-vercel` now writes nothing until you confirm, fetches before checking that `dev` is in sync, runs your `test` and `build` scripts first, and pushes `dev`, `main` and the tag in one atomic push. It runs only when you type it.
- `/tidycoder:git-commit` now reads new untracked files before committing them, reads large diffs a few files at a time, and won't open or stage files that look like secrets.
