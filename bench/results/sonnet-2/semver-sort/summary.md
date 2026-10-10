All three tests now pass. I changed only `src/versions.js`, and I didn't commit.

The old `sortVersions` split each version on `.` and compared only the first three numeric parts. It ignored pre-release tags, so `1.0.0-alpha` and `1.0.0` tied. Because `Number('0-alpha')` is `NaN`, the comparisons also gave inconsistent results.

I rewrote it to follow SemVer precedence:
- **Build metadata:** anything after `+` is ignored.
- **Pre-release vs. release:** a version with a pre-release tag sorts before the same version without one.
- **Pre-release identifiers:** these are compared one by one. Numeric identifiers compare as numbers and rank below alphanumeric ones, which compare as text. If all shared identifiers are equal, the one with fewer identifiers comes first.
