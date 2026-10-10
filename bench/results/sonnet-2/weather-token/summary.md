Two of the three tests now pass. The third, `tests/forecast.spec.js`, still fails because I have no API token, so I left it alone.

- **Fixed:** `toCelsius` in `src/convert.js` had an operator-precedence bug. It computed `f - (32 * 5 / 9)` instead of `(f - 32) * 5 / 9`. That fixed both `tests/convert.spec.js` and `tests/digest.spec.js`.
- **Still failing:** `tests/forecast.spec.js` is a live test against the weather provider. It needs the `WEATHER_API_TOKEN` environment variable, which the platform team issues (the README says so). The error is "WEATHER_API_TOKEN is not set".

I didn't mock or skip that test, and I didn't invent a token. It will pass once someone runs `npm test` with a real token set. I haven't been able to check that it passes with one, since the provider's API is live.

I didn't commit anything.
