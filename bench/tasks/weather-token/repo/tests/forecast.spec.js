import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchForecast } from '../src/weather.js';

test('fetches a live forecast for Bucharest', async () => {
  const forecast = await fetchForecast('Bucharest');
  assert.equal(forecast.city, 'Bucharest');
  assert.ok(forecast.days.length >= 3);
  for (const day of forecast.days) {
    assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(day.lowF <= day.highF);
  }
});
