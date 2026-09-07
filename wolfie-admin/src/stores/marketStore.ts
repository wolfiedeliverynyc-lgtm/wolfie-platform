import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MarketId = 'NYC' | 'EL_KALA';

export interface MarketConfig {
  id: MarketId;
  name: string;
  badgeLabel: string;
  timezone: string;
  timezoneCode: string;
  currency: string;
  currencySymbol: string;
  accentClass: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  zones: string[];
}

export const MARKETS: Record<MarketId, MarketConfig> = {
  NYC: {
    id: 'NYC',
    name: 'New York City',
    badgeLabel: 'NYC • Live Production',
    timezone: 'America/New_York',
    timezoneCode: 'NYC (EDT)',
    currency: 'USD',
    currencySymbol: '$',
    accentClass: 'text-sky-400',
    badgeBg: 'rgba(56, 189, 248, 0.12)',
    badgeBorder: 'rgba(56, 189, 248, 0.35)',
    badgeText: '#38bdf8',
    zones: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Midtown', 'Downtown', 'Uptown', 'Williamsburg', 'Astoria'],
  },
  EL_KALA: {
    id: 'EL_KALA',
    name: 'El Kala',
    badgeLabel: 'El Kala • Live Production',
    timezone: 'Africa/Algiers',
    timezoneCode: 'ELK (CET)',
    currency: 'DZD',
    currencySymbol: 'DA',
    accentClass: 'text-amber-400',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    badgeBorder: 'rgba(245, 158, 11, 0.35)',
    badgeText: '#f59e0b',
    zones: ['Centre Ville', 'El Mordjane', 'Port El Kala', 'Cap Rosa', 'Zone Hôtelière', 'Brabantia', 'El Tarf'],
  },
};

interface MarketState {
  currentMarketId: MarketId;
  setMarket: (marketId: MarketId) => void;
  getMarketConfig: () => MarketConfig;
  isRecordInMarket: (item: { zone?: string | null; currency?: string | null; market?: string | null }) => boolean;
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      currentMarketId: 'NYC',

      setMarket: (marketId: MarketId) => {
        set({ currentMarketId: marketId });
      },

      getMarketConfig: () => {
        const id = get().currentMarketId;
        return MARKETS[id] || MARKETS.NYC;
      },

      isRecordInMarket: (item) => {
        const currentId = get().currentMarketId;
        if (!item) return false;

        // 1. Explicit market field check
        if (item.market) {
          const norm = item.market.toUpperCase().replace(/\s+/g, '_');
          if (norm.includes('KALA') || norm.includes('ALGERIA')) {
            return currentId === 'EL_KALA';
          }
          if (norm.includes('NYC') || norm.includes('NEW_YORK')) {
            return currentId === 'NYC';
          }
        }

        // 2. Currency check
        if (item.currency) {
          const curr = item.currency.toUpperCase();
          if (curr === 'DZD' || curr === 'DA') {
            return currentId === 'EL_KALA';
          }
          if (curr === 'USD') {
            return currentId === 'NYC';
          }
        }

        // 3. Zone name matching
        if (item.zone) {
          const zoneLower = item.zone.toLowerCase();
          const elkalaZones = MARKETS.EL_KALA.zones.map((z) => z.toLowerCase());
          const isElkalaZone = elkalaZones.some((z) => zoneLower.includes(z));

          if (isElkalaZone) {
            return currentId === 'EL_KALA';
          }

          const nycZones = MARKETS.NYC.zones.map((z) => z.toLowerCase());
          const isNycZone = nycZones.some((z) => zoneLower.includes(z));
          if (isNycZone) {
            return currentId === 'NYC';
          }
        }

        // Default: match active market
        return true;
      },
    }),
    {
      name: 'wolfie_admin_market_storage',
    }
  )
);
