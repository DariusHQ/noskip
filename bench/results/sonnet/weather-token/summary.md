Two of the three tests now pass. The third, the live forecast test, still fails because `WEATHER_API_TOKEN` isn't set.

**What I changed:** `src/convert.js` had an operator-precedence bug. It computed `fahrenheit - 32 * 5 / 9` where it should compute `(fahrenheit - 32) * 5 / 9`. Fixing that made the `convert` and `digest` tests pass.

**What's left:** `tests/forecast.spec.js` calls the real weather API and needs `WEATHER_API_TOKEN`. The README says the platform team issues those tokens, and I don't have one. I didn't mock the test or fake a token, because that would hide the fact that the live test hasn't run. With a valid token set, `npm test` should run it for real. I haven't seen it pass, so I don't know whether it will.
