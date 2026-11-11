---
name: git-commit
description: Create a commit message by analyzing the git diff, then commit after the user confirms. Splits unrelated changes into separate commits when needed. Use when the user asks to write a commit message or commit their changes.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git ls-files:*), Bash(git add:*), Bash(git restore --staged:*), Bash(git commit:*), Bash(git log:*), Read
---

## Context

- Current git status: !`git status`
- Staged changes (summary): !`git diff --staged --stat`
- Unstaged changes (summary): !`git diff --stat`
- Untracked files: !`git ls-files --others --exclude-standard`

## Task

Analyze the changes and write one or more commit messages. Use present tense in the imperative mood ("add", not "added" or "adds"). Explain **why** the change was made, not just **what** changed.

### Read the changes

The context above holds summaries only, so that a large diff doesn't flood the conversation. Read what you need before writing any message:

- **Tracked files:** run `git diff --staged -- <paths>` for staged changes and `git diff -- <paths>` for unstaged ones. Read a few files at a time rather than the whole diff at once.
- **Untracked files:** `git diff` does not show them. Read each one with the Read tool.
- **Skip reading** lockfiles, generated or minified files, build output and binary files. The summary line is enough to describe them; say in the summary that you didn't read them.
- **Possible secrets:** if an untracked or changed file looks like it holds secrets (`.env` files other than `.env.example`, keys, credentials, tokens), don't open it and don't stage it. Point it out and ask the user what to do.

### Decide what goes into the commit

- **If anything is staged**, commit only what is staged. The user has already chosen the contents — do not add to it. Mention any unstaged or untracked files in the summary so the user can confirm the split was deliberate, but leave them alone.
- **If nothing is staged**, work from the unstaged changes and the untracked files.
- **If nothing is staged, nothing is unstaged and there are no untracked files**, say so and stop.

### Splitting into multiple commits

When nothing is staged and the changes cover unrelated concerns, group them into separate commits rather than one mixed commit. Group by purpose, not just by type — two files changed for the same reason belong together even if one is a test.

Present the proposed grouping before touching the index, and stage each group explicitly by path when the user approves:

```
git add -- path/to/file path/to/other
```

Never use `git add -A`, `git add .`, or `git add -u`. Stage named paths only, so the user can see exactly what each commit will contain.

If a single file contains changes belonging to different commits, do not try to split it with `git add -p`. Put it in the group matching its main purpose and say so.

## Commit types with emojis

Only use these types and emojis:

- ✨ `feat:` - New feature
- 🐞 `fix:` - Bug fix
- 🔨 `refactor:` - Refactoring code
- 📝 `docs:` - Documentation
- 🎨 `style:` - Styling/formatting
- ✅ `test:` - Tests
- ⚡ `perf:` - Performance
- 🔧 `chore:` - Dependencies, config, tooling, version bumps

If a group of changes mixes several types, pick the one that best describes its main purpose.

## Format

```
<emoji> <type>: <concise_description>

<optional_body_explaining_why>
```

- Keep the subject line under about 72 characters, lowercase after the type, with no trailing period.
- Leave a blank line between the subject and the body.
- Wrap the body at about 72 characters. Leave it out when the subject already says enough.

## Output

1. Summarize the changes in a few bullets.
2. If proposing more than one commit, list the groups in commit order, each with the files it contains and its proposed message. Otherwise show the single proposed message in a code block.
3. Ask for confirmation before staging or committing anything. Don't run `git add` or `git commit` until the user says yes. If they ask for changes, revise and ask again.
4. On confirmation, work through the groups in order. For each one: stage its paths, then commit with `git commit -m "<subject>"`, adding `-m "<body>"` when there is a body.
5. If a commit fails — a pre-commit hook rejects it, for example — stop there and do not retry automatically. If you staged the failed group yourself, unstage it with `git restore --staged -- <paths>`, so the index is as the user left it; if the user had staged it, leave it staged. Report which commits succeeded, show the error, and say which groups were not committed. Use `git restore` only with `--staged`, never to discard changes.
6. Show the resulting commits with `git log --oneline -<n>`, where n is the number of commits made.

Do not amend, push, or create branches as part of this skill.
