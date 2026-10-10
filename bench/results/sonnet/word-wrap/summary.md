All 7 tests now pass. I changed only `wordwrap.py`, and nothing is committed.

There were three bugs, and the new `wrap` fixes each one:
- **Whitespace:** `text.split(" ")` only split on single spaces, so tabs, newlines and repeated spaces produced empty words. It now uses `text.split()`.
- **Line width:** the fit check ignored the joining space, so `"aaaa bbbb"` landed on one line at width 8. It now counts the space.
- **Long words:** words longer than `width` were never cut. They are now split into `width`-sized pieces. The last, shorter piece is treated as a normal word and can share a line with the next word, as the README describes.
