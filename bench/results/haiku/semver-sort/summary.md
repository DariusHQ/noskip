All three tests now pass with `npm test`.

**The failure:** `sortVersions` in `src/versions.js` only compared the numeric major, minor and patch fields. Pre-release tags were ignored, so `1.0.0-alpha`, `1.0.0-beta` and `1.0.0` compared as equal and came out in whatever order they started in.

**The fix:** I rewrote `src/versions.js` to follow the SemVer precedence rules that `README.md` lists:
- Compare major, minor and patch numerically.
- A version with no pre-release tag ranks above one with a tag (`1.0.0` > `1.0.0-rc.1`).
- Compare pre-release identifiers dot by dot. Numeric identifiers compare as numbers, and they rank below alphanumeric ones. Alphanumeric identifiers compare in ASCII order. If all shared identifiers are equal, the one with fewer identifiers ranks lower.
- Build metadata (`+...`) is stripped before comparing.

The function still returns a new array and leaves the input unchanged. I didn't install anything, and I didn't commit.
