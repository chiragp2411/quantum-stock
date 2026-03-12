# Feature: Lynch Stock Classification

## Overview

QuantumStock classifies every stock into one of six Peter Lynch categories from "One Up on Wall Street". This classification drives how the app interprets a stock's growth trajectory and helps users decide where to focus their research.

## The Six Categories

| Category | Criteria | Car Race Analogy |
|----------|----------|-----------------|
| **Fast Grower** | EPS growth > 20%, market cap < ₹50,000 Cr | The race car — small and fast, the primary target for Lynch-style investing |
| **Stalwart** | EPS growth 10-20%, market cap ≥ ₹50,000 Cr | The reliable family sedan — steady growth, won't surprise you |
| **Slow Grower** | EPS growth < 10% | The city bus — predictable, dividend-paying, limited upside |
| **Cyclical** | In a cyclical sector with volatile earnings | The rally car — performance depends heavily on track conditions (economic cycle) |
| **Turnaround** | Earnings turning from negative to positive | The car that went to the pit stop — broken but getting fixed |
| **Asset Play** | Hidden assets undervalued by the market | The vintage car — worth more for its parts than what people think |

## Classification Logic

```python
def classify_lynch(eps_growth, market_cap, sector, earnings_volatile, 
                   earnings_negative_turning_positive):
```

The classification follows a priority-ordered decision tree:

### Priority 1: Turnaround Check
```
If earnings are turning from negative to positive → TURNAROUND
```
This takes highest priority because a turnaround is a distinct investment thesis regardless of other metrics.

### Priority 2: Cyclical Check
```
If sector is in CYCLICAL_SECTORS AND earnings are volatile → CYCLICAL
```
Cyclical stocks behave differently from growth stocks and require sector-aware analysis.

### Priority 3: Growth-Based Classification
```
If EPS growth > 20% AND market_cap < ₹50,000 Cr → FAST GROWER
If EPS growth 10-20% AND market_cap ≥ ₹50,000 Cr → STALWART
If EPS growth < 10% → SLOW GROWER
If EPS growth > 20% AND market_cap ≥ ₹50,000 Cr → FAST GROWER
Default → STALWART
```

## Cyclical Sectors

The following sectors are flagged as potentially cyclical (defined in `CYCLICAL_SECTORS`):

- Metals & Mining
- Steel
- Cement
- Automobiles
- Auto Components
- Construction
- Real Estate
- Oil & Gas
- Commodities
- Airlines
- Shipping
- Sugar
- Paper
- Textiles

A stock in one of these sectors is classified as **Cyclical** only if `earnings_volatile` is also `True`.

## Data Sources

| Input | Source | Notes |
|-------|--------|-------|
| `eps_growth` | yfinance `earningsGrowth` field × 100 | Trailing earnings growth as percentage |
| `market_cap` | yfinance `marketCap` / 1e7 | Converted from INR to crores |
| `sector` | yfinance `sector` field | Matched against `CYCLICAL_SECTORS` (case-insensitive) |
| `earnings_volatile` | Not currently computed | Placeholder — always `False` in current implementation |
| `earnings_negative_turning_positive` | Not currently computed | Placeholder — always `False` in current implementation |

## Current Limitations

1. **`earnings_volatile` is never set to True** — Cyclical classification only triggers manually. A future improvement would compute earnings variance from historical data.

2. **`earnings_negative_turning_positive` is never set to True** — Turnaround classification doesn't activate automatically. Would require comparing current vs previous year earnings.

3. **`Asset Play` category exists but has no automatic trigger** — This requires qualitative analysis (hidden real estate value, valuable subsidiaries, etc.) that isn't available from yfinance data.

4. **Market cap thresholds are fixed** — The ₹50,000 Cr threshold for distinguishing Fast Growers from Stalwarts is hardcoded. This may need adjustment based on market conditions.

## Integration Points

- **Stock search (`/api/stocks/search`):** Classification runs on every search and is stored in the `stocks` collection
- **Stock overview page:** Displays the Lynch category as a colored badge with tooltip explanation
- **Frontend constants (`lib/constants.ts`):** Contains display config for each category (color, description, analogy)

## Related Files

| File | Purpose |
|------|---------|
| `app/stocks/models.py` | `LynchCategory` enum, `classify_lynch()` function, `CYCLICAL_SECTORS` set |
| `app/stocks/yfinance_service.py` | Calls `classify_lynch()` with data from yfinance |
| `app/stocks/router.py` | Serves classification as part of stock search/summary |
