/**
 * NEXUS Finance — Crypto Provider Legacy Alias
 * Previously CoinGeckoProvider; migrated to CoinMarketCapProvider for free Basic tier support.
 * Re-exports CoinMarketCapProvider for seamless backwards compatibility with zero active CoinGecko network calls.
 */

export {
  CoinMarketCapProvider,
  CoinMarketCapProvider as CoinGeckoProvider,
  CoinMarketCapProvider as CoinGeckoCryptoProvider,
} from './coinmarketcap-provider'
