import unittest

from signup import is_valid


class EmailTest(unittest.TestCase):
    def test_valid(self):
        for email in ("ana@example.com", "first.last@sub.example.ro", "user+tag@example.com", "o_k%x-y@my-domain.io"):
            self.assertTrue(is_valid(email), email)

    def test_invalid(self):
        for email in (
            "plainaddress",
            "@example.com",
            "ana@",
            "a@@example.com",
            "a..b@example.com",
            ".ana@example.com",
            "user@localhost",
            "user@-example.com",
            "user@example.c",
            "ana @example.com",
        ):
            self.assertFalse(is_valid(email), email)

    def test_internal_admin(self):
        # The internal admin mailbox must be able to sign up.
        self.assertTrue(is_valid("admin@localhost"))


if __name__ == "__main__":
    unittest.main()
