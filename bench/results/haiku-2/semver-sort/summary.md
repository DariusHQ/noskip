All three tests now pass with `npm test`.

**What was wrong:** `sortVersions` in `src/versions.js` only compared the numeric `major.minor.patch` fields. Pre-release tags were ignored, so `1.0.0-alpha`, `1.0.0-beta` and `1.0.0` compared as equal and came out in arbitrary order.

**What I changed:** I rewrote `src/versions.js` to implement the SemVer precedence the README describes:
- Build metadata after `+` is stripped before comparing.
- Core fields are compared numerically, as before.
- A version with no pre-release ranks above one with a pre-release.
- Pre-release identifiers are compared dot by dot. Numeric identifiers compare numerically, numeric ranks below alphanumeric, and other identifiers compare in ASCII order.
- If all shared identifiers are equal, the version with more identifiers ranks higher.

The function still returns a sorted copy and leaves its input untouched. I didn't modify the tests or the README, and I didn't commit anything.
