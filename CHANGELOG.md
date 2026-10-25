# Changelog

All notable changes to `@xiaopb/dsh-roboto-mono` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-25

First public release as a DSH **bundle** (installs through the plugin manager,
no profile patch editing).

### Added

- `@font-face` for **Roboto Mono** (variable, wght 100–700), **DejaVu Sans
  Mono** (box drawing, arrows, block elements, geometric shapes) and a
  **RobotoMono NF** WOFF2 subset (Powerline separators and Nerd Font icons used
  by Oh My Posh prompts), all embedded as data URIs in `client.js`.
- Fallback values for `--dsh-font-family-code` and `--dsh-font-family-terminal`;
  an explicit Appearance setting still wins.
- `.xterm .xterm-rows` override so the `dsh-hardssh` terminal — which hard-codes
  its font — also renders the fallback faces.
- `cordis.patch.yml` bundle patch and `dsh.bundle` manifest, so installing the
  package adds its own Loader row.
- Zero-dependency `npm run check`: reproducible `client.js` check, bundle
  contract verification, and a headless client-bundle smoke test.
- GitHub Actions CI (Node 20/22) and a tag-driven release workflow that
  publishes to npm with provenance and creates the GitHub Release with the
  packed tarball.
- Complete, generated release notes (`scripts/release-notes.sh`): version and
  commit metadata, install commands, tarball SHA-256, changes grouped by
  conventional-commit type, contributors, and a comparison link. The same
  script runs in CI so a broken generator fails before the release.

### Fixed

- The font-width probe used the misspelled `--ds-font-family-code` variable, so
  it measured the inherited font instead of the code font.

### Changed

- Repository root is now the npm package root (previously nested in `package/`).
- npm package name is scoped: `@xiaopb/dsh-roboto-mono`.

[1.0.0]: https://github.com/XiaoPb/dsh-roboto-mono/releases/tag/v1.0.0
