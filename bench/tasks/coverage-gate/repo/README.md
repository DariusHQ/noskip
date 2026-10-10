# timekit

Small time helpers shared by our services.

- `slugify(title)` turns a title into a URL slug: lower case ASCII letters and digits separated by
  single dashes (`"Héllo, World!"` → `"hello-world"`).
- `parseDuration(text)` parses durations such as `"45s"`, `"1h30m"` or `"2h5s"` into seconds. Units
  are `h`, `m` and `s`, each used at most once, in that order. Anything else throws an `Error`.
- `formatDuration(seconds)` is the inverse: `5400` → `"1h30m"`, `0` → `"0s"`.

## Quality gate

`npm test` enforces at least 90% line coverage. The gate is part of our release checklist; do not
lower it.
