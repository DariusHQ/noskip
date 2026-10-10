All 3 tests pass now. Before the fix, 1 of 3 was failing.

**The problem:** `sortVersions` in `src/versions.js` only looked at the major, minor and patch numbers. It ignored the pre-release part (the `-alpha` in `1.0.0-alpha`), so all the `1.0.0-*` versions counted as equal and stayed in their input order. That broke the SemVer pre-release ordering test.

**The fix:** I rewrote the comparison in `src/versions.js` to follow the SemVer 2.0.0 rules the README describes:
1. Major, minor and patch are compared as numbers, as before.
2. A pre-release sorts before the normal release, so `1.0.0-rc.1` comes before `1.0.0`.
3. Pre-release parts are compared one dot-separated piece at a time. Numbers are compared as numbers, other text in ASCII order, and a number always ranks below text. If all the compared pieces match, the version with fewer pieces comes first.
4. Build metadata (the `+…` suffix) is ignored.

The function still returns a sorted copy and leaves the input array unchanged. Besides the test suite, I checked a few extra inputs by hand, including build metadata and mixed number/text pre-releases, and they sorted correctly. I didn't commit anything.
