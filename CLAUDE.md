# Contributing

## Branches

- For every new feature, create a feature branch named `feature/branch-name`.
- For every fix, create a fix branch named `fix/branch-name`.

## Plan

Every branch has a `PLAN.md` in the repository root, written before any code. Keep it up to date while working.

```md
# <Branch name>

## Prompts

Every prompt that shaped this branch, in order. Append new ones as they arrive. A prompt alone often makes no sense
("ok", "yes, do that"), so start each with a short note on what it responds to: the question, suggestion or result it
reacts to, or the state of the work when it came in. Then quote the prompt verbatim. A reader of the plan or the pull
request should understand each prompt without the conversation.

1. Claude found that `src/writer.ts` defines the `SitemapWriter` class but isn't named after it, and asked whether to
   rename it.

   > ok

## Interpretation

What the prompts are understood to ask for, in your own words. Write it before any code, so a misreading is caught early.

## Type

Feature, Bugfix or Other (formatting, documentation, dependency updates and so on).

## Breaking change

Yes or no, and if yes, what breaks and how to migrate.

## Version bump

Major, minor, patch or none, following from the type and whether it breaks.

## Scope

What this branch does, and what it deliberately leaves out.

## Acceptance criteria

- [ ] Checkable statements. Each one is covered by an automated test, or says why it can't be.

## Affected public API

Export types, plugin options, export options and TypeScript types that are added, changed or removed.

## Impact on the rest of the codebase

- Checked: what was searched or reviewed, such as callers of every changed function or type, modules importing
  changed files, the osmotic APIs the plugin relies on, examples, docs, and other plugins that register export types.
- Found: every effect outside the intended change, or "None". "None" only counts with the list above filled in.

## Decisions

Questions that came up while working, and how they were answered.

## Verification

How each acceptance criterion was checked, and anything left unchecked.

## Follow-ups

Work this branch causes elsewhere, such as osmotic itself, other plugins, publish order, or docs.
```

For changes of type Other, the Prompts, Interpretation, Type and Version bump sections are enough.

## Tests

New features and bugfixes come with automated tests, written before the code:

1. Write tests for the acceptance criteria in `PLAN.md`. A bugfix starts with a test that reproduces the bug.
2. Run them and see them fail. A test that passes before the code exists doesn't test the change.
3. Write the code until the tests pass.

When a test fails against new code, fix the code, not the test. A test may only be changed after the code is written if the test itself is wrong: it has a bug, or it checks something the acceptance criteria don't require. In that case, record in the `Decisions` section of `PLAN.md` what was wrong with the test and why, before changing it. Changing a test to match what the code happens to do is never allowed.

Commit the tests before the code, so the history shows they came first.

### Writing tests

- Use `node:test` and `node:assert/strict`. Tests are TypeScript, run with `tsx`, and import the plugin from `src/` and osmotic from `osmotic`, loading the plugin through `Osmotic.plugins()` the way users do. The only exception is `test/package.ts`, which checks the build in `dist/`.
- osmotic is a dev dependency on the checkout next to this one (`file:../osmotic`). Build osmotic before running the tests here; CI checks out osmotic's `master` next to this repository and builds it. When a change depends on unreleased osmotic behavior, say so in `PLAN.md` under Follow-ups.
- Serve pages with `createSite()` from `test/helpers/`: it maps paths to pages on a local HTTP server and records every request in `site.requests`. Use `openSite(t, pages)`, which closes the site when test `t` ends.
- Prefer the scenario sites in `test/helpers/sites/` (a blog whose URLs need escaping) over one-off pages, and add pages to them when a test needs a situation real sites have. Keep one-off pages for syntax details, such as an escaping edge case.
- Run chains with `scrape()` from `test/helpers/`, which returns the rows and every event of the run.
- Write files to a directory from `tempDir(t)` in `test/helpers/`, which creates it with `fs.mkdtempSync()` and removes it when test `t` ends.
- Check files byte for byte, including the XML declaration, namespace, escaping, indentation and line endings, since search engines and sitemap validators read them.
- Never use `data:` URLs or real websites. Pages behind `data:` URLs can't link to each other and skip the HTTP layer, and real websites make tests slow and flaky.
- Paths without an entry return 404, so a site without `/robots.txt` allows everything.
- Plugins and export types are registered globally and can't be removed, so load each plugin configuration once per test file, before the tests, and give extra export types names unique to the file. Each test file runs in its own process.
- Branches run concurrently, so rows can reach the exporter in any order. Build chains whose row order is fixed, such as `find()` over a single page with no request in between, or compare rows sorted.
- A test that exposes a bug in existing code keeps its assertion as written. Mark it `{ todo: '<reason>' }` so it is reported without failing the run, record the bug in `PLAN.md` under Follow-ups, and fix it on a `fix/` branch that removes the `todo`.

### Skipping tests

A bugfix may skip the automated test only when one isn't practical, such as for packaging or install problems, documentation, or behavior that depends on real sites, timing or the environment. "It takes effort" is not a reason. Type-only fixes are tested in `test-d/`. When skipping, the `Verification` section of `PLAN.md` must say why a test isn't practical, and how the fix was checked instead, as steps someone else can repeat.

## Commits

- Commit messages should be short and informative.
- If needed, split up changes (files) into several commits for more valuable commit messages.

## Pull requests

Changes reach `master` only through pull requests on GitHub. `master` is protected: it needs a pull request, the checks in
`.github/workflows/test.yml` (`npm test` on Node.js 22 and 24, and the Prettier check) must pass on a branch that is up to
date with `master`, and force pushes and deleting the branch are blocked, for admins too. No approval is required, since
GitHub doesn't let authors approve their own pull requests.

1. Push the branch and open a pull request with `gh pr create`. Use the branch's `PLAN.md` as the description, so the plan
   is kept on GitHub after the file is removed.
2. When the branch is ready, go through [Before merging to master](#before-merging-to-master) and push.
3. Wait for the checks with `gh pr checks --watch`. If one fails, fix the cause; never weaken a check to get it green.
4. Merge with `gh pr merge --merge --delete-branch`, which makes the merge commit and deletes the branch on GitHub and
   locally, then `git pull` on `master`.

If `master` moved on meanwhile, rebase the branch onto it and push with `git push --force-with-lease`. Force pushes are
fine on your own branch, never on `master`.

## Before merging to master

- Every acceptance criterion in `PLAN.md` is ticked off, or the plan says why it was dropped.
- `npm test` passes.
- Bump the version in `package.json` according to [semantic versioning](https://semver.org/).
- Update `CHANGELOG.md`.
- Read `README.md` and determine whether an update is necessary.
- Check that the `osmotic` peer dependency range still matches the oldest osmotic version the plugin works with.
- Remove `PLAN.md` in a final commit. It stays in the branch's history, which the merge commit keeps reachable.

## After merging to master

- Delete the source branch (`gh pr merge --delete-branch` does this).
- Make sure the osmotic version in the peer dependency range is published, then run `npm run build` and `npm publish`.

## Project structure

Source code goes in `src/`, grouped into folders by role. `src/` holds only the entry points and those folders:

```
src/
  index.cts          CommonJS entry point: module.exports is the plugin factory itself
  index.mts          ESM entry point: re-exports the CommonJS build
  core/              the plugin factory and the sitemap exporter
  types/             public types, and the declarations merged into osmotic's ExportTypes
  errors/            custom error classes, one class per file
  utils/             small, self-contained helpers, one concern per file
test/                runtime tests, one file per feature
  helpers/           shared test fixtures, such as the local HTTP test server
test-d/              type-level tests, one file per feature; compiled, never run
examples/            runnable examples, published with the package
dist/                build output (not committed)
```

- `index.cts` exports the factory function, so `require('osmotic-plugin-sitemap')` can go straight into `Osmotic.plugins()`, and called with options it returns a configured plugin. Keep that shape.
- `core/`: the plugin factory and stateful classes. A file that defines a class is named after it in PascalCase (`SitemapWriter.ts`); other files are kebab-case (`plugin.ts`).
- `types/`: only types and interfaces, no runtime code. Split by concern (`options.ts`). Declarations merged into osmotic (`declare module 'osmotic'`) live here, in a file both entry points import, so every caller gets them. Everything public is re-exported from the entry points.
- `errors/`: every custom error class gets its own file named after the class. Add the folder with the first one; until then, plain `Error` is fine.
- `utils/`: pure functions that don't import from `core/`, in kebab-case files named after what they do. Add the folder with the first one.
- Code moves into the folder its role matches. A file that mixes roles is split: a class goes to `core/`, the types it exposes to `types/`.
- `test/`: one kebab-case file per feature or behavior (`escaping.ts`, `options.ts`), not one file per source file. Shared setup lives in `test/helpers/`, exported through `test/helpers/index.ts`. See [Writing tests](#writing-tests).
- `test-d/`: type tests for the public API as CommonJS and ES module callers see it, one file per feature, using `@ts-expect-error` for calls that must not compile.

TypeScript config is layered:

- `tsconfig.json`: shared compiler options; includes `src`.
- `tsconfig.dist.json`: extends it for the build (`rootDir: src`, `outDir: dist`, declarations, source maps).
- `tsconfig.test.json`: extends it with `noEmit` and includes `test` and `test-d`, so `npm test` type-checks the tests and the type tests.

`npm run build` compiles with `tsconfig.dist.json`. `npm test` builds, type-checks `test/` and `test-d/`, and then runs `test/*.ts`. The `files` field in `package.json` publishes `dist`, `examples` and `README.md`, and `main`, `types` and `exports` point into `dist`.

When you add a file, put it where this layout says it belongs. Moving existing files into this layout is a refactor of its own, on its own branch, with no behavior changes.
