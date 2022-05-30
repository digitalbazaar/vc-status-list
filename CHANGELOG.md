# vc-status-list ChangeLog

## 3.1.0 - 2022-05-30

### Added
- Export `StatusList` utility class.

## 3.0.0 - 2022-04-15

### Changed
- **BREAKING**: Use `@digitalbazaar/vc-status-list-context` v3.0. Rename
  `RevocationList2021` and `RevocationList2021Status` to `StatusList2021` and
  `StatusList2021Entry` respectively and remove `SuspensionList2021Status`.
- `_getStatuses` now returns an array of statuses with type
  "StatusList2021Entry" or an empty array if there are no matching
  types.

## 2.1.0 - 2022-03-12

### Added
- New API `getCredentialStatus` gets a status by type from a VC.

### Changed
- VCs can have multiple statuses.
- Use `@digitalbazaar/vc-status-list-context`. This is not a breaking
  change -- the context is the same just a package relocation.

## 2.0.0 - 2022-02-19

### Changed
- **BREAKING**: Renamed package to `@digitalbazaar/vc-status-list`.

## 1.0.0 - 2022-02-09

### Changed
- See git history for changes previous to this release.
