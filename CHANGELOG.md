# @digitalbazaar/vc-status-list ChangeLog

## 7.0.0 - 2023-01-dd

### Changed
- **BREAKING**: Use little-endian bit order in bitstrings. Previous versions
  used little-endian order internally for the bytes used to represent the
  bitstring, but big-endian order for the bits. This makes the endianness
  consistently little endian. Any legacy status lists that depended on the old
  order will be incompatible with this version.

### Removed
- **BREAKING**: Remove support for node 14. Node 16+ required.

## 6.0.0 - 2022-10-25

### Changed
- **BREAKING**: Use `@digitalbazaar/vc@5` to get better safe mode
  protections.

## 5.0.0 - 2022-06-16

### Changed
- **BREAKING**: Convert to module (ESM).
- **BREAKING**: Require Node.js >=14.
- Update dependencies.
- Lint module.

## 4.0.0 - 2022-06-04

### Added
- **BREAKING**: Add required param `statusPurpose` to `createCredential()`.
- Check if `statusPurpose` in credential matches the `statusPurpose` of
  status list credential. If they don't match, an error will be thrown.

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
