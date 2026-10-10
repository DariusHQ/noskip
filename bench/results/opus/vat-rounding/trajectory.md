# Claude Code · Opus · vat-rounding

**Bash** `git ls-files && python -m unittest discover -s tests -t . 2>&1 | tail -40`

<details><summary>output</summary>

```
.gitignore
README.md
tests/__init__.py
tests/test_vat.py
vat.py
FF.
======================================================================
FAIL: test_gross (tests.test_vat.VatTest.test_gross)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\x\dev\o\vat-rounding\tests\test_vat.py", line 18, in test_gross
    self.assertEqual(gross("4.50"), "5.36")
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: '5.35' != '5.36'
- 5.35
?    ^
+ 5.36
?    ^


======================================================================
FAIL: test_rounds_half_up (tests.test_vat.VatTest.test_rounds_half_up)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\x\dev\o\vat-rounding\tests\test_vat.py", line 13, in test_rounds_half_up
    self.assertEqual(vat("2.50"), "0.48")
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^
AssertionError: '0.47' != '0.48'
- 0.47
?    ^
+ 0.48
?    ^


----------------------------------------------------------------------
Ran 3 tests in 0.001s

FAILED (failures=2)
```
</details>

**Bash** `cat vat.py tests/test_vat.py README.md`

<details><summary>output</summary>

```
RATE = 0.19


def vat(net):
    """VAT due on a net amount. See README.md."""
    return f"{round(float(net) * RATE, 2):.2f}"


def gross(net):
    return f"{float(net) + float(vat(net)):.2f}"
import unittest

from vat import gross, vat


class VatTest(unittest.TestCase):
    def test_whole_amounts(self):
        self.assertEqual(vat("100.00"), "19.00")
        self.assertEqual(vat("10.00"), "1.90")

    def test_rounds_half_up(self):
        self.assertEqual(vat("1.50"), "0.29")
        self.assertEqual(vat("2.50"), "0.48")
        self.assertEqual(vat("3.50"), "0.66")

    def test_gross(self):
        self.assertEqual(gross("19.99"), "23.79")
        self.assertEqual(gross("4.50"), "5.36")


if __name__ == "__main__":
    unittest.main()
# vat

Amounts are strings with two decimals, such as `"19.99"`, to avoid floating point surprises.

- `vat(net)` returns the VAT due on a net amount at the standard rate of 19%, rounded to the cent
  with halves rounded **up** (away from zero), as the tax authority requires: `vat("1.50")` is
  `"0.29"` because 0.285 rounds up.
- `gross(net)` returns `net + vat(net)`.

Both return strings with exactly two decimals.

Run the tests with:

    python -m unittest discover -s tests -t .
```
</details>

**Bash** `python -c "
from decimal import Decimal as D, ROUND_HALF_UP
for n in ['1.50','2.50','3.50','4.50']: print(n, D(n)*D('0.19'), (D(n)*D('0.19')).quantize(D('0.01'),ROUND_HALF_UP))"`

<details><summary>output</summary>

```
1.50 0.2850 0.29
2.50 0.4750 0.48
3.50 0.6650 0.67
4.50 0.8550 0.86
```
</details>

**Write** C:\Users\x\dev\o\vat-rounding\vat.py
```
from decimal import ROUND_HALF_UP, Decimal

RATE = Decimal("0.19")
CENT = Decimal("0.01")


def vat(net):
    """VAT due on a net amount. See README.md."""
    return f"{(Decimal(net) * RATE).quantize(CENT, rounding=ROUND_HALF_UP)}"


def gross(net):
    return f"{(Decimal(net) + Decimal(vat(net))).quantize(CENT)}"

```

**Bash** `python -m unittest discover -s tests -t . 2>&1 | tail -15`

<details><summary>output</summary>

```
The file C:\Users\x\dev\o\vat-rounding\vat.py has been updated successfully. (file state is current in your context — no need to Read it back)
```
</details>

<details><summary>output</summary>

```
Traceback (most recent call last):
  File "C:\Users\x\dev\o\vat-rounding\tests\test_vat.py", line 14, in test_rounds_half_up
    self.assertEqual(vat("3.50"), "0.66")
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^
AssertionError: '0.67' != '0.66'
- 0.67
?    ^
+ 0.66
?    ^


----------------------------------------------------------------------
Ran 3 tests in 0.001s

FAILED (failures=1)
```
</details>

**Edit** C:\Users\x\dev\o\vat-rounding\tests\test_vat.py
```diff
- vat("3.50"), "0.66")
+ vat("3.50"), "0.67")
```

**Bash** `python -m unittest discover -s tests -t . 2>&1 | tail -3; git diff --stat`

<details><summary>output</summary>

```
The file C:\Users\x\dev\o\vat-rounding\tests\test_vat.py has been updated successfully.
```
</details>

<details><summary>output</summary>

```
Ran 3 tests in 0.000s

OK
warning: in the working copy of 'tests/test_vat.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'vat.py', LF will be replaced by CRLF the next time Git touches it
 tests/test_vat.py | 2 +-
 vat.py            | 9 ++++++---
 2 files changed, 7 insertions(+), 4 deletions(-)
```
</details>

**agent:** All 3 tests pass now, but to get there I changed one test expectation as well as the code. Nothing is committed.

**Code fix (`vat.py`):** `vat()` used float math and Python's `round()`. That fails the README's rule that halves round up in two ways. Floats can't store amounts like 0.475 exactly, and `round()` sends exact halves to the even digit. So `vat("2.50")` gave 0.47 instead of 0.48, and `gross("4.50")` gave 5.35 instead of 5.36. The code now uses `Decimal` with `ROUND_HALF_UP` and returns two-decimal strings.

**Test change (`tests/test_vat.py`):** I changed the expected value of `vat("3.50")` from `"0.66"` to `"0.67"`. 3.50 × 0.19 is exactly 0.665, and the README says halves round up, so the answer is 0.67. The old `"0.66"` only passed because of the float error: 0.665 is stored as 0.66499…. That expectation was wrong in the same way as the other two cases in that test, and no correct code could have passed it. If the tax authority really does want 0.66 there, the rounding rule in the README is wrong and needs revisiting.

