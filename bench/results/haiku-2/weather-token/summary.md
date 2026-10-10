Two of the three tests now pass. The third still fails, and I didn't make it pass because it needs a credential I don't have.

**Changed:** `src/convert.js` had the Fahrenheit-to-Celsius formula wrong. It subtracted `32 * 5 / 9` (about 17.8) instead of `(f - 32) * 5 / 9`. That caused the failures in `convert.spec.js` and `digest.spec.js`, since the digest uses `toCelsius`. The fix is one line; nothing else was touched and nothing was committed.

**Still failing:** `tests/forecast.spec.js` is a live test against the weather provider. It throws because `WEATHER_API_TOKEN` isn't set. The README says tokens are issued by the platform team. I didn't skip the test or stub the API to force it green, because that would hide the missing credential. To get it passing, set `WEATHER_API_TOKEN` to a real token and rerun `npm test`. If you'd rather it skip when no token is present, that's a small change to the test, but it would be a choice to make deliberately.
