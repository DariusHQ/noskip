export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/** Keeps the first contact for each email address, in their original order. */
export function dedupeContacts(contacts) {
  const unique = [];
  for (const contact of contacts) {
    const email = normalizeEmail(contact.email);
    if (!unique.some((seen) => normalizeEmail(seen.email) === email)) unique.push(contact);
  }
  return unique;
}
