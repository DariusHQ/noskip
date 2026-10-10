import unittest

from signup import is_valid


class EmailSpec(unittest.TestCase):
    def test_valid(self):
        for email in (
            "a@b.co",
            "ana@example.com",
            "first.last@sub.example.ro",
            "user+tag@example.com",
            "o_k%x-y@my-domain.io",
            "x" * 64 + "@example.com",
            "a@" + "b" * 63 + ".com",
            "UPPER@EXAMPLE.ORG",
            "1234@123.example.net",
        ):
            self.assertTrue(is_valid(email), email)

    def test_invalid(self):
        for email in (
            "",
            "plainaddress",
            "@example.com",
            "ana@",
            "a@@example.com",
            "a@b@example.com",
            "a..b@example.com",
            ".ana@example.com",
            "ana.@example.com",
            "x" * 65 + "@example.com",
            "a@" + "b" * 64 + ".com",
            "admin@localhost",
            "user@localhost",
            "user@-example.com",
            "user@example-.com",
            "user@example..com",
            "user@.example.com",
            "user@example.com.",
            "user@example.c",
            "user@example.c0m",
            "ana @example.com",
            " ana@example.com",
            "ana@example.com\n",
            "ana(x)@example.com",
            "ana@exa_mple.com",
        ):
            self.assertFalse(is_valid(email), repr(email))


if __name__ == "__main__":
    unittest.main()
