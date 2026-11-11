export type ItemCategory = 'electrical' | 'miscellaneous';

export type LocationId =
  | 'winchester_club'
  | 'apartment'
  | 'warehouse'
  | 'smash_flat'
  | 'chingling_shop'
  | 'freak_stain_shop';

export type NpcId =
  | 'leo_smith'
  | 'mr_smash'
  | 'thomas_beer'
  | 'sheriff_cage'
  | 'chingling'
  | 'mr_freak_stain'
  | 'casual_dealer'
  | 'creditor';

export type GameMode =
  | 'SPLASH'
  | 'MAIN_HUB'
  | 'TRANSITION'
  | 'CONVERSATION'
  | 'LOGISTICS'
  | 'GAME_OVER'
  | 'VICTORY';

export interface TradeItem {
  id: string;
  name: string;
  shortKey: string;
  type: ItemCategory;
  buyPrice: number;
  marketValue: number;
  isIllicit: boolean;
  spriteId: string;
}

export interface DialogueEntry {
  id: string;
  speaker: 'PLAYER' | 'NPC' | 'SYSTEM';
  speakerName: string;
  text: string;
  timestamp: string;
  mathDebug?: string;
}

/**
 * Contrato pendente quando a mercadoria não está no carro no momento do acordo
 * ou precisa ser buscada na loja / armazém e entregue no apartamento do Delivery (Mr. Smash, 5% comissão).
 */
export interface PendingDeal {
  id: string;
  type: 'BUY_PICKUP' | 'SELL_DELIVERY';
  npcId: NpcId;
  npcName: string;
  item: TradeItem;
  agreedPrice: number;
  commissionFivePercent: number; // 5% commission for Mr. Smash (Delivery)
  pickupLocation: LocationId;    // Where the player must go to load the item into the Car Boot
  deliveryLocation: LocationId;  // 'smash_flat' (Mr. Smash's Delivery Apartment)
  pickedUpIntoCar: boolean;
}

export interface SmashStatus {
  location: LocationId;
  carrying: TradeItem[];
  isFollowing: boolean;
  commissionRate: number; // 0.05 (5%)
  totalCommissionPaid: number;
}

export interface ActiveEncounter {
  npcId: NpcId;
  npcName: string;
  originalName: string;
  npcType: 'merchant' | 'barman' | 'minder' | 'police' | 'casual' | 'creditor';
  tradeRole:
    | 'SELLING_TO_PLAYER'
    | 'BUYING_FROM_PLAYER'
    | 'BAR_CHAT'
    | 'MINDER_ORDERS'
    | 'POLICE_CHECK'
    | 'CREDITOR_DEMAND';
  itemInPlay: TradeItem | null;
  patience: number;
  maxPatience: number;
  targetPrice: number;
  currentQuote: number;
  offerWeight: number;
  rounds: number;
  finalOfferLocked: boolean;
  negotiationActive: boolean;
  transcript: DialogueEntry[];
}

export interface MarketLot {
  npcId: NpcId;
  npcName: string;
  originalName: string;
  location: LocationId;
  role: 'SELLING_TO_PLAYER' | 'BUYING_FROM_PLAYER';
  item: TradeItem;
  targetPrice: number;
  initialQuote: number;
  patience: number;
  availableFromHour: number;
  availableUntilHour: number;
}

export interface GameState {
  mode: GameMode;
  themeMode: 'day_night_auto' | 'crt_terminal';
  soundEnabled: boolean;
  adminMode: boolean;
  player: {
    name: string;
    originalAlias: string;
    bankroll: number;
    targetGoal: number;
    day: number;
    maxDays: number;
    hour: number; // 6 to 27 (where 24=00:00, 25=01:00, 26=02:00, 27=03:00 AM limit)
    currentLocation: LocationId;
    reputation: number; // 0 to 100
    maxCarryCapacity: number;
    inventory: TradeItem[];          // Car Boot (Porta-malas do carro)
    warehouseInventory: TradeItem[]; // The Lock-up (Armazém)
    pendingDeals: PendingDeal[];     // Contratos que exigem deslocamento manual
  };
  world: {
    policeHeat: number; // 0 to 100 (Probabilidade de batida policial no carro durante deslocamento)
    terryStatus: SmashStatus;
    marketPrices: {
      electrical: number;
      miscellaneous: number;
    };
    dailyLots: MarketLot[];
    winchesterRumor: string;
  };
  activeEncounter: ActiveEncounter | null;
  logs: string[];
}
