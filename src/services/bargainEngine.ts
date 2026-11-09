import { ActiveEncounter, LocationId, MarketLot, TradeItem } from '../types/game';

export const CATALOG_ITEMS: Omit<TradeItem, 'id' | 'buyPrice'>[] = [
  {
    name: '14" Colour Telly (Contraband Lot)',
    shortKey: 'tv',
    type: 'electrical',
    marketValue: 160,
    isIllicit: true,
    spriteId: 'electrical',
  },
  {
    name: 'Betamax / VHS Video Recorder Crate',
    shortKey: 'vcr',
    type: 'electrical',
    marketValue: 220,
    isIllicit: false,
    spriteId: 'electrical',
  },
  {
    name: 'Amstrad Twin-Deck Hi-Fi Stereo',
    shortKey: 'hifi',
    type: 'electrical',
    marketValue: 140,
    isIllicit: false,
    spriteId: 'electrical',
  },
  {
    name: '48K Microcomputer Batch',
    shortKey: 'computer',
    type: 'electrical',
    marketValue: 275,
    isIllicit: true,
    spriteId: 'electrical',
  },
  {
    name: 'Box of "Genuine" Swiss Watches',
    shortKey: 'watches',
    type: 'miscellaneous',
    marketValue: 190,
    isIllicit: true,
    spriteId: 'miscellaneous',
  },
  {
    name: 'Full-Length Mink Fur Coats',
    shortKey: 'coats',
    type: 'miscellaneous',
    marketValue: 310,
    isIllicit: true,
    spriteId: 'miscellaneous',
  },
  {
    name: 'Rare Porcelain & Antique Spots',
    shortKey: 'spots',
    type: 'miscellaneous',
    marketValue: 125,
    isIllicit: false,
    spriteId: 'miscellaneous',
  },
  {
    name: 'Cases of 12-Year Scotch Whisky',
    shortKey: 'whisky',
    type: 'miscellaneous',
    marketValue: 175,
    isIllicit: true,
    spriteId: 'miscellaneous',
  },
];

export const SLANG_MULTIPLIERS: Record<string, number> = {
  quid: 1,
  quids: 1,
  q: 1,
  sov: 1,
  sovs: 1,
  xx: 1,
  pound: 1,
  pounds: 1,
  nicker: 1,
  fiver: 5,
  fivers: 5,
  tenner: 10,
  tenners: 10,
  score: 20,
  scores: 20,
  pony: 25,
  ponies: 25,
  ton: 100,
  tons: 100,
  century: 100,
  monkey: 500,
  monkeys: 500,
  grand: 1000,
  grands: 1000,
};

const WRITTEN_NUMBERS = [
  'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred',
  'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'cem', 'duzentos', 'trezentos',
];

const ITEM_KEYWORD_MAP: Array<{ pattern: RegExp; key: string; label: string }> = [
  { pattern: /\b(tv|tvs|telly|tellies|television|televisions)\b/i, key: 'tv', label: 'TV/TELLIES' },
  { pattern: /\b(vcr|vcrs|video|videos|betamax|vhs|recorder|recorders)\b/i, key: 'vcr', label: 'VCR/VIDEO' },
  { pattern: /\b(hifi|hi-fi|stereo|stereos|amstrad|deck|radio|audio)\b/i, key: 'hifi', label: 'HI-FI' },
  { pattern: /\b(computer|computers|micro|microcomputer|micros|spectrum)\b/i, key: 'computer', label: 'COMPUTER' },
  { pattern: /\b(watch|watches|rolex|ticker|tickers|swiss|clocks)\b/i, key: 'watches', label: 'WATCHES' },
  { pattern: /\b(coat|coats|fur|furs|mink|pelts)\b/i, key: 'coats', label: 'COATS' },
  { pattern: /\b(spot|spots|porcelain|antique|antiques|china|figurines)\b/i, key: 'spots', label: 'SPOTS' },
  { pattern: /\b(whisky|whiskey|scotch|booze|spirits|bottles|cases)\b/i, key: 'whisky', label: 'WHISKY' },
  { pattern: /\b(electrical|electricals|electric|electronics)\b/i, key: 'electrical', label: 'ELECTRICAL' },
  { pattern: /\b(misc|miscellaneous|oddities|curiosities|curio)\b/i, key: 'miscellaneous', label: 'MISC' },
];

const LOCATION_KEYWORD_MAP: Array<{ pattern: RegExp; loc: LocationId; label: string }> = [
  { pattern: /\b(winchester|club|pub|bar|thomas|dave)\b/i, loc: 'winchester_club', label: 'WINCHESTER CLUB' },
  { pattern: /\b(warehouse|lock-up|lockup|garage|storage|stash)\b/i, loc: 'warehouse', label: 'LOCK-UP' },
  { pattern: /\b(smash|delivery|smashs|terrys)\b/i, loc: 'smash_flat', label: "MR. SMASH'S FLAT" },
  { pattern: /\b(flat|apartment|home|house)\b/i, loc: 'apartment', label: 'FLAT/HOME' },
  { pattern: /\b(chingling|chinglings|watt|watts)\b/i, loc: 'chingling_shop', label: "CHINGLING'S" },
  { pattern: /\b(freak|stain|oddgood|oddgoods|emporium)\b/i, loc: 'freak_stain_shop', label: 'FREAK STAIN' },
];

export interface ParsedCommand {
  intent:
    | 'OFFER'
    | 'ACCEPT'
    | 'REJECT_BYE'
    | 'LOOKING_FOR'
    | 'ASK_PRICE'
    | 'SMASH_MINDER'
    | 'SMASH_STOP_MINDER'
    | 'SMASH_COLLECT'
    | 'SMASH_DELIVER'
    | 'SMASH_MEET'
    | 'SMASH_PAY'
    | 'PAY_FINE_OR_DEBT'
    | 'REFUSE_FINE_OR_DEBT'
    | 'RUMOR'
    | 'GO_TO'
    | 'SLEEP'
    | 'HELP'
    | 'WRITTEN_NUMBER_ERROR'
    | 'UNKNOWN';
  amount?: number;
  slangUsed?: string;
  targetItemKey?: string;
  targetLocation?: LocationId;
  extractedKeywords: string[];
  raw: string;
}

/**
 * Extracts item keyword from anywhere inside a natural language sentence.
 */
function extractItemKeyword(text: string): { key: string; label: string } | null {
  for (const entry of ITEM_KEYWORD_MAP) {
    if (entry.pattern.test(text)) {
      return { key: entry.key, label: entry.label };
    }
  }
  return null;
}

/**
 * Extracts location keyword from anywhere inside a natural language sentence.
 */
function extractLocationKeyword(text: string): { loc: LocationId; label: string } | null {
  for (const entry of LOCATION_KEYWORD_MAP) {
    if (entry.pattern.test(text)) {
      return { loc: entry.loc, label: entry.label };
    }
  }
  return null;
}

/**
 * Scans a natural language sentence for digits + British monetary slang (or standalone slang like "a pony", "a monkey")
 * Supports compound natural phrases like "I'll give you a ton and 2 ponies for those tellies" (= £150).
 */
function extractMoneyFromSentence(text: string): {
  totalAmount: number;
  matchedTokens: string[];
} | null {
  // Strip out item model numbers like "14 inch", "14\"", "48k", "12-year" so they aren't mistaken for money
  const cleaned = text
    .replace(/\b14\s*(?:inch|in|")\b/gi, '')
    .replace(/\b48\s*k\b/gi, '')
    .replace(/\b12\s*(?:-|\s)?year\b/gi, '');

  let total = 0;
  const matchedTokens: string[] = [];
  let working = cleaned;

  // 1. Match all "<number> <slang_unit>" anywhere in the sentence (e.g. "6 ponies", "150 quid", "2 tons")
  const numWithSlangRegex =
    /\b(\d+(?:\.\d+)?)\s*(quid|quids|q|sov|sovs|xx|pound|pounds|nicker|fiver|fivers|tenner|tenners|score|scores|pony|ponies|ton|tons|century|monkey|monkeys|grand|grands)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = numWithSlangRegex.exec(working)) !== null) {
    const num = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    const mult = SLANG_MULTIPLIERS[unit] || 1;
    const val = Math.round(num * mult);
    total += val;
    matchedTokens.push(`${num} ${unit.toUpperCase()} (£${val})`);
  }
  working = working.replace(numWithSlangRegex, ' ');

  // 2. Match article + slang anywhere in the sentence (e.g. "a pony", "a monkey", "a ton", "a fiver", "a tenner", "a score", "a grand")
  const articleSlangRegex =
    /\b(?:a|an|one)\s+(fiver|tenner|score|pony|ton|century|monkey|grand)\b/gi;
  while ((match = articleSlangRegex.exec(working)) !== null) {
    const unit = match[1].toLowerCase();
    const mult = SLANG_MULTIPLIERS[unit] || 1;
    total += mult;
    matchedTokens.push(`A ${unit.toUpperCase()} (£${mult})`);
  }
  working = working.replace(articleSlangRegex, ' ');

  // 3. Match bare slang keyword if used alone like "offer pony" or "give monkey"
  const bareSlangRegex = /\b(fiver|tenner|score|pony|ton|century|monkey|grand)\b/gi;
  while ((match = bareSlangRegex.exec(working)) !== null) {
    const unit = match[1].toLowerCase();
    const mult = SLANG_MULTIPLIERS[unit] || 1;
    total += mult;
    matchedTokens.push(`${unit.toUpperCase()} (£${mult})`);
  }
  working = working.replace(bareSlangRegex, ' ');

  // 4. If no slang unit was attached, check for any standalone number in the sentence (e.g., "Look mate I can do 140 for the lot")
  if (total === 0) {
    const bareNumberMatch = working.match(/(?:£|\b)(\d+(?:\.\d+)?)\b/);
    if (bareNumberMatch) {
      const val = Math.round(parseFloat(bareNumberMatch[1]));
      if (val > 0) {
        total = val;
        matchedTokens.push(`${val} QUID (£${val})`);
      }
    }
  }

  if (total > 0) {
    return { totalAmount: total, matchedTokens };
  }
  return null;
}

/**
 * 1985 Minder Keyword-Scanning Free-Text Parser:
 * Ignores conversational filler words and extracts only the actionable keywords,
 * numbers, British slang multipliers, items, and locations from any natural sentence.
 */
export function parseFreeTextCommand(input: string): ParsedCommand {
  const raw = input.trim();
  const lower = raw.toLowerCase().replace(/[!?.,;:'"]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!lower) {
    return { intent: 'UNKNOWN', extractedKeywords: [], raw };
  }

  const extractedKeywords: string[] = [];
  const itemMatch = extractItemKeyword(lower);
  const locMatch = extractLocationKeyword(lower);
  const moneyMatch = extractMoneyFromSentence(raw);

  // 1. Check Help / Dictionary keyword anywhere
  if (/\b(help|dictionary|dict|slang|glossary|manual|commands|ajuda)\b/i.test(lower) || lower === '?') {
    return {
      intent: 'HELP',
      extractedKeywords: ['DICTIONARY / HELP'],
      raw,
    };
  }

  // 2. Check Mr. Smash / Terry Logistics & Minder Keywords anywhere in the sentence
  const hasStopWord = /\b(stop|dont|don't|no more|stand down|leave|wait here|dismiss)\b/i.test(lower);
  const hasMinderWord = /\b(minder|bodyguard|escort|follow me|guard me|watch my back|protect me)\b/i.test(lower);

  if (hasMinderWord) {
    if (hasStopWord) {
      return {
        intent: 'SMASH_STOP_MINDER',
        extractedKeywords: ['STOP', 'MINDER'],
        raw,
      };
    }
    return {
      intent: 'SMASH_MINDER',
      extractedKeywords: ['BE MY MINDER'],
      raw,
    };
  }

  // "collect", "pick up", "fetch" + item anywhere in sentence
  if (/\b(collect|pick up|pickup|fetch|go and get|go get|recolher|buscar)\b/i.test(lower)) {
    // Make sure it's not "collect cash"
    if (!/\b(cash|money|quid|wages|proceeds)\b/i.test(lower)) {
      const targetKey = itemMatch ? itemMatch.key : 'tv';
      extractedKeywords.push('COLLECT', itemMatch ? itemMatch.label : 'ITEM');
      return {
        intent: 'SMASH_COLLECT',
        targetItemKey: targetKey,
        extractedKeywords,
        raw,
      };
    }
  }

  // "deliver", "drop off", "send", "ship" + item anywhere in sentence
  if (/\b(deliver|drop off|send|dispatch|entregar|levar)\b/i.test(lower)) {
    const targetKey = itemMatch ? itemMatch.key : 'tv';
    extractedKeywords.push('DELIVER', itemMatch ? itemMatch.label : 'ITEM');
    return {
      intent: 'SMASH_DELIVER',
      targetItemKey: targetKey,
      extractedKeywords,
      raw,
    };
  }

  // "take cash", "collect cash", "pay smash", "pay terry", "settle up", "wages"
  if (
    /\b(take cash|collect cash|get cash|my cash|my money|pay smash|pay terry|settle up|wages|commission)\b/i.test(
      lower
    )
  ) {
    return {
      intent: 'SMASH_PAY',
      extractedKeywords: ['SETTLE CASH / WAGES'],
      raw,
    };
  }

  // "meet me at ..."
  if (/\b(meet|wait at)\b/i.test(lower) && locMatch) {
    return {
      intent: 'SMASH_MEET',
      targetLocation: locMatch.loc,
      extractedKeywords: ['MEET', locMatch.label],
      raw,
    };
  }

  // 3. Check Sleep / Go to Bed keywords anywhere in sentence
  if (/\b(sleep|bed|turn in|kip|go to sleep|call it a night|dormir)\b/i.test(lower)) {
    return {
      intent: 'SLEEP',
      extractedKeywords: ['SLEEP'],
      raw,
    };
  }

  // 4. Check Monetary Offer anywhere in sentence!
  // In Minder (1985), if you type "Look mate I'll give you 150 quid for those tellies" or "I'm asking 6 ponies",
  // the parser extracts the offer verb/intent and the numerical value!
  if (moneyMatch) {
    const isAsking = /\b(want|asking|ask|sell|selling|take|need)\b/i.test(lower);
    extractedKeywords.push(isAsking ? 'ASKING/WANT' : 'OFFER/GIVE', ...moneyMatch.matchedTokens);
    if (itemMatch) extractedKeywords.push(itemMatch.label);
    return {
      intent: 'OFFER',
      amount: moneyMatch.totalAmount,
      slangUsed: moneyMatch.matchedTokens.join(' + '),
      targetItemKey: itemMatch?.key,
      extractedKeywords,
      raw,
    };
  }

  // 5. Check if user wrote spelled-out numbers without digits (strict 1985 parser rejection rule)
  const writtenFound = WRITTEN_NUMBERS.find((w) => new RegExp(`\\b${w}\\b`, 'i').test(lower));
  if (writtenFound) {
    return {
      intent: 'WRITTEN_NUMBER_ERROR',
      extractedKeywords: [`INVALID WORD NUMBER: "${writtenFound.toUpperCase()}"`],
      raw,
    };
  }

  // 6. Check Reject / Walk Away / Bye keywords anywhere in sentence
  if (
    /\b(bye|goodbye|cheerio|see ya|leave|walk away|forget it|get out|no way|no thanks|not interested|nothing doing|sair)\b/i.test(
      lower
    )
  ) {
    return {
      intent: 'REJECT_BYE',
      extractedKeywords: ['BYE / LEAVE'],
      raw,
    };
  }

  // 7. Check Police / Creditor Fine Payment or Escape keywords anywhere in sentence
  if (/\b(pay fine|cough up|pay up|pay him|settle fine|pagar)\b/i.test(lower) || lower === 'pay') {
    return {
      intent: 'PAY_FINE_OR_DEBT',
      extractedKeywords: ['PAY'],
      raw,
    };
  }

  if (/\b(run|scarper|leg it|bolt|escape|flee|refuse|fugir)\b/i.test(lower)) {
    return {
      intent: 'REFUSE_FINE_OR_DEBT',
      extractedKeywords: ['RUN / REFUSE'],
      raw,
    };
  }

  // 8. Check Acceptance keywords anywhere in sentence ("Yes mate I accept that deal", "Alright deal", "You're on")
  if (
    /\b(accept|agreed|deal|done|youre on|shake on it|ill take it|i will take it|ok|okay|yes|yeah|yep|aceitar)\b/i.test(
      lower
    ) &&
    !/\b(no|not|dont|never)\b/i.test(lower)
  ) {
    return {
      intent: 'ACCEPT',
      extractedKeywords: ['ACCEPT / DEAL'],
      raw,
    };
  }

  // 9. Check Barman Rumour / Pint keywords anywhere in sentence
  if (
    /\b(drink|pint|beer|bitter|vat|ale|round|rumor|rumour|rumours|news|gossip|word|info|tips)\b/i.test(
      lower
    )
  ) {
    return {
      intent: 'RUMOR',
      extractedKeywords: ['DRINK / RUMOUR'],
      raw,
    };
  }

  // 10. Check Movement / Location keywords anywhere in sentence ("I'm going to the warehouse now", "walk to club")
  if (
    locMatch &&
    (/\b(go|goto|walk|head|drive|move|visit|off to|ir)\b/i.test(lower) || lower === locMatch.loc)
  ) {
    return {
      intent: 'GO_TO',
      targetLocation: locMatch.loc,
      extractedKeywords: ['GO TO', locMatch.label],
      raw,
    };
  }

  // 11. Check Looking For / Item Inquiry keywords anywhere in sentence ("I'm looking for some cheap tellies", "got any watches?")
  if (
    itemMatch ||
    /\b(looking for|look for|got any|have you got|searching for|after|stock|what have you got)\b/i.test(
      lower
    )
  ) {
    extractedKeywords.push('LOOKING FOR');
    if (itemMatch) extractedKeywords.push(itemMatch.label);
    return {
      intent: 'LOOKING_FOR',
      targetItemKey: itemMatch?.key || '',
      extractedKeywords,
      raw,
    };
  }

  // 12. Check Ask Price keywords anywhere in sentence ("How much are you asking for the lot?")
  if (/\b(how much|what price|price|quote|cost|damage|asking)\b/i.test(lower)) {
    return {
      intent: 'ASK_PRICE',
      extractedKeywords: ['HOW MUCH / PRICE'],
      raw,
    };
  }

  // If the user just typed a location name in natural text
  if (locMatch) {
    return {
      intent: 'GO_TO',
      targetLocation: locMatch.loc,
      extractedKeywords: ['GO TO', locMatch.label],
      raw,
    };
  }

  return { intent: 'UNKNOWN', extractedKeywords: [], raw };
}

export interface BargainStepResult {
  accepted: boolean;
  aborted: boolean;
  finalOfferTriggered: boolean;
  newPatience: number;
  deltaPatience: number;
  deviationPercent: number;
  newNpcQuote: number;
  agreedPrice?: number;
  npcReply: string;
  mathFormulaText: string;
}

/**
 * Mathematical Bargain Engine:
 * 1. D = |O_player - P_target| / P_target
 * 2. ΔPatience = floor(D * OfferWeight) + 1
 * 3. NewPatience = CurrentPatience - ΔPatience
 */
export function evaluateBargainOffer(
  encounter: ActiveEncounter,
  playerOffer: number
): BargainStepResult {
  const P_target = encounter.targetPrice;
  const O_player = playerOffer;
  const isSellingToPlayer = encounter.tradeRole === 'SELLING_TO_PLAYER';

  // If the player offers terms equal to or better than P_target
  if (
    (isSellingToPlayer && O_player >= P_target) ||
    (!isSellingToPlayer && O_player <= P_target)
  ) {
    return {
      accepted: true,
      aborted: false,
      finalOfferTriggered: false,
      newPatience: encounter.patience,
      deltaPatience: 0,
      deviationPercent: 0,
      newNpcQuote: O_player,
      agreedPrice: O_player,
      npcReply: `"You've got yourself a deal at £${O_player}, Leo my son! Pleasure doing business with a proper gent."`,
      mathFormulaText: `Offer meets target (£${P_target}) → Instant Deal Closed!`,
    };
  }

  // Percentage deviation D = |O_player - P_target| / P_target
  const D = Math.abs(O_player - P_target) / P_target;
  const deviationPercent = Math.round(D * 100);

  // Tolerance threshold: ±10% of target (or ±15% after 2+ rounds of haggling)
  const toleranceThreshold = encounter.rounds >= 2 ? 0.15 : 0.10;

  if (D <= toleranceThreshold) {
    return {
      accepted: true,
      aborted: false,
      finalOfferTriggered: false,
      newPatience: encounter.patience,
      deltaPatience: 0,
      deviationPercent,
      newNpcQuote: O_player,
      agreedPrice: O_player,
      npcReply: `"You drive a hard bargain, Leo... That's within my margin (${deviationPercent}% deviation). Done at £${O_player} quid!"`,
      mathFormulaText: `D = |${O_player} - ${P_target}| / ${P_target} = ${(D * 100).toFixed(1)}% (≤ ${(toleranceThreshold * 100).toFixed(0)}% tolerance) → DEAL CLOSED!`,
    };
  }

  // Patience decay: ΔPatience = floor(D * OfferWeight) + 1
  const weight = encounter.offerWeight || 4;
  const deltaPatience = Math.floor(D * weight) + 1;
  const newPatience = Math.max(0, encounter.patience - deltaPatience);

  const mathFormulaText = `D = |${O_player} - ${P_target}| / ${P_target} = ${D.toFixed(2)} (${deviationPercent}%) | ΔPatience = ⌊${D.toFixed(2)} × ${weight}⌋ + 1 = -${deltaPatience} pts | Patience: ${encounter.patience} → ${newPatience}`;

  // If Patience <= 0: NPC terminates negotiation ("Forget it, mate! Get out!")
  if (newPatience <= 0) {
    return {
      accepted: false,
      aborted: true,
      finalOfferTriggered: false,
      newPatience: 0,
      deltaPatience,
      deviationPercent,
      newNpcQuote: encounter.currentQuote,
      npcReply: `"Forget it, mate! Get out! (£${O_player} is a complete insult—stop wasting my time!)"`,
      mathFormulaText: `${mathFormulaText} → NEGOTIATION BROKEN (Patience ≤ 0)!`,
    };
  }

  // Counter-offer anchored toward P_target
  let nextQuote = encounter.currentQuote;
  if (isSellingToPlayer) {
    const step = Math.max(5, Math.round((encounter.currentQuote - P_target) * 0.45));
    nextQuote = Math.max(P_target, encounter.currentQuote - step);
  } else {
    const step = Math.max(5, Math.round((P_target - encounter.currentQuote) * 0.45));
    nextQuote = Math.min(P_target, encounter.currentQuote + step);
  }

  // If Patience reaches 1: Final Offer locked (Player can only ACCEPT or BYE)
  if (newPatience === 1) {
    return {
      accepted: false,
      aborted: false,
      finalOfferTriggered: true,
      newPatience: 1,
      deltaPatience,
      deviationPercent,
      newNpcQuote: nextQuote,
      npcReply: `"Listen here, Leo: my patience is worn thin! My FINAL OFFER is £${nextQuote} (${Math.round(nextQuote / 25)} ponies). Take it or leave it—type ACCEPT or BYE!"`,
      mathFormulaText: `${mathFormulaText} → FINAL OFFER LOCKED!`,
    };
  }

  const tone =
    D > 0.35
      ? `"£${O_player}?! Leave it out, Leo! Are you having a laugh? That barely covers the lorry fuel!"`
      : `"Come on mate, you'll have to do a bit better than £${O_player}."`;

  const askPhrase = isSellingToPlayer
    ? `I'm asking £${nextQuote} quid. What do you say?`
    : `I can stretch to £${nextQuote} quid for the lot. Deal?`;

  return {
    accepted: false,
    aborted: false,
    finalOfferTriggered: false,
    newPatience,
    deltaPatience,
    deviationPercent,
    newNpcQuote: nextQuote,
    npcReply: `${tone} ${askPhrase}`,
    mathFormulaText,
  };
}

/**
 * Generates daily market lots and NPC rotations (Chingling, Mr. Freak Stain, and Casuals)
 */
export function generateDailyMarket(day: number, elecMultiplier: number, miscMultiplier: number): {
  lots: MarketLot[];
  rumor: string;
} {
  const lots: MarketLot[] = [];

  // 1. Chingling at Chingling's Electricals - Buys & Sells Electricals
  const elecItems = CATALOG_ITEMS.filter((i) => i.type === 'electrical');
  const chinglingSellBase = elecItems[day % elecItems.length];
  const chinglingBuyBase = elecItems[(day + 1) % elecItems.length];

  const sellTarget1 = Math.round(chinglingSellBase.marketValue * 0.78 * elecMultiplier);
  lots.push({
    npcId: 'chingling',
    npcName: 'Chingling',
    originalName: 'Electricals Dealer',
    location: 'chingling_shop',
    role: 'SELLING_TO_PLAYER',
    item: {
      ...chinglingSellBase,
      id: `${chinglingSellBase.shortKey}_day${day}_c`,
      buyPrice: sellTarget1,
    },
    targetPrice: sellTarget1,
    initialQuote: Math.round(sellTarget1 * 1.25),
    patience: 6,
    availableFromHour: 8,
    availableUntilHour: 21,
  });

  const buyTarget1 = Math.round(chinglingBuyBase.marketValue * 1.25 * elecMultiplier);
  lots.push({
    npcId: 'chingling',
    npcName: 'Chingling',
    originalName: 'Electricals Dealer',
    location: 'chingling_shop',
    role: 'BUYING_FROM_PLAYER',
    item: {
      ...chinglingBuyBase,
      id: `demand_${chinglingBuyBase.shortKey}_day${day}`,
      buyPrice: buyTarget1,
    },
    targetPrice: buyTarget1,
    initialQuote: Math.round(buyTarget1 * 0.8),
    patience: 6,
    availableFromHour: 8,
    availableUntilHour: 21,
  });

  // 2. Mr. Freak Stain at Curiosities Shop - Buys & Sells Miscellaneous
  const miscItems = CATALOG_ITEMS.filter((i) => i.type === 'miscellaneous');
  const stainSellBase = miscItems[day % miscItems.length];
  const stainBuyBase = miscItems[(day + 1) % miscItems.length];

  const sellTarget2 = Math.round(stainSellBase.marketValue * 0.75 * miscMultiplier);
  lots.push({
    npcId: 'mr_freak_stain',
    npcName: 'Mr. Freak Stain',
    originalName: 'Curiosities Dealer',
    location: 'freak_stain_shop',
    role: 'SELLING_TO_PLAYER',
    item: {
      ...stainSellBase,
      id: `${stainSellBase.shortKey}_day${day}_f`,
      buyPrice: sellTarget2,
    },
    targetPrice: sellTarget2,
    initialQuote: Math.round(sellTarget2 * 1.28),
    patience: 5,
    availableFromHour: 9,
    availableUntilHour: 22,
  });

  const buyTarget2 = Math.round(stainBuyBase.marketValue * 1.3 * miscMultiplier);
  lots.push({
    npcId: 'mr_freak_stain',
    npcName: 'Mr. Freak Stain',
    originalName: 'Curiosities Dealer',
    location: 'freak_stain_shop',
    role: 'BUYING_FROM_PLAYER',
    item: {
      ...stainBuyBase,
      id: `demand_${stainBuyBase.shortKey}_day${day}`,
      buyPrice: buyTarget2,
    },
    targetPrice: buyTarget2,
    initialQuote: Math.round(buyTarget2 * 0.78),
    patience: 5,
    availableFromHour: 9,
    availableUntilHour: 22,
  });

  // 3. Patrons at The Winchester Club
  const casualNames = ['Mickey "The Boot"', 'Sidney Sparks', 'Bermondsey Bob', 'Alfie "No-Questions"'];
  const casualName = casualNames[day % casualNames.length];

  // Casual 1: Selling cheap parcel at The Winchester Club
  const casualOfferBase = CATALOG_ITEMS[(day + 2) % CATALOG_ITEMS.length];
  const casualSellTarget = Math.round(casualOfferBase.marketValue * 0.65);
  lots.push({
    npcId: 'casual_dealer',
    npcName: casualName,
    originalName: 'Casual Supplier',
    location: 'winchester_club',
    role: 'SELLING_TO_PLAYER',
    item: {
      ...casualOfferBase,
      id: `${casualOfferBase.shortKey}_casual_${day}`,
      buyPrice: casualSellTarget,
    },
    targetPrice: casualSellTarget,
    initialQuote: Math.round(casualSellTarget * 1.22),
    patience: 5,
    availableFromHour: 6,
    availableUntilHour: 27,
  });

  // Casual 2: Eager fence/buyer at The Winchester Club
  const casualBuyerBase = day === 1 ? CATALOG_ITEMS[0] : CATALOG_ITEMS[(day + 1) % CATALOG_ITEMS.length];
  const casualBuyTarget = Math.round(casualBuyerBase.marketValue * 1.35);
  lots.push({
    npcId: 'casual_dealer',
    npcName: 'Nobby "Cash" Clarke',
    originalName: 'Casual Buyer (Fence)',
    location: 'winchester_club',
    role: 'BUYING_FROM_PLAYER',
    item: {
      ...casualBuyerBase,
      id: `buyer_${casualBuyerBase.shortKey}_${day}`,
      buyPrice: casualBuyTarget,
    },
    targetPrice: casualBuyTarget,
    initialQuote: Math.round(casualBuyTarget * 0.82),
    patience: 6,
    availableFromHour: 6,
    availableUntilHour: 27,
  });

  const rumor = `Thomas Beer leans across the bar: "Word on the street is ${casualName} is shifting ${casualOfferBase.name} right here in the club for around £${casualSellTarget} quid, and Nobby Clarke will pay up to £${casualBuyTarget} for ${casualBuyerBase.name}! Also, Chingling is after ${chinglingBuyBase.name} (~£${buyTarget1})."`;

  return { lots, rumor };
}

const BAR_PATRON_POOL: Array<{
  npcId: 'casual_dealer' | 'chingling' | 'mr_freak_stain';
  npcName: string;
  originalName: string;
}> = [
  { npcId: 'casual_dealer', npcName: 'Mickey "The Boot"', originalName: 'Casual Supplier' },
  { npcId: 'casual_dealer', npcName: 'Sidney Sparks', originalName: 'Club Trader' },
  { npcId: 'casual_dealer', npcName: 'Bermondsey Bob', originalName: 'Street Wholesaler' },
  { npcId: 'casual_dealer', npcName: 'Alfie "No-Questions"', originalName: 'Backroom Dealer' },
  { npcId: 'casual_dealer', npcName: 'Nobby "Cash" Clarke', originalName: 'Club Fence' },
  { npcId: 'casual_dealer', npcName: 'Frankie "The Fence" Fraser', originalName: 'East End Buyer' },
  { npcId: 'casual_dealer', npcName: 'Ronnie "Gold" Knight', originalName: 'West End Contact' },
  { npcId: 'casual_dealer', npcName: 'Lenny "Lucky" Lock', originalName: 'Lock-up Broker' },
  { npcId: 'casual_dealer', npcName: 'Bazza "Two-Sheds" Barnes', originalName: 'Lorry Driver' },
  { npcId: 'casual_dealer', npcName: 'Vinnie "Velvet" Vance', originalName: 'Soho Collector' },
  { npcId: 'chingling', npcName: 'Chingling (Off-Duty Pint)', originalName: 'Electricals Dealer' },
  { npcId: 'mr_freak_stain', npcName: 'Mr. Freak Stain (At the Bar)', originalName: 'Curiosities Dealer' },
];

/**
 * Rotates patrons randomly at The Winchester Club when the player passes 1 hour at the bar.
 */
export function rotateWinchesterClubPatrons(
  day: number,
  currentHour: number,
  elecMultiplier: number,
  miscMultiplier: number,
  existingLots: MarketLot[]
): {
  updatedLots: MarketLot[];
  newRumor: string;
  arrivedNames: string[];
} {
  // Keep non-Winchester Club lots intact
  const nonClubLots = existingLots.filter((lot) => lot.location !== 'winchester_club');

  // Avoid repeating the exact same patron names that were just at the bar if possible
  const previousNames = new Set(
    existingLots.filter((lot) => lot.location === 'winchester_club').map((l) => l.npcName)
  );
  const candidatePool = BAR_PATRON_POOL.filter((p) => !previousNames.has(p.npcName));
  const poolToUse = candidatePool.length >= 3 ? candidatePool : BAR_PATRON_POOL;

  // Shuffle pool randomly
  const shuffledPatrons = [...poolToUse].sort(() => Math.random() - 0.5);
  // Spawn 2 or 3 random patrons at the bar
  const count = Math.random() < 0.55 ? 2 : 3;
  const chosenPatrons = shuffledPatrons.slice(0, count);

  // Shuffle catalog items so different wares are offered/sought
  const shuffledItems = [...CATALOG_ITEMS].sort(() => Math.random() - 0.5);
  const newClubLots: MarketLot[] = [];

  chosenPatrons.forEach((patron, idx) => {
    const baseItem = shuffledItems[idx % shuffledItems.length];
    const mult = baseItem.type === 'electrical' ? elecMultiplier : miscMultiplier;
    // Guarantee at least 1 seller and 1 buyer, with optional 3rd random role
    const role: 'SELLING_TO_PLAYER' | 'BUYING_FROM_PLAYER' =
      idx === 0
        ? 'SELLING_TO_PLAYER'
        : idx === 1
        ? 'BUYING_FROM_PLAYER'
        : Math.random() < 0.5
        ? 'SELLING_TO_PLAYER'
        : 'BUYING_FROM_PLAYER';

    if (role === 'SELLING_TO_PLAYER') {
      const discount = 0.62 + Math.random() * 0.16; // 62% to 78% of market value
      const targetPrice = Math.max(40, Math.round(baseItem.marketValue * discount * mult));
      const initialQuote = Math.round(targetPrice * (1.2 + Math.random() * 0.1));
      newClubLots.push({
        npcId: patron.npcId,
        npcName: patron.npcName,
        originalName: patron.originalName,
        location: 'winchester_club',
        role: 'SELLING_TO_PLAYER',
        item: {
          ...baseItem,
          id: `${baseItem.shortKey}_bar_${day}_${currentHour}_${idx}`,
          buyPrice: targetPrice,
        },
        targetPrice,
        initialQuote,
        patience: 5 + (idx % 2),
        availableFromHour: 6,
        availableUntilHour: 27,
      });
    } else {
      const premium = 1.22 + Math.random() * 0.22; // 122% to 144% of market value
      const targetPrice = Math.max(60, Math.round(baseItem.marketValue * premium * mult));
      const initialQuote = Math.round(targetPrice * (0.78 + Math.random() * 0.06));
      newClubLots.push({
        npcId: patron.npcId,
        npcName: patron.npcName,
        originalName: patron.originalName,
        location: 'winchester_club',
        role: 'BUYING_FROM_PLAYER',
        item: {
          ...baseItem,
          id: `demand_${baseItem.shortKey}_bar_${day}_${currentHour}_${idx}`,
          buyPrice: targetPrice,
        },
        targetPrice,
        initialQuote,
        patience: 5 + (idx % 2),
        availableFromHour: 6,
        availableUntilHour: 27,
      });
    }
  });

  const sellerLot = newClubLots.find((l) => l.role === 'SELLING_TO_PLAYER');
  const buyerLot = newClubLots.find((l) => l.role === 'BUYING_FROM_PLAYER');

  const newRumor = `Thomas Beer wipes down the counter: "New faces just walked into the bar, Leo! ${
    sellerLot
      ? `${sellerLot.npcName} is quietly offering ${sellerLot.item.name} (~£${sellerLot.targetPrice} quid)`
      : ''
  }${sellerLot && buyerLot ? ', and ' : ''}${
    buyerLot
      ? `${buyerLot.npcName} is looking to buy ${buyerLot.item.name} for up to £${buyerLot.targetPrice} quid!`
      : '!'
  }"`;

  return {
    updatedLots: [...nonClubLots, ...newClubLots],
    newRumor,
    arrivedNames: chosenPatrons.map((p) => p.npcName),
  };
}

export function formatGameHour(hour: number): { formatted: string; isNight: boolean; periodLabel: string } {
  const normalized = hour >= 24 ? hour - 24 : hour;
  const hh = String(normalized).padStart(2, '0');
  const isNight = hour >= 18 || hour < 6;
  const periodLabel =
    hour >= 24
      ? 'LATE NIGHT (03:00h Curfew Risk)'
      : isNight
      ? 'NIGHT SHIFT (High Police Patrols)'
      : 'DAYTIME (Shops Open)';
  return {
    formatted: `${hh}:00`,
    isNight,
    periodLabel,
  };
}
