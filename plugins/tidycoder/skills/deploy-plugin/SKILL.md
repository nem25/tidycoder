---
name: deploy-plugin
description: Release a Claude Code plugin from this repository — check the README is current, bump the version in plugin.json, update CHANGELOG.md, validate the plugin and marketplace, then tag and push. Use when the user asks to release, ship, publish, or deploy a plugin.
allowed-tools: Bash(git branch:*), Bash(git status:*), Bash(git fetch:*), Bash(git rev-list:*), Bash(git symbolic-ref:*), Bash(git remote get-url:*), Bash(git log:*), Bash(git describe:*), Bash(git tag:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(claude plugin validate:*), Bash(claude plugin tag:*), Read, Write, Edit
argument-hint: major|minor|patch [plugin-name]
disable-model-invocation: true
---

# Release a Plugin

Cut a release of a Claude Code plugin hosted in this repository: check the documentation, bump its version, record the changes, validate, tag, and push. Users then pick it up by updating the plugin.

**Repository shape assumed:** a marketplace manifest at `.claude-plugin/marketplace.json`, and one or more plugins each with a `.claude-plugin/plugin.json`. Releases are cut from the repository's default branch.

**Safety rules for this whole skill:**

- Write no file before the user confirms in Step 12. Everything before that only reads, and drafts changes in the conversation.
- Push nothing until the release commit and tag exist locally. Step 17 pushes the branch and the tag in one atomic push: both reach the remote, or neither does.
- Never reset branches, delete tags or discard changes yourself. When a step fails, stop, say what state the repository is in, and give the user the commands to recover.

## Step 1 — Check the arguments

The user passed in: $ARGUMENTS

The first argument is the bump type and must be one of `major`, `minor`, or `patch`. If it is missing or not one of those, stop and tell the user:

> ❌ Specify a bump type: `/deploy-plugin minor`

The second argument is an optional plugin name, used in Step 5.

## Step 2 — Check the branch

Find the default branch. Run: `git symbolic-ref --short refs/remotes/origin/HEAD`

It prints `origin/<branch>`; call `<branch>` DEFAULT_BRANCH. If the command fails, run `git branch -r` and use `main` if `origin/main` is listed, otherwise `master` if `origin/master` is listed. If neither is listed, stop and ask the user which branch releases are cut from.

Run: `git branch --show-current`

If the current branch is not DEFAULT_BRANCH, stop and tell the user:

> ❌ You are on `<branch-name>`. Plugin releases are cut from `DEFAULT_BRANCH`, because that is what `/plugin marketplace add` clones. Merge your work into `DEFAULT_BRANCH` first, then run this again.

## Step 3 — Verify the working tree is clean

Run: `git status --porcelain`

If there is any output, stop and tell the user:

> ❌ You have uncommitted changes. Commit or stash them before releasing.

## Step 4 — Fetch and verify the branch is in sync

Run: `git fetch origin --tags`

If it fails, stop and tell the user that `origin` could not be reached, with the error.

Then run: `git rev-list --left-right --count HEAD...origin/DEFAULT_BRANCH`

The output is two numbers: commits ahead, then commits behind. If the second number is above 0, stop and tell the user:

> ❌ Your local `DEFAULT_BRANCH` is behind `origin/DEFAULT_BRANCH`. Run `git pull` and resolve any conflicts before releasing.

Being ahead is fine: those commits are pushed with the release in Step 17.

## Step 5 — Identify the plugin to release

Read `.claude-plugin/marketplace.json` and use the `source` path of each entry in its `plugins` array.

- If the repository has one plugin, use it and ignore any second argument.
- If it has several and a name was given, use the matching entry. If no entry matches, stop and list the available plugin names.
- If it has several and no name was given, stop, list the plugin names, and ask which one to release.

Call the chosen plugin's directory PLUGIN_DIR, its name PLUGIN_NAME, and the marketplace's `name` field MARKETPLACE_NAME.

Call the changelog path CHANGELOG_PATH: `CHANGELOG.md` at the repository root when the marketplace lists one plugin, `PLUGIN_DIR/CHANGELOG.md` when it lists several.

## Step 6 — Validate what is there now

Run: `claude plugin validate PLUGIN_DIR --strict`

Run: `claude plugin validate .`

If either reports errors, stop and show them. Nothing has been changed, so the user can fix them, commit, and run this again.

## Step 7 — Check the README is current

A published plugin's README is its only documentation, and it is public. Someone installing from GitHub reads it before anything else, and a README listing skills that no longer exist — or missing ones that do — is worse than no README. Do not release with a README that is out of date.

**Gather what the plugin actually contains.** List the files with whichever file-listing tool this session has (a file search tool, or `find` through Bash); don't depend on one in particular.

- **Skills:** each `PLUGIN_DIR/skills/*/SKILL.md`. Read its `name`, its `description`, and whether it sets `disable-model-invocation: true`.
- **Agents:** each `PLUGIN_DIR/agents/*.md`. Read its `name` and `description`.
- **Mods:** if `PLUGIN_DIR/hooks/hooks.json` lists `modules`, read each module's header comment to learn what it does (a status band above the prompt, for example).
- **Options:** each field under `userConfig` in `PLUGIN_DIR/.claude-plugin/plugin.json`, with its `title`.
- **Repository:** run `git remote get-url origin` and take `<owner>/<repo>` from it.

**Find the README:** `PLUGIN_DIR/README.md`, or `README.md` at the repository root in a single-plugin repository. If neither exists, every check below fails.

**Check it covers:**

1. Every skill and agent, named as the user would invoke it — `/PLUGIN_NAME:<skill>` for skills, `@PLUGIN_NAME:<agent>` for agents.
2. Every mod: what it shows or does, and how to turn it off with its `userConfig` option (set in `/config`).
3. Nothing that no longer exists — a renamed or deleted skill still documented is the worst case, because people will type a command that fails.
4. Install instructions matching this repository, in either form:
   - `/plugin install PLUGIN_NAME --marketplace <owner>/<repo>`, or
   - `/plugin marketplace add <owner>/<repo>` followed by `/plugin install PLUGIN_NAME@MARKETPLACE_NAME`.
5. Every skill marked `disable-model-invocation: true`, noted as running only when typed — otherwise users will wonder why Claude never reaches for it.

**If everything is covered,** continue.

**If anything is missing or stale,** report what is out of date and draft the replacement text for only the sections that need changing, not the whole README. Show the draft, then ask:

> The README is out of date. Include these changes in the release? (yes/no)

- On yes, call the draft README_UPDATE. It is shown again in Step 12 and written in Step 13, as part of the release commit.
- On anything else, stop and tell the user: "Release stopped: the README is public and out of date. Update and commit it, then run this again."

## Step 8 — Read the current version

Read `PLUGIN_DIR/.claude-plugin/plugin.json`, and this plugin's entry in `.claude-plugin/marketplace.json`.

**If `plugin.json` has a `version` field,** call it CURRENT_VERSION. If the marketplace entry also has a `version`, plan to remove it from the entry in Step 13: when both are set, Claude Code uses `plugin.json` without warning, so a second copy only drifts. Tell the user in Step 12.

**If only the marketplace entry has a `version`,** call it CURRENT_VERSION and plan to bump it there instead.

**If neither has one,** this plugin is versioned by commit SHA: every push is already an update for users. Tell the user this, and ask whether they want to:

(a) keep it that way: update only the changelog and push, with no version and no tag, or
(b) start versioning: add `"version": "1.0.0"` to `plugin.json`, and make this release `1.0.0`, without applying the bump type.

Follow their answer. For (a), skip Step 10's version and tag check, and skip Step 16. For (b), NEW_VERSION is `1.0.0`.

## Step 9 — Collect changes since the last release

Run: `git describe --tags --abbrev=0 --match "PLUGIN_NAME--v*"`

If it succeeds, its output is LAST_TAG. Run: `git log LAST_TAG..HEAD --pretty=format:"%s" -- PLUGIN_DIR`

If it fails, the plugin has never been tagged. Run: `git log --pretty=format:"%s" -- PLUGIN_DIR`

In a single-plugin repository, leave off `-- PLUGIN_DIR`, so changes to the README and marketplace count too.

Call the output COMMIT_LOG. Ignore earlier `chore: release` commits and merge commits. If nothing is left, stop and tell the user:

> ❌ Nothing to release: no changes to PLUGIN_NAME since LAST_TAG.

## Step 10 — Calculate the new version

Apply the bump type to CURRENT_VERSION using semver rules:

- patch: increment the third number (1.2.3 → 1.2.4)
- minor: increment the second number, reset the third to 0 (1.2.3 → 1.3.0)
- major: increment the first number, reset the second and third to 0 (1.2.3 → 2.0.0)

Call this NEW_VERSION.

Guidance on choosing, if the user asks: renaming or removing a skill, agent or option is a breaking change for anyone using it by name, so it warrants a major bump. Adding a skill, agent, mod or option is a minor bump. Editing the instructions inside an existing skill is a patch.

Run: `git tag -l "PLUGIN_NAME--vNEW_VERSION"`

If it prints anything, stop and tell the user that tag already exists, so this version has already been released.

## Step 11 — Draft the changelog entry

Draft it, but do not write it yet. Using COMMIT_LOG as source material, write a natural language summary of what changed — do not copy commit messages verbatim. Leave out anything an earlier entry in CHANGELOG_PATH already covers. The entry is `## vNEW_VERSION — YYYY-MM-DD` followed by a bullet list.

Call out first anything that changes how people use the plugin: skills, agents, mods or options added, renamed or removed. These are what people need to know, and they are easy to lose in a list of file-level changes.

## Step 12 — Confirm with the user

Show:

- PLUGIN_NAME, and CURRENT_VERSION → NEW_VERSION
- README_UPDATE, if there is one
- Any change to the marketplace entry from Step 8
- The changelog entry about to be written
- The tag to be created: `PLUGIN_NAME--vNEW_VERSION`
- The branch that will be pushed: DEFAULT_BRANCH

Ask: "Proceed with release? (yes/no)"

If the answer is anything other than yes, stop and tell the user: "Release cancelled. No files were changed."

## Step 13 — Write the changes

Use Edit for each existing file, changing only what is listed:

- `PLUGIN_DIR/.claude-plugin/plugin.json`: set `version` to NEW_VERSION (or add it, for Step 8 option b).
- `.claude-plugin/marketplace.json`: only if Step 8 planned a change to this plugin's entry.
- The README: apply README_UPDATE, if there is one.
- CHANGELOG_PATH: if it exists, insert the entry, followed by a blank line, directly above the first existing `## ` heading, or after the header if it has none. If it does not exist, create it with Write, containing exactly this header, a blank line, then the entry:

  ```
  # Changelog

  All notable changes to this project are documented in this file.
  ```

Keep a list of the paths you wrote. Call it CHANGED_PATHS.

## Step 14 — Validate the release

Run: `claude plugin validate PLUGIN_DIR --strict`

Run: `claude plugin validate .`

If either reports errors, stop and show them. Do not commit or push a release that fails validation — users would get a broken install. Tell the user the files in CHANGED_PATHS are modified but not committed, and that they can discard them with `git checkout -- <paths>` (deleting CHANGELOG_PATH instead if this run created it).

## Step 15 — Commit

Stage each path in CHANGED_PATHS by name, and nothing else. Do not use `git add -A` or `git add .`.

```
git add -- <each path in CHANGED_PATHS>
git commit -m "chore: release PLUGIN_NAME vNEW_VERSION"
```

If the commit fails (a pre-commit hook rejects it, for example), stop. Tell the user the changes are written but not committed, and that nothing has been pushed.

## Step 16 — Tag

Run: `claude plugin tag PLUGIN_DIR -m "PLUGIN_NAME v%s"`

It creates the tag `PLUGIN_NAME--vNEW_VERSION`, after checking that the working tree is clean, the tag is new, and `plugin.json` agrees with the marketplace entry.

If it fails, stop and show the error. Tell the user the release commit exists locally but nothing has been pushed, and that they can undo the commit with `git reset --hard HEAD~1`.

## Step 17 — Push the branch and the tag together

Run: `git push --atomic origin DEFAULT_BRANCH refs/tags/PLUGIN_NAME--vNEW_VERSION`

For a release without a version (Step 8 option a), run `git push origin DEFAULT_BRANCH` instead.

If the push is rejected, nothing reached the remote, because the push is atomic. Show the user the error and tell them the release commit and tag exist locally. Once the cause is fixed, they can push again with the same command. If someone else pushed in the meantime, it is safer to undo the local release and run this again:

```
git tag -d PLUGIN_NAME--vNEW_VERSION
git reset --hard HEAD~1
```

## Step 18 — Summary

Print:

- PLUGIN_NAME CURRENT_VERSION → NEW_VERSION, and the tag created
- How users pick it up, in a session:

  ```
  /plugin marketplace update MARKETPLACE_NAME
  ```

  or from a shell:

  ```
  claude plugin update PLUGIN_NAME@MARKETPLACE_NAME
  ```

- A note that auto-update is off by default for third-party marketplaces. Users can turn it on in `/plugin` under **Marketplaces**, by selecting the marketplace and **Enable auto-update**; until then they run the commands above themselves.
- A reminder that an update applies when Claude Code restarts.
- For the user's own testing: a marketplace added from a local folder loads the plugin's files in place and ignores `version`, so `/reload-plugins` picks up the changes there, with no update needed.
