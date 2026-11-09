import React, { useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { CHARACTER_SPRITES, LOCATION_SPECS } from '../config/sprites';
import { ColorSprite } from './ColorSprite';
import { NpcId } from '../types/game';

export interface DictionaryEntry {
  term: string;
  category: 'Monetary Slang' | 'Underworld & Trade' | 'Parser Commands';
  valueOrSyntax: string;
  definition: string;
  example: string;
}

export const GAME_DICTIONARY_ENTRIES: DictionaryEntry[] = [
  // 1. Monetary Slang
  {
    term: 'Quid / Sov / Nicker / XX',
    category: 'Monetary Slang',
    valueOrSyntax: '£1 (1 Pound Sterling)',
    definition:
      'Standard British slang for one pound sterling. In the 1985 ZX Spectrum parser, "quid", "sov" (sovereign), or "XX" all represent £1.',
    example: '"offer 150 quid" or "150 sovs" (= £150)',
  },
  {
    term: 'Fiver',
    category: 'Monetary Slang',
    valueOrSyntax: '£5',
    definition: 'A five-pound note. Multiplies any preceding digit by 5.',
    example: '"offer 3 fivers" (= £15) or "a fiver" (= £5)',
  },
  {
    term: 'Tenner',
    category: 'Monetary Slang',
    valueOrSyntax: '£10',
    definition: 'A ten-pound note. Multiplies any preceding digit by 10.',
    example: '"offer 14 tenners" (= £140) or "a tenner" (= £10)',
  },
  {
    term: 'Score',
    category: 'Monetary Slang',
    valueOrSyntax: '£20',
    definition: 'Traditional London market slang for twenty pounds.',
    example: '"offer 7 scores" (= £140) or "a score" (= £20)',
  },
  {
    term: 'Pony / Ponies',
    category: 'Monetary Slang',
    valueOrSyntax: '£25',
    definition:
      'Classic Cockney & turf slang for twenty-five pounds. Frequently used by London dealers when quoting wholesale lots.',
    example: '"offer 6 ponies" (= £150) or "im asking a pony" (= £25)',
  },
  {
    term: 'Ton / Century',
    category: 'Monetary Slang',
    valueOrSyntax: '£100',
    definition: 'One hundred pounds sterling.',
    example: '"offer 2 tons" (= £200) or "a ton" (= £100)',
  },
  {
    term: 'Monkey',
    category: 'Monetary Slang',
    valueOrSyntax: '£500',
    definition:
      'Five hundred pounds sterling (originating from the 500-rupee note in colonial India featuring a monkey).',
    example: '"offer a monkey" (= £500)',
  },
  {
    term: 'Grand',
    category: 'Monetary Slang',
    valueOrSyntax: '£1,000',
    definition: 'One thousand pounds sterling.',
    example: '"1 grand" (= £1,000)',
  },

  // 2. Underworld & Trade Terms
  {
    term: 'Minder',
    category: 'Underworld & Trade',
    valueOrSyntax: 'Bodyguard & Enforcer (Mr. Smash)',
    definition:
      'London underworld slang for a personal bodyguard hired to protect a trader from street muggers, creditors, and police scrutiny.',
    example: 'Type "be my minder" so Mr. Smash escorts Leo Smith across London.',
  },
  {
    term: 'The Lock-up',
    category: 'Underworld & Trade',
    valueOrSyntax: 'Private Warehouse / Garage',
    definition:
      'A rented lock-up garage used to store merchandise off the books. Goods inside the Lock-up cannot be confiscated by Sheriff Cage.',
    example: 'Stash contraband in The Lock-up before walking the streets at night.',
  },
  {
    term: 'Car Boot',
    category: 'Underworld & Trade',
    valueOrSyntax: 'Personal Inventory (Max 2 Lots)',
    definition:
      'British English for the trunk of a car. Leo Smith carries immediate trade parcels in his car boot, which is vulnerable to police checks.',
    example: 'Keep your car boot clean when Police Heat is above 75/100.',
  },
  {
    term: 'Dodgy Gear / Contraband',
    category: 'Underworld & Trade',
    valueOrSyntax: 'Illicit Merchandise',
    definition:
      'Goods of dubious origin ("fell off the back of a lorry"). High profit margins, but triggers heavy fines if Sheriff Cage stops you.',
    example: '14" Colour Tellies, Swiss Watches, Mink Coats, and Scotch Whisky.',
  },
  {
    term: 'Telly / Tellies',
    category: 'Underworld & Trade',
    valueOrSyntax: 'Television Sets (shortKey: tv)',
    definition: 'Colloquial British term for television sets—one of the most traded electrical items.',
    example: '"collect tv" or "collect tellies"',
  },
  {
    term: 'Spots',
    category: 'Underworld & Trade',
    valueOrSyntax: 'Curiosities / Odd Lots (shortKey: spots)',
    definition:
      'Term used for miscellaneous antique ornaments, porcelain figurines, and spot-market oddities traded by Mr. Freak Stain.',
    example: '"deliver spots"',
  },
  {
    term: 'Fence',
    category: 'Underworld & Trade',
    valueOrSyntax: 'Receiver of Goods',
    definition:
      'A dealer or casual buyer who purchases wholesale or contraband lots with no questions asked (such as Nobby "Cash" Clarke).',
    example: 'Check The Winchester Club daily for casual fences.',
  },
  {
    term: 'The Law (Sheriff Cage)',
    category: 'Underworld & Trade',
    valueOrSyntax: 'Police Inspector',
    definition:
      'Local detective determined to catch Leo Smith red-handed with dodgy merchandise. Driven by the Police Heat meter (0–100).',
    example: 'Buy a pint from Thomas Beer ("drink") to lower Police Heat.',
  },
  {
    term: 'Cash Crunch (Logistics Catch)',
    category: 'Underworld & Trade',
    valueOrSyntax: 'Held Delivery Proceeds',
    definition:
      'When Mr. Smash delivers goods directly from the Lock-up to a buyer, the cash stays in his pocket until you physically meet him and run "take cash".',
    example: 'Meet Mr. Smash at The Winchester Club and type "take cash".',
  },
  {
    term: 'Bankroll',
    category: 'Underworld & Trade',
    valueOrSyntax: 'Working Capital (£)',
    definition:
      'Your liquid cash on hand. Starts at £2,000.00 with a 7-day target goal of £3,500.00.',
    example: 'Keep enough bankroll liquid to pay Mr. Smash’s wages and sudden fines.',
  },

  // 3. Parser Commands
  {
    term: 'offer <amount> [slang]',
    category: 'Parser Commands',
    valueOrSyntax: 'Haggling Bid (Buying)',
    definition:
      'Submits a price offer to a seller using digits and optional British monetary slang. Never spell numbers out in words!',
    example: '"offer 135 quid" or "offer 5 ponies"',
  },
  {
    term: 'want <amount> [slang]',
    category: 'Parser Commands',
    valueOrSyntax: 'Asking Price (Selling)',
    definition: 'States the price you demand when selling a lot to a buyer.',
    example: '"want 210 quid" or "im asking 8 ponies"',
  },
  {
    term: 'accept / bye',
    category: 'Parser Commands',
    valueOrSyntax: 'Close or Walk Away',
    definition:
      '"accept" closes the deal at the NPC’s current quote on the table. "bye" ends the conversation (consuming +1 hour).',
    example: '"accept" or "bye"',
  },
  {
    term: 'collect <item> / deliver <item>',
    category: 'Parser Commands',
    valueOrSyntax: 'Mr. Smash Logistics Orders',
    definition:
      '"collect <item>" dispatches Mr. Smash to buy and stash a lot in the Lock-up. "deliver <item>" sends him to sell a Lock-up item to a buyer.',
    example: '"collect tv" or "deliver watches"',
  },
  {
    term: 'take cash / pay smash',
    category: 'Parser Commands',
    valueOrSyntax: 'Settle Up with Mr. Smash',
    definition:
      'Collects any sale proceeds held by Mr. Smash and pays his outstanding commission fee.',
    example: '"take cash"',
  },
];

interface ReferenceModalProps {
  isOpen: boolean;
  initialTab?: 'dictionary' | 'sprites';
  onClose: () => void;
}

export const ReferenceModal: React.FC<ReferenceModalProps> = ({
  isOpen,
  initialTab = 'dictionary',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'dictionary' | 'sprites'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    'ALL' | 'Monetary Slang' | 'Underworld & Trade' | 'Parser Commands'
  >('ALL');

  // Sync tab when prop changes
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const spriteKeys = Object.keys(CHARACTER_SPRITES) as NpcId[];

  const filteredEntries = GAME_DICTIONARY_ENTRIES.filter((entry) => {
    const matchesCat = categoryFilter === 'ALL' || entry.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesCat;
    return (
      matchesCat &&
      (entry.term.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q) ||
        entry.valueOrSyntax.toLowerCase().includes(q) ||
        entry.example.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Game Dictionary & Manual
              </h2>
            </div>
            <button
              onClick={onClose}
              className="sm:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('dictionary')}
                className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'dictionary'
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Dictionary ({GAME_DICTIONARY_ENTRIES.length})
              </button>
              <button
                onClick={() => setActiveTab('sprites')}
                className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'sprites'
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Sprites v1 (Colors)
              </button>
            </div>

            <button
              onClick={onClose}
              className="hidden sm:flex p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {activeTab === 'dictionary' ? (
            <div className="space-y-5">
              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search terms (pony, monkey, quid, minder, lock-up)..."
                    className="w-full min-h-[44px] pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-base sm:text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto">
                  {(
                    [
                      'ALL',
                      'Monetary Slang',
                      'Underworld & Trade',
                      'Parser Commands',
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`min-h-[38px] sm:min-h-0 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        categoryFilter === cat
                          ? 'bg-slate-800 text-amber-400 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat === 'ALL' ? 'All Entries' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dictionary Glossary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredEntries.map((item) => (
                  <div
                    key={item.term}
                    className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-bold text-amber-400 font-mono text-sm">
                          {item.term}
                        </span>
                        <span className="text-xs font-mono text-emerald-400">
                          {item.valueOrSyntax}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Category: {item.category}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {item.definition}
                      </p>
                    </div>
                    <div className="pt-2 mt-1 border-t border-slate-900 text-[11px] font-mono text-sky-300">
                      Example: {item.example}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bargain Math Reference Box */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <h3 className="text-xs font-semibold text-amber-400 font-mono">
                  Haggling Mathematical Engine (Live Formula)
                </h3>
                <p className="text-xs text-slate-300 font-mono break-words">
                  D = |O_player - P_target| / P_target &nbsp;&nbsp;·&nbsp;&nbsp; ΔPatience = ⌊D × Weight⌋ + 1 &nbsp;&nbsp;·&nbsp;&nbsp; NewPatience = Patience - ΔPatience
                </p>
                <p className="text-xs text-slate-400">
                  Offers within ±10% of the NPC’s target price (or ±15% after 2 rounds) close the deal. If Patience drops to 1, the NPC locks a <strong>Final Offer</strong> (only <code>ACCEPT</code> or <code>BYE</code> allowed). At 0, the NPC kicks you out and +1 hour elapses!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-slate-300 leading-relaxed">
                  <strong>Version 1.0</strong> uses <strong>8x8 Color-Coded Attribute Block Sprites</strong> inspired by the 1985 ZX Spectrum. Every character, location, and item in <code>src/config/sprites.ts</code> includes a dedicated <code>pixelArtUrl</code> slot ready for seamless Pixel Art replacement in Version 2.0.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-100 mb-3">
                  01. Character Cast (The Trader)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {spriteKeys.map((key) => {
                    const spec = CHARACTER_SPRITES[key];
                    return (
                      <div
                        key={spec.id}
                        className="flex items-start gap-3.5 p-3.5 rounded-lg bg-slate-950/90 border border-slate-800"
                      >
                        <ColorSprite npcId={key} size="md" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-semibold text-slate-100 break-words">
                              {spec.name}
                            </span>
                            <span className="text-xs font-mono text-amber-400">
                              {spec.codeTag}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 break-words">
                            Role: {spec.originalRef}
                          </p>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {spec.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
                            <span className="flex items-center gap-1">
                              <span
                                className="inline-block w-3 h-3 rounded-xs border border-white/20"
                                style={{ backgroundColor: spec.primaryColor }}
                              />
                              {spec.primaryColor}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1">
                              <span
                                className="inline-block w-3 h-3 rounded-xs border border-white/20"
                                style={{ backgroundColor: spec.secondaryColor }}
                              />
                              {spec.secondaryColor}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1">
                              <span
                                className="inline-block w-3 h-3 rounded-xs border border-white/20"
                                style={{ backgroundColor: spec.accentColor }}
                              />
                              {spec.accentColor}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-100 mb-3">
                  02. Location Color Coding (Day vs. Night Palette)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.values(LOCATION_SPECS).map((loc) => (
                    <div
                      key={loc.id}
                      className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-100 text-xs">
                          {loc.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {loc.codeTag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{loc.originalName}</p>
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span
                          className="px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: loc.dayBgHex }}
                        >
                          Day {loc.dayBgHex}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-slate-200 border border-slate-700"
                          style={{ backgroundColor: loc.nightBgHex }}
                        >
                          Night {loc.nightBgHex}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
