# billing-format

`formatPrice(cents)` formats an integer amount of cents for display: thousands separated by commas,
always two decimals, and a leading minus sign for negative amounts (refunds).

| cents       | formatted        |
| ----------- | ---------------- |
| `0`         | `0.00`           |
| `5`         | `0.05`           |
| `123450`    | `1,234.50`       |
| `-150`      | `-1.50`          |
| `100000000` | `1,000,000.00`   |

Run the tests with `npm test`.
