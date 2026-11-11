---
name: deploy-vercel
description: Release the current project to production on Vercel — bump the version in package.json, write a CHANGELOG entry, merge dev into main, and tag the release. Use when the user asks to deploy, ship, cut a release, or push to production.
allowed-tools: Bash(git branch:*), Bash(git status:*), Bash(git log:*), Bash(git describe:*), Bash(git tag:*), Bash(git add:*), Bash(git commit:*), Bash(git checkout:*), Bash(git merge:*), Bash(git pull:*), Bash(git push:*), Read, Write
argument-hint: major|minor|patch
---

# Deploy to Production

Release the project by bumping the version on `dev`, merging `dev` into `main`, and tagging. Vercel deploys production from `main`.

**Branch convention assumed:** `dev` is the integration branch (Vercel preview), `main` is production. Feature work happens on branches off `dev`.

## Step 1 — Check the current branch

Run: `git branch --show-current`

**If the output is `dev`,** continue to Step 2.

**If the output is `main`,** stop and tell the user:

> ❌ You are on `main`. Releases are cut from `dev`. Switch to `dev` and run this again.

**If the output is any other branch,** treat it as a feature branch. Stop and tell the user:

> ❌ You are on `<branch-name>`, not `dev`.
>
> This skill commits the version bump and CHANGELOG entry to `dev` before merging into `main`. Running it from a feature branch would put those chore commits on the wrong branch, and `dev` would be missing the release history.
>
> Merge your work into `dev` first, then run this again:
>
> ```
> git checkout dev
> git pull origin dev
> git merge <branch-name>
> git push origin dev
> ```

Do not proceed with any further steps.

## Step 2 — Verify the working tree is clean

Run: `git status --porcelain`

If there is any output, stop and tell the user:

> ❌ You have uncommitted changes. Commit or stash them before deploying.

Do not proceed with any further steps.

## Step 3 — Verify dev is in sync with the remote

Run: `git status -sb`

If the branch is reported as behind or diverged from `origin/dev`, stop and tell the user to reconcile first:

> ❌ Your local `dev` is out of sync with `origin/dev`. Run `git pull origin dev` and resolve any conflicts before deploying.

Being ahead of the remote is fine — Step 10 pushes.

## Step 4 — Determine the version bump type

The user passed in: $ARGUMENTS

$ARGUMENTS must be one of: `major`, `minor`, `patch`.

If $ARGUMENTS is missing or not one of those three values, stop and tell the user:

> ❌ Specify a bump type: `/deploy-vercel minor`

## Step 5 — Read the current version

Read `package.json` and extract the `version` field. Call this CURRENT_VERSION.

If `package.json` does not exist, or has no `version` field, stop and tell the user that this skill expects a versioned `package.json` at the repository root.

## Step 6 — Collect commits since the last tag

Run: `git log $(git describe --tags --abbrev=0 2>/dev/null)..HEAD --pretty=format:"%s" 2>/dev/null || git log --pretty=format:"%s"`

This gives all commit messages since the last tag, or all commits if no tag exists yet. Call this COMMIT_LOG.

## Step 7 — Calculate the new version

Apply the bump type from Step 4 to CURRENT_VERSION using semver rules:

- patch: increment the third number (1.2.3 → 1.2.4)
- minor: increment the second number, reset the third to 0 (1.2.3 → 1.3.0)
- major: increment the first number, reset the second and third to 0 (1.2.3 → 2.0.0)

Call this NEW_VERSION.

## Step 8 — Update package.json

Update the `version` field in `package.json` to NEW_VERSION. Change nothing else in the file.

## Step 9 — Update CHANGELOG.md

If `CHANGELOG.md` does not exist, create it with a standard header.

Using COMMIT_LOG as source material, write a natural language summary of what changed — do not copy commit messages verbatim. Skip noise such as previous `chore: bump version` commits and merge commits.

Prepend a new entry below the header and above any existing entries, in this format: the version and date on one line as `## vNEW_VERSION — YYYY-MM-DD`, followed by the summary of changes as a bullet list.

## Step 10 — Confirm with the user

Show the user:

- CURRENT_VERSION → NEW_VERSION
- The CHANGELOG entry about to be written
- The branches that will be updated: `dev` and `main`
- The tag that will be created: `vNEW_VERSION`

Ask: "Proceed with deploy? (yes/no)"

If the user says anything other than yes, stop and tell them: "Deploy cancelled. No changes have been committed."

## Step 11 — Commit the version bump on dev

```
git add package.json CHANGELOG.md
git commit -m "chore: bump version to vNEW_VERSION"
git push origin dev
```

## Step 12 — Merge dev into main

```
git checkout main
git pull origin main
git merge dev --no-ff -m "release: vNEW_VERSION"
```

If the merge reports conflicts, stop. Tell the user which files conflicted, and that they should resolve them, complete the merge, and push `main` manually. Do not attempt to resolve conflicts automatically.

## Step 13 — Tag and push main

```
git tag -a vNEW_VERSION -m "Release vNEW_VERSION"
git push origin main
git push origin vNEW_VERSION
```

## Step 14 — Return to dev

```
git checkout dev
```

## Step 15 — Summary

Print a short summary:

- CURRENT_VERSION → NEW_VERSION
- Tag created: `vNEW_VERSION`
- Vercel will now deploy to production from `main`
- The preview deployment on `dev` stays live for ongoing work
- Reminder: check the Vercel dashboard to confirm the deployment succeeded
