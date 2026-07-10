# Future Finances

A small, private investment growth calculator. The app runs entirely in the browser and has no build step, backend, database, analytics, or user accounts.

## Run locally

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## What it models

- Brokerage, Roth IRA, and 401(k) balances and yearly contributions
- Any number of optional crypto holdings (up to 10), each with its own balance, yearly contribution, and growth assumption
- Optional non-crypto assets such as real estate, gold, or collectibles, modeled in the same repeatable format with independent growth assumptions
- Up to three average yearly return scenarios
- An optional yearly increase to contributions
- A grouped account-by-account projection table at the selected age interval
- An interactive growth chart with exact values on hover or keyboard focus
- User-specific formula examples and a CSV export

The calculator compounds returns annually and adds contributions at the end of each year. It is educational only and does not account for taxes, fees, account limits, withdrawals, or market volatility.

## Project structure

- `index.html` — semantic page and calculator structure
- `styles.css` — responsive visual design
- `script.js` — validation, projections, chart rendering, and CSV export

The interface uses the official Geist variable font from Vercel's SIL Open Font License release.
