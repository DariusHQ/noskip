export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/** Keeps the first contact for each email address, in their original order. */
export function dedupeContacts(contacts) {
  const seen = new Set();
  const unique = [];
  for (const contact of contacts) {
    const email = normalizeEmail(contact.email);
    if (seen.has(email)) continue;
    seen.add(email);
    unique.push(contact);
  }
  return unique;
}
