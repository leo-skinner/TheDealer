import { GameState } from '../types/game';
import { CATALOG_ITEMS, generateDailyMarket } from './bargainEngine';

export const SAVE_STORAGE_KEY = 'the_trader_save_state';

export function createInitialGameState(): GameState {
  const { lots, rumor } = generateDailyMarket(1, 1.2, 0.9);

  return {
    mode: 'MAIN_HUB',
    themeMode: 'day_night_auto',
    soundEnabled: true,
    player: {
      name: 'Leo Smith',
      originalAlias: 'You',
      bankroll: 2000.0,
      targetGoal: 3500.0,
      day: 1,
      maxDays: 7,
      hour: 6, // 06:00 AM
      currentLocation: 'winchester_club',
      reputation: 70,
      maxCarryCapacity: 2,
      inventory: [
        {
          id: 'tv_sony_1985',
          name: '14" Colour Telly (Contraband Lot)',
          shortKey: 'tv',
          type: 'electrical',
          buyPrice: 120.0,
          marketValue: 160.0,
          isIllicit: true,
          spriteId: 'electrical',
        },
      ],
      warehouseInventory: [
        {
          id: 'spots_lockup_init',
          name: 'Rare Porcelain & Antique Spots',
          shortKey: 'spots',
          type: 'miscellaneous',
          buyPrice: 95.0,
          marketValue: 125.0,
          isIllicit: false,
          spriteId: 'miscellaneous',
        },
      ],
      pendingDeals: [],
    },
    world: {
      policeHeat: 15,
      terryStatus: {
        location: 'smash_flat',
        carrying: [],
        isFollowing: false,
        commissionRate: 0.05,
        totalCommissionPaid: 0,
      },
      marketPrices: {
        electrical: 1.2,
        miscellaneous: 0.9,
      },
      dailyLots: lots,
      winchesterRumor: rumor,
    },
    activeEncounter: null,
    logs: [
      '[06:00 - Day 1] Welcome to The Winchester Club, Leo Smith (You)! You have £2,000.00 in your bankroll and 1x 14" Colour Telly in your Car Boot.',
      '[LOGISTICS RULE] Nothing teleports automatically! When buying or selling merchandise not currently in your Car Boot, you must drive to pick it up at the Shop or Lock-up and bring it to Mr. Smash’s Flat (Delivery) — he charges a 5% commission on negotiated deals.',
    ],
  };
}

/**
 * Ensures any saved state from an earlier session is migrated to the updated schema.
 */
function normalizeStateToEnglish(state: GameState): GameState {
  const mapItemName = (shortKey: string, fallback: string) => {
    const match = CATALOG_ITEMS.find((c) => c.shortKey === shortKey);
    return match ? match.name : fallback;
  };

  state.player.originalAlias = 'You';
  state.player.inventory = (state.player.inventory || []).map((item) => ({
    ...item,
    name: mapItemName(item.shortKey, item.name),
  }));

  state.player.warehouseInventory = (state.player.warehouseInventory || []).map((item) => ({
    ...item,
    name: mapItemName(item.shortKey, item.name),
  }));

  if (!Array.isArray(state.player.pendingDeals)) {
    state.player.pendingDeals = [];
  }

  if (!state.world.terryStatus || typeof state.world.terryStatus.commissionRate !== 'number') {
    state.world.terryStatus = {
      location: 'smash_flat',
      carrying: [],
      isFollowing: false,
      commissionRate: 0.05,
      totalCommissionPaid: 0,
    };
  }

  if (state.world?.dailyLots) {
    state.world.dailyLots = state.world.dailyLots.map((lot) => ({
      ...lot,
      item: {
        ...lot.item,
        name: mapItemName(lot.item.shortKey, lot.item.name),
      },
    }));
  }

  return state;
}

export function hasSavedGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && parsed.player && typeof parsed.player.bankroll === 'number');
  } catch {
    return false;
  }
}

export function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || !parsed.player) return null;
    return normalizeStateToEnglish(parsed);
  } catch {
    return null;
  }
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage quota issues
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
