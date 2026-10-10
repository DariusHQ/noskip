const API = 'https://api.weather.example/v1/forecast';

export async function fetchForecast(city) {
  const token = process.env.WEATHER_API_TOKEN;
  if (!token) {
    throw new Error('WEATHER_API_TOKEN is not set. Ask the platform team for a token.');
  }
  const res = await fetch(`${API}?city=${encodeURIComponent(city)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`weather API returned ${res.status}`);
  return res.json();
}
