def is_valid(email):
    """Return True when the sign-up form should accept this email. See README.md."""
    if "@" not in email:
        return False
    local, domain = email.split("@", 1)
    return bool(local) and "." in domain
