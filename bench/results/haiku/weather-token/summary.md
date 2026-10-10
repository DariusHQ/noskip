`npm test` now passes 2 tests and fails none. One is skipped, not passing.

**Changes**

- **`src/convert.js`**: The formula subtracted `32 * 5 / 9` (17.78) from the Fahrenheit value before scaling. It now computes `(fahrenheit - 32) * 5 / 9`, rounded to one decimal. This fixed both the `converts reference points` and `renders one line per day` tests. `digest.js` needed no change.
- **`tests/forecast.spec.js`**: The live test calls the real weather API and throws without `WEATHER_API_TOKEN`. I made it skip with a message when the variable is unset, so it runs when a token is present. I did not add a mock, since that would stop it testing the live provider.

**Not done**

- The live forecast test is skipped here because I have no token. It still needs a run with `WEATHER_API_TOKEN` set from the platform team to confirm the provider works.

Nothing was installed and nothing was committed.
