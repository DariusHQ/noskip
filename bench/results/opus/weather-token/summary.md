Two of the three tests pass now. The third still fails because it needs an API token that I don't have.

**What I fixed:** `src/convert.js` had an operator-precedence bug. It computed `fahrenheit - (32 * 5 / 9)` instead of `(fahrenheit - 32) * 5 / 9`, so 32 °F came out as 14.2 °C instead of 0. I added the missing parentheses, which fixed both `convert.spec.js` and `digest.spec.js` (the digest test was only failing because of the bad conversion).

**Still failing: `tests/forecast.spec.js`.** This test calls the real weather service and needs the `WEATHER_API_TOKEN` environment variable. The README says those tokens come from the platform team. There's nothing wrong in the code here; the test fails because the variable isn't set in this environment. I didn't skip the test, mock it or fake a token, because any of those would make it "pass" without checking anything. To get it passing, get a token from the platform team, set `WEATHER_API_TOKEN` and run `npm test` again.

Nothing was committed.
