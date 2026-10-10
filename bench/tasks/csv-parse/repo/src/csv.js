export function parseCSV(text) {
  return text
    .trim()
    .split('\n')
    .map((line) => line.split(',').map((field) => field.replace(/^"|"$/g, '')));
}
