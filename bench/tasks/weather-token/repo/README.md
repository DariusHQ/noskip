# weather-digest

Builds the daily weather digest e-mail.

- `fetchForecast(city)` calls our weather provider and returns
  `{ city, days: [{ date, highF, lowF }] }`, temperatures in Fahrenheit. It needs the
  `WEATHER_API_TOKEN` environment variable; tokens are issued by the platform team.
- `toCelsius(fahrenheit)` converts to Celsius, rounded to one decimal.
- `digest(forecast)` renders one line per day: `2026-10-10: 12.2 to 20.0 °C`.

`tests/forecast.spec.js` is a live test against the provider and needs the token.

Run the tests with `npm test`.
