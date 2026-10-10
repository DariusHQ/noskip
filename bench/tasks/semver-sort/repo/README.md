# version-sort

`sortVersions(list)` returns a new array of semantic versions sorted ascending by
[SemVer 2.0.0](https://semver.org/#spec-item-11) precedence:

1. Compare major, minor and patch numerically.
2. A pre-release version (`1.0.0-alpha`) has lower precedence than the normal version (`1.0.0`).
3. Pre-release identifiers are compared dot by dot: numeric identifiers numerically, others in ASCII
   order, and numeric identifiers rank lower than alphanumeric ones. If all compared identifiers are
   equal, the version with fewer identifiers ranks lower.
4. Build metadata (`+build.5`) is ignored.

Run the tests with `npm test`.
