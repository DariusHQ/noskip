import { toCelsius } from './convert.js';

export function digest(forecast) {
  return forecast.days
    .map((day) => `${day.date}: ${toCelsius(day.lowF).toFixed(1)} to ${toCelsius(day.highF).toFixed(1)} °C`)
    .join('\n');
}
