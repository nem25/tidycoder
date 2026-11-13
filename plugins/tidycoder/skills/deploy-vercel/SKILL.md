---
name: deploy-vercel
description: Release the current project to production on Vercel — bump the version in package.json, write a CHANGELOG entry, fast-forward main to dev, and tag the release. Use when the user asks to deploy, ship, cut a release, or push to production.
disable-model-invocation: true
allowed-tools: Bash(git branch:*), Bash(git status:*), Bash(git fetch:*), Bash(git rev-list:*), Bash(git log:*), Bash(git describe:*), Bash(git tag:*), Bash(git add:*), Bash(git commit:*), Bash(git checkout:*), Bash(git merge:*), Bash(git push:*), Bash(npm run:*), Bash(pnpm run:*), Bash(yarn run:*), Bash(bun run:*), Read, Write, Edit
argument-hint: major|minor|patch
---

# Deploy to Production

Release the project by bumping the version on `dev`, fast-forwarding `main` to `dev`, and tagging. Vercel deploys production from `main`.

`main` only ever fast-forwards, and never gets a merge commit. After a release, `main` and `dev` point at the same commit, which carries the tag. Everything on `main` is therefore already in `dev`'s history, so the next release passes Step 4 and finds the tag in Step 7 without anything being brought back to `dev`.

**Branch convention assumed:** `dev` is the integration branch (Vercel preview), `main` is production. Feature work happens on branches off `dev`.

**Safety rules for this whole skill:**

- Write no file before the user confirms in Step 9.
- Push nothing until every local step has succeeded. Step 14 pushes `dev`, `main` and the tag in one atomic push: either all three reach the remote, or none do.
- Never resolve conflicts, reset branches or delete tags yourself. When a step fails, stop, say what state the repository is in, and give the user the commands to recover.

## Step 1 — Check the bump type

The user passed in: $ARGUMENTS

$ARGUMENTS must be one of: `major`, `minor`, `patch`.

If $ARGUMENTS is missing or not one of those three values, stop and tell the user:

> ❌ Specify a bump type: `/tidycoder:deploy-vercel minor`

## Step 2 — Check the current branch

Run: `git branch --show-current`

**If the output is `dev`,** continue to Step 3.

**If the output is `main`,** stop and tell the user:

> ❌ You are on `main`. Releases are cut from `dev`. Switch to `dev` and run this again.

**If the output is any other branch,** treat it as a feature branch. Stop and tell the user:

> ❌ You are on `<branch-name>`, not `dev`.
>
> This skill commits the version bump and CHANGELOG entry to `dev` before fast-forwarding `main` to it. Running it from a feature branch would put those chore commits on the wrong branch, and `dev` would be missing the release history.
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

## Step 3 — Verify the working tree is clean

Run: `git status --porcelain`

If there is any output, stop and tell the user:

> ❌ You have uncommitted changes. Commit or stash them before deploying.

## Step 4 — Fetch and verify the branches are in sync

Run: `git fetch origin --tags`

If it fails, stop and tell the user that `origin` could not be reached, with the error.

Then run: `git rev-list --left-right --count dev...origin/dev`

The output is two numbers: commits `dev` is ahead, then commits it is behind. If the second number is above 0, stop and tell the user:

> ❌ Your local `dev` is behind `origin/dev`. Run `git pull origin dev` and resolve any conflicts before deploying.

Being ahead is fine: those commits are pushed with the release in Step 14.

Then run: `git rev-list --count dev..origin/main`

If this fails because `origin/main` does not exist, stop and tell the user this skill expects a `main` branch on `origin` for Vercel to deploy from.

If the number is above 0, `main` has commits that `dev` does not: a hotfix, for example, or a release merge commit left by an earlier version of this skill. Stop and tell the user:

> ❌ `main` has commits that aren't on `dev`. Bring them into `dev` first, so `main` can be fast-forwarded to `dev`:
>
> ```
> git merge origin/main
> git push origin dev
> ```
>
> Then run this again.

## Step 5 — Read the current version

Read `package.json` and extract the `version` field. Call this CURRENT_VERSION.

If `package.json` does not exist, or has no `version` field, stop and tell the user that this skill expects a versioned `package.json` at the repository root.

If CURRENT_VERSION is not plain `MAJOR.MINOR.PATCH` (for example it has a pre-release suffix such as `1.2.0-beta.1`), stop and ask the user what the new version should be.

## Step 6 — Run the project's checks

Pick the package manager from the lockfile at the repository root: `pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `bun.lock` or `bun.lockb` → `bun`, otherwise `npm`.

Using the `scripts` in `package.json`:

- If there is a `test` script and it is not npm's placeholder (`echo "Error: no test specified" && exit 1`), run `<package-manager> run test`.
- If there is a `build` script, run `<package-manager> run build`.

If either fails, stop. Show the user the end of the output and tell them:

> ❌ `<package-manager> run <script>` failed. Fix it before releasing.

If there is neither script, tell the user no test or build script was found, and continue.

Then run `git status --porcelain` again. If there is any output, the checks changed files in the repository. Stop and tell the user which files, and that they should commit them or add them to `.gitignore` before releasing.

## Step 7 — Collect commits since the last tag

Run: `git describe --tags --abbrev=0`

If it succeeds, its output is LAST_TAG. Run: `git log LAST_TAG..HEAD --pretty=format:"%s"`

If it fails, there are no tags yet. Run: `git log --pretty=format:"%s"`

Call the output COMMIT_LOG. If it is empty, stop and tell the user:

> ❌ Nothing to release: there are no commits on `dev` since LAST_TAG.

## Step 8 — Calculate the new version and draft the CHANGELOG entry

Apply the bump type from Step 1 to CURRENT_VERSION using semver rules:

- patch: increment the third number (1.2.3 → 1.2.4)
- minor: increment the second number, reset the third to 0 (1.2.3 → 1.3.0)
- major: increment the first number, reset the second and third to 0 (1.2.3 → 2.0.0)

Call this NEW_VERSION.

Run: `git tag -l vNEW_VERSION`

If it prints anything, stop and tell the user that the tag `vNEW_VERSION` already exists, so this version has already been released.

Draft the CHANGELOG entry, but do not write it yet. Using COMMIT_LOG as source material, write a natural language summary of what changed — do not copy commit messages verbatim. Skip noise such as earlier `chore: bump version` and `release:` commits and merge commits. The entry is the version and date on one line as `## vNEW_VERSION — YYYY-MM-DD`, followed by the summary as a bullet list.

## Step 9 — Confirm with the user

Show the user:

- CURRENT_VERSION → NEW_VERSION
- Which checks ran in Step 6 and that they passed
- The CHANGELOG entry about to be written
- The branches that will be updated: `dev` gets the version bump commit, and `main` is fast-forwarded to `dev`
- The tag that will be created: `vNEW_VERSION`

Ask: "Proceed with deploy? (yes/no)"

If the user says anything other than yes, stop and tell them: "Deploy cancelled. No files were changed."

## Step 10 — Write the version bump and commit it on dev

Update `package.json` with Edit: change only the `version` value to NEW_VERSION, nothing else in the file.

Update `CHANGELOG.md`:

- If it does not exist, create it with Write, containing exactly this header, a blank line, then the entry:

  ```
  # Changelog

  All notable changes to this project are documented in this file.
  ```

- If it exists, use Edit to insert the entry, followed by a blank line, directly above the first existing `## ` heading. If it has no `## ` heading, add the entry after the header.

Then commit, without pushing:

```
git add package.json CHANGELOG.md
git commit -m "chore: bump version to vNEW_VERSION"
```

If the commit fails (a pre-commit hook rejects it, for example), stop. Tell the user that `package.json` and `CHANGELOG.md` are modified but not committed, and that nothing has been pushed. They can fix the problem and run this again after discarding the changes with `git checkout -- package.json CHANGELOG.md` (deleting `CHANGELOG.md` instead if this run created it).

## Step 11 — Bring local main up to date

```
git checkout main
git merge --ff-only origin/main
```

If the fast-forward fails, local `main` has commits that are not on `origin/main`. Run `git checkout dev`, then stop and tell the user:

> ❌ Your local `main` has commits that aren't on `origin/main`. Nothing has been pushed. Sort out `main` first, then run this again.
>
> Your local `dev` has the unpushed version bump commit. To undo it before running again:
>
> ```
> git checkout dev
> git reset --hard HEAD~1
> ```

## Step 12 — Fast-forward main to dev

Run: `git merge --ff-only dev`

Do not use `--no-ff` or create a merge commit: a merge commit on `main` would not be on `dev`, and the next release would stop at Step 4.

Step 4 checked that `dev` contains everything on `origin/main`, and Step 11 made local `main` match `origin/main`, so this should always succeed. If it fails anyway, do not merge any other way. Run `git checkout dev`, then stop and tell the user that `main` could not be fast-forwarded to `dev`, with the error, that nothing has been pushed, and that their local `dev` has the unpushed version bump commit, which they can undo with:

```
git checkout dev
git reset --hard HEAD~1
```

## Step 13 — Tag the release

Run: `git tag -a vNEW_VERSION -m "Release vNEW_VERSION"`

## Step 14 — Push everything at once

Run: `git push --atomic origin dev main refs/tags/vNEW_VERSION`

If the push is rejected, nothing reached the remote, because the push is atomic. Run `git checkout dev`. Stop and show the user the error. Tell them the release is complete locally: the version bump commit on `dev`, `main` fast-forwarded to it, and the tag `vNEW_VERSION`. Once the cause is fixed, they can push again with the same command. If someone else pushed in the meantime, it is safer to undo the local release and run this again:

```
git tag -d vNEW_VERSION
git checkout main
git reset --hard origin/main
git checkout dev
git reset --hard HEAD~1
```

## Step 15 — Return to dev

Run: `git checkout dev`

## Step 16 — Summary

Print a short summary:

- CURRENT_VERSION → NEW_VERSION
- Tag created: `vNEW_VERSION`
- Vercel will now deploy to production from `main`
- The preview deployment on `dev` stays live for ongoing work
- Reminder: check the Vercel dashboard to confirm the deployment succeeded
