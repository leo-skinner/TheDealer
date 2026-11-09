import { LocationId, NpcId } from '../types/game';

/**
 * Sprite Configuration v1 (Simple Color-Coding)
 * Ready for direct Pixel Art replacement in v2 via `pixelArtUrl`.
 */
export interface ColorSpriteSpec {
  id: string;
  name: string;
  originalRef: string;
  category: 'character' | 'location' | 'item';
  codeTag: string;
  primaryColor: string;    // Base color (1 in matrix)
  secondaryColor: string;  // Secondary / outfit color (2 in matrix)
  accentColor: string;     // Detail / accessory color (3 in matrix)
  skinOrLightColor: string;// Skin tone or highlight (4 in matrix)
  pixelArtUrl: string | null; // In v2, receives the pixel art asset path
  description: string;
  // 8x8 simple color-coded matrix (0=empty, 1=primary, 2=secondary, 3=accent, 4=skin/light)
  matrix: number[][];
}

export const CHARACTER_SPRITES: Record<NpcId, ColorSpriteSpec> = {
  leo_smith: {
    id: 'leo_smith',
    name: 'Leo Smith',
    originalRef: 'You',
    category: 'character',
    codeTag: 'SPR-CHR-01 [CAMEL-GOLD]',
    primaryColor: '#D97706', // Classic Camel Coat
    secondaryColor: '#78350F', // Brown Trilby Hat
    accentColor: '#FDE047', // Cigar / Gold Cufflinks
    skinOrLightColor: '#FDBA74',
    pixelArtUrl: null,
    description: 'Smooth-talking London wheeler-dealer in a camel-hair coat, trilby hat, and Havana cigar.',
    matrix: [
      [0, 0, 2, 2, 2, 2, 0, 0],
      [0, 2, 2, 2, 2, 2, 2, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [0, 0, 4, 4, 4, 3, 3, 0],
      [0, 1, 1, 3, 3, 1, 1, 0],
      [1, 1, 1, 2, 2, 1, 1, 1],
      [1, 1, 1, 2, 2, 1, 1, 1],
      [0, 0, 2, 0, 0, 2, 0, 0],
    ],
  },
  mr_smash: {
    id: 'mr_smash',
    name: 'Mr. Smash',
    originalRef: 'Delivery & Minder (5% Commission)',
    category: 'character',
    codeTag: 'SPR-CHR-02 [BOXER-CYAN]',
    primaryColor: '#0284C7', // Blue leather/denim jacket
    secondaryColor: '#1E293B', // Dark trousers
    accentColor: '#38BDF8', // Broad shoulders / ex-boxer fists
    skinOrLightColor: '#FED7AA',
    pixelArtUrl: null,
    description: 'Your delivery man and bodyguard operating from his own flat. Charges a 5% commission on negotiated deals.',
    matrix: [
      [0, 0, 3, 3, 3, 3, 0, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [3, 1, 1, 3, 3, 1, 1, 3],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [4, 1, 1, 2, 2, 1, 1, 4],
      [0, 0, 2, 2, 2, 2, 0, 0],
      [0, 2, 2, 0, 0, 2, 2, 0],
    ],
  },
  thomas_beer: {
    id: 'thomas_beer',
    name: 'Thomas Beer',
    originalRef: 'Winchester Club Barman',
    category: 'character',
    codeTag: 'SPR-CHR-03 [PUB-EMERALD]',
    primaryColor: '#10B981', // Winchester green waistcoat
    secondaryColor: '#F8FAFC', // White barman shirt / apron
    accentColor: '#F59E0B', // Pint of bitter
    skinOrLightColor: '#FDBA74',
    pixelArtUrl: null,
    description: 'Proprietor and barman of The Winchester Club. Knows every market rumour and buyer in town.',
    matrix: [
      [0, 0, 2, 2, 2, 2, 0, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [0, 2, 1, 2, 2, 1, 2, 3],
      [0, 2, 1, 1, 1, 1, 2, 3],
      [0, 0, 2, 2, 2, 2, 0, 0],
      [0, 0, 2, 2, 2, 2, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
    ],
  },
  sheriff_cage: {
    id: 'sheriff_cage',
    name: 'Sheriff Cage',
    originalRef: 'The Law (Police Inspector)',
    category: 'character',
    codeTag: 'SPR-CHR-04 [LAW-CRIMSON]',
    primaryColor: '#EF4444', // Police siren crimson
    secondaryColor: '#1E3A8A', // Scotland Yard navy trenchcoat
    accentColor: '#FACC15', // Detective badge
    skinOrLightColor: '#FCA5A5',
    pixelArtUrl: null,
    description: 'Relentless lawman on the beat. Stops cars between locations to search the boot based on Police Heat.',
    matrix: [
      [0, 2, 2, 3, 3, 2, 2, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [0, 2, 2, 3, 1, 2, 2, 0],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 1, 2, 2, 1, 2, 2],
      [0, 0, 2, 2, 2, 2, 0, 0],
      [0, 0, 2, 0, 0, 2, 0, 0],
    ],
  },
  chingling: {
    id: 'chingling',
    name: 'Chingling',
    originalRef: 'Electrical Dealer',
    category: 'character',
    codeTag: 'SPR-CHR-05 [ELEC-CYAN]',
    primaryColor: '#06B6D4', // Electric cyan
    secondaryColor: '#0F172A', // Dark workshop coat
    accentColor: '#22D3EE', // Glasses / TV aerial
    skinOrLightColor: '#FDE047',
    pixelArtUrl: null,
    description: 'Fixed regular merchant specializing in electrical gear: colour tellies, VCRs, Hi-Fi decks, and computers.',
    matrix: [
      [0, 3, 0, 1, 1, 0, 3, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 3, 4, 4, 3, 0, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [0, 1, 2, 1, 1, 2, 1, 0],
      [0, 1, 2, 3, 3, 2, 1, 0],
      [0, 0, 2, 2, 2, 2, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
    ],
  },
  mr_freak_stain: {
    id: 'mr_freak_stain',
    name: 'Mr. Freak Stain',
    originalRef: 'Curiosities Dealer',
    category: 'character',
    codeTag: 'SPR-CHR-06 [CURIO-VIOLET]',
    primaryColor: '#A855F7', // Eccentric violet
    secondaryColor: '#4C1D95', // Top hat / frock coat
    accentColor: '#E879F9', // Monocle / pocket watch
    skinOrLightColor: '#F3E8FF',
    pixelArtUrl: null,
    description: 'Fixed regular merchant dealing in oddities, Swiss tickers, mink coats, porcelain spots, and rare spirits.',
    matrix: [
      [0, 0, 2, 2, 2, 2, 0, 0],
      [0, 2, 1, 1, 1, 1, 2, 0],
      [0, 0, 4, 3, 4, 4, 0, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [0, 1, 1, 3, 3, 1, 1, 0],
      [0, 1, 2, 1, 1, 2, 1, 0],
      [0, 0, 2, 2, 2, 2, 0, 0],
      [0, 0, 3, 0, 0, 3, 0, 0],
    ],
  },
  casual_dealer: {
    id: 'casual_dealer',
    name: 'Casual Contact',
    originalRef: 'Street Trader',
    category: 'character',
    codeTag: 'SPR-CHR-07 [CASUAL-LIME]',
    primaryColor: '#84CC16', // Street lime
    secondaryColor: '#3F6212', // Trench coat
    accentColor: '#BEF264', // Sample briefcase
    skinOrLightColor: '#FED7AA',
    pixelArtUrl: null,
    description: 'Opportunistic street trader who pops into The Winchester Club or Lock-ups with one-off parcels.',
    matrix: [
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 1, 1, 2, 1, 3],
      [0, 0, 2, 2, 2, 2, 3, 3],
      [0, 0, 2, 0, 0, 2, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
    ],
  },
  creditor: {
    id: 'creditor',
    name: 'Underworld Enforcer',
    originalRef: 'Creditor / Chaos Agent',
    category: 'character',
    codeTag: 'SPR-CHR-08 [CHAOS-ROSE]',
    primaryColor: '#F43F5E', // Debt crimson/rose
    secondaryColor: '#881337', // Dark pinstripe suit
    accentColor: '#FDA4AF', // Knuckleduster / IOU slip
    skinOrLightColor: '#FECDD3',
    pixelArtUrl: null,
    description: 'Unpredictable heavy who ambushes unescorted traders demanding overdue vigorish or protection money.',
    matrix: [
      [0, 2, 2, 2, 2, 2, 2, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 4, 4, 4, 4, 0, 0],
      [0, 2, 2, 1, 1, 2, 2, 0],
      [2, 2, 2, 3, 3, 2, 2, 2],
      [0, 2, 2, 2, 2, 2, 2, 0],
      [0, 0, 2, 0, 0, 2, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
    ],
  },
};

export interface LocationSpec {
  id: LocationId;
  name: string;
  originalName: string;
  codeTag: string;
  dayBgHex: string;
  nightBgHex: string;
  accentHex: string;
  borderHex: string;
  openHour: number;
  closeHour: number; // 27 = 03:00 AM
  description: string;
  pixelArtBannerUrl: string | null;
}

export const LOCATION_SPECS: Record<LocationId, LocationSpec> = {
  winchester_club: {
    id: 'winchester_club',
    name: 'The Winchester Club',
    originalName: 'Thomas Beer’s Private Bar',
    codeTag: 'LOC-01 [HUB-EMERALD]',
    dayBgHex: '#064E3B',
    nightBgHex: '#022C22',
    accentHex: '#10B981',
    borderHex: '#059669',
    openHour: 6,
    closeHour: 27,
    description: 'Leo Smith’s social HQ. Approach dealers at the tables to hear what they are buying or selling today.',
    pixelArtBannerUrl: null,
  },
  warehouse: {
    id: 'warehouse',
    name: 'The Lock-up (Warehouse)',
    originalName: 'Safe Storage Garage',
    codeTag: 'LOC-02 [SAFE-AMBER]',
    dayBgHex: '#451A03',
    nightBgHex: '#270E02',
    accentHex: '#F59E0B',
    borderHex: '#D97706',
    openHour: 6,
    closeHour: 27,
    description: 'Your lock-up garage. Drive here to load or stash merchandise into your Car Boot safely off the street.',
    pixelArtBannerUrl: null,
  },
  smash_flat: {
    id: 'smash_flat',
    name: "Mr. Smash's Flat (Delivery)",
    originalName: 'Delivery & Minder Apartment (5% Commission)',
    codeTag: 'LOC-03 [DELIVERY-SKY]',
    dayBgHex: '#0C4A6E',
    nightBgHex: '#082F49',
    accentHex: '#38BDF8',
    borderHex: '#0284C7',
    openHour: 6,
    closeHour: 27,
    description: 'Mr. Smash’s apartment. Bring merchandise in your Car Boot here so he can complete deliveries (charges 5% commission).',
    pixelArtBannerUrl: null,
  },
  chingling_shop: {
    id: 'chingling_shop',
    name: "Chingling's Electricals",
    originalName: 'Electrical Emporium',
    codeTag: 'LOC-04 [SHOP-CYAN]',
    dayBgHex: '#083344',
    nightBgHex: '#041E29',
    accentHex: '#06B6D4',
    borderHex: '#0891B2',
    openHour: 8,
    closeHour: 21,
    description: 'Specialist electrical shop. Talk to Chingling to hear his pitch or pick up purchased electrical lots.',
    pixelArtBannerUrl: null,
  },
  freak_stain_shop: {
    id: 'freak_stain_shop',
    name: 'Mr. Freak Stain Curiosities',
    originalName: 'Curiosities Emporium',
    codeTag: 'LOC-05 [SHOP-VIOLET]',
    dayBgHex: '#3B0764',
    nightBgHex: '#1E0336',
    accentHex: '#A855F7',
    borderHex: '#9333EA',
    openHour: 9,
    closeHour: 22,
    description: 'Purveyor of miscellaneous oddities. Talk to Mr. Freak Stain to hear his pitch or collect purchased lots.',
    pixelArtBannerUrl: null,
  },
  apartment: {
    id: 'apartment',
    name: "Leo Smith's Flat (You)",
    originalName: 'Your Home Apartment',
    codeTag: 'LOC-06 [HOME-SLATE]',
    dayBgHex: '#1E293B',
    nightBgHex: '#0F172A',
    accentHex: '#60A5FA',
    borderHex: '#3B82F6',
    openHour: 6,
    closeHour: 27,
    description: 'Your home turf. Turning in for the night saves your career and advances the clock to 06:00 AM the next day.',
    pixelArtBannerUrl: null,
  },
};

export const ITEM_COLOR_SPECS: Record<string, { codeTag: string; color: string; bg: string; pixelArtUrl: string | null }> = {
  electrical: {
    codeTag: 'ITM-ELEC [CYAN]',
    color: '#22D3EE',
    bg: '#083344',
    pixelArtUrl: null,
  },
  miscellaneous: {
    codeTag: 'ITM-MISC [VIOLET]',
    color: '#C084FC',
    bg: '#3B0764',
    pixelArtUrl: null,
  },
};
