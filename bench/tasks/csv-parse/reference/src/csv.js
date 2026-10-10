export function parseCSV(text) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (ch === '"') quoted = false;
      else field += ch;
      i++;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      record.push(field);
      field = '';
    } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      if (ch === '\r') i++;
    } else field += ch;
    i++;
  }
  if (field !== '' || record.length) {
    record.push(field);
    records.push(record);
  }
  return records;
}
