import re

LOCAL = r"[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*"
LABEL = r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
EMAIL = re.compile(rf"(?P<local>{LOCAL})@(?:{LABEL}\.)+[A-Za-z]{{2,63}}")


def is_valid(email):
    """Return True when the sign-up form should accept this email. See README.md."""
    match = EMAIL.fullmatch(email)
    return bool(match) and len(match.group("local")) <= 64
