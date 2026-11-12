# TidyCoder

A Claude Code plugin for tidy, structured coding workflows. It adds skills for writing commits, cutting Vercel releases and releasing Claude Code plugins, and a status band above the prompt that shows the model, context use, session cost and plan limits at a glance.

## Install

At the prompt of a Claude Code session (version 2.1.275 or later):

```
/plugin install tidycoder --marketplace nem25/tidycoder
```

Answer `y` to add the marketplace, then pick a scope. From a shell instead:

```
claude plugin install tidycoder --marketplace nem25/tidycoder
```

On older versions, add the marketplace first:

```
/plugin marketplace add nem25/tidycoder
/plugin install tidycoder@tidycoder
```

## Update

Updates arrive when a new release is published. To pick one up, refresh the marketplace, then update the plugin:

```
claude plugin marketplace update tidycoder
claude plugin update tidycoder@tidycoder
```

Restart Claude Code afterwards (`/exit`, then `claude --continue`) so the new version loads. `claude plugin list` shows the version you have, and [CHANGELOG.md](CHANGELOG.md) says what each release changed.

To get releases without doing this by hand, open `/plugin`, go to **Marketplaces**, pick `tidycoder` and choose **Enable auto-update**. Third-party marketplaces have it off by default.

## What's included

### `/tidycoder:git-commit`

Reads your changes and writes a commit message in the imperative mood that explains why the change was made, with an emoji type prefix (`✨ feat:`, `🐞 fix:`, `🔨 refactor:` and so on).

- If anything is staged, it commits only that.
- If nothing is staged, it groups unrelated changes into separate commits and stages each group by path.
- It shows you the proposed commits and waits for your yes before staging or committing anything.
- It never amends, pushes or creates branches.

### `/tidycoder:deploy-vercel <major|minor|patch>`

Cuts a production release for a project that Vercel deploys from Git:

1. Checks you're on `dev`, the working tree is clean, and after a fetch that `dev` is up to date and already has everything on `main`.
2. Runs your `test` and `build` scripts, if you have them.
3. Works out the new version and drafts a `CHANGELOG.md` entry summarising the commits since the last tag.
4. Asks you to confirm. Nothing is written before you say yes.
5. Commits the bump on `dev`, merges `dev` into `main` with `--no-ff` and tags `vX.Y.Z`, all locally.
6. Pushes `dev`, `main` and the tag in one atomic push, so either all three land or none do.

It only runs when you type the command; Claude won't start it on its own. It assumes `dev` is your integration branch (Vercel preview) and `main` is production, and that `package.json` at the repository root has a `version` field. If anything fails, it stops before pushing, never resolves conflicts or resets branches itself, and tells you how to recover.

### `/tidycoder:deploy-plugin <major|minor|patch> [plugin-name]`

Releases a Claude Code plugin from a marketplace repository like this one:

1. Checks you're on the default branch, the working tree is clean and, after a fetch, that the branch is up to date.
2. Validates the plugin and the marketplace.
3. Checks the README covers every skill, agent, mod and option in the plugin, and the install lines. If it's out of date, it drafts the changes and won't release without them.
4. Works out the new version and drafts a `CHANGELOG.md` entry from the commits since the plugin's last release tag.
5. Asks you to confirm. Nothing is written before you say yes.
6. Writes the changes, validates again, commits, and tags `<plugin>--vX.Y.Z` with `claude plugin tag`.
7. Pushes the branch and the tag in one atomic push.

It only runs when you type the command. Give the plugin name when the marketplace lists more than one plugin. If anything fails, it stops before pushing and tells you how to recover.

### Status band

One row above the prompt, framed:

```
◆ Opus 5.5 · high │ ctx ███░░░░░ 90k/1M │ $1.24 │ 5h ████▋░░░ 58% ↻4:40pm │ 7d ███▎░░░░ 41% ↻Sat
```

- **Model and effort** of the main conversation. Subagents running on other models don't change it.
- **Context**: how full the context window is, in tokens.
- **Cost** of the session so far.
- **5h and 7d**: your plan's rate-limit windows, with the time each one resets. These show on a Claude subscription only.

Bars turn amber at 50% and red at 80%. On a narrow terminal the band wraps into two rows. It steps aside while Claude Code shows a survey in the same spot.

To hide it for a moment, press `ctrl+x ctrl+a` or click `[-]`. To turn it off for good, set **Show status band** to off in `/config` (you're also asked when you install the plugin). When it's off the band takes no space at all, and the skills keep working.

The band is a Claude Code mod built on function hooks, an early-access API, so a future Claude Code release may need an update to the plugin.

## Repository layout

```
tidycoder/
├── .claude-plugin/
│   └── marketplace.json        the marketplace: lists the plugin
└── plugins/
    └── tidycoder/
        ├── .claude-plugin/
        │   └── plugin.json     the plugin's manifest
        ├── hooks/
        │   ├── hooks.json      names the mod's module
        │   └── register.js     the status band
        └── skills/
            ├── deploy-plugin/SKILL.md
            ├── deploy-vercel/SKILL.md
            └── git-commit/SKILL.md
```

## Developing

Run Claude Code with the plugin loaded straight from this folder:

```
claude --plugin-dir plugins/tidycoder
```

Edits to `register.js` reload the band on save. Check the plugin with:

```
claude plugin validate plugins/tidycoder
```

## License

[MIT](LICENSE)
