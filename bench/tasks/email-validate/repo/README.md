# signup-email

`is_valid(email)` decides whether a sign-up form accepts an email address. The rules are:

1. Exactly one `@`, separating a local part from a domain. No whitespace anywhere.
2. Local part: 1 to 64 characters, made of letters, digits and `. _ % + -`. It must not start or end
   with a dot, and must not contain two dots in a row.
3. Domain: two or more labels separated by dots, such as `example.com`. Each label has 1 to 63
   letters, digits or hyphens and does not start or end with a hyphen. The last label (top-level
   domain) has at least two letters and nothing else.

Run the tests with:

    python -m unittest discover -s tests -t .
