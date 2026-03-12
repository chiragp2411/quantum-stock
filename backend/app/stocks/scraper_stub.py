"""Optional BSE/NSE Scrapy spider stub.

This is a placeholder for future implementation of direct scraping
from BSE/NSE official sites. Indian financial scraping is heavily
blocked by Cloudflare, so the primary data path is yfinance + PDF upload.
"""

# To use:
# 1. Create a Scrapy project alongside this module
# 2. Implement spiders for BSE/NSE official data endpoints
# 3. Run via: scrapy crawl bse_spider -O output.json

BSE_BASE_URL = "https://www.bseindia.com"
NSE_BASE_URL = "https://www.nseindia.com"


def fetch_bse_financials(scrip_code: str) -> dict | None:
    """Placeholder: Fetch financial data from BSE for a given scrip code."""
    # Future: Implement Scrapy-based extraction
    return None


def fetch_nse_financials(symbol: str) -> dict | None:
    """Placeholder: Fetch financial data from NSE for a given symbol."""
    # Future: Implement Scrapy-based extraction
    return None
