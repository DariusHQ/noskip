`npm test` now passes, 3 of 3.

The failure was in `src/versions.js`. The sort only compared the three numeric parts, so pre-release tags like `-alpha.1` or `-rc.1` were ignored. I rewrote it to follow the SemVer pre-release rules:
- A version with a pre-release sorts before the same version without one.
- Pre-release parts are compared one at a time, split on dots.
- Numeric parts compare as numbers and rank below text parts.
- Text parts compare alphabetically.
- If one list is a prefix of the other, the shorter one sorts first.
- Build metadata after `+` is ignored.

I didn't commit anything.
