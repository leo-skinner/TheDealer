import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Car,
  Clock,
  Home,
  MapPin,
  Package,
  Send,
  Shield,
  Terminal,
  Truck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ColorSprite, ItemColorBlock } from './components/ColorSprite';
import { ReferenceModal } from './components/ReferenceModal';
import { TypewriterLogEntry, TypewriterMessage } from './components/TypewriterMessage';
import { LOCATION_SPECS } from './config/sprites';
import {
  evaluateBargainOffer,
  formatGameHour,
  generateDailyMarket,
  parseFreeTextCommand,
  rotateWinchesterClubPatrons,
} from './services/bargainEngine';
import { soundFX } from './services/sound';
import {
  clearSavedGame,
  createInitialGameState,
  hasSavedGame,
  loadSavedGame,
  saveGameState,
} from './services/storageService';
import {
  ActiveEncounter,
  DialogueEntry,
  GameState,
  LocationId,
  MarketLot,
  PendingDeal,
  TradeItem,
} from './types/game';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = loadSavedGame();
    return saved || createInitialGameState();
  });

  const [commandInput, setCommandInput] = useState('');
  const [refModal, setRefModal] = useState<{ open: boolean; tab: 'dictionary' | 'sprites' }>({
    open: false,
    tab: 'dictionary',
  });
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<
    'stage' | 'logistics' | 'mobile_map'
  >('stage');
  const [saveExists, setSaveExists] = useState<boolean>(() => hasSavedGame());

  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Ensure the top of the screen appears first when starting/loading the game
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  // Auto-save on state change
  useEffect(() => {
    saveGameState(gameState);
    setSaveExists(true);
  }, [gameState]);

  // Scroll only the internal console container, never the whole page viewport
  const scrollTranscriptToBottom = () => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!transcriptContainerRef.current) return;
    if (gameState.activeEncounter) {
      scrollTranscriptToBottom();
    } else {
      // Keep the newest event log at the top visible while it types out
      transcriptContainerRef.current.scrollTop = 0;
    }
  }, [gameState.activeEncounter, gameState.activeEncounter?.transcript, gameState.logs]);

  const { formatted: formattedHour, isNight, periodLabel } = formatGameHour(gameState.player.hour);
  const currentLocSpec = LOCATION_SPECS[gameState.player.currentLocation];

  // Check if current shop is open
  const isCurrentLocationOpen =
    gameState.player.hour >= currentLocSpec.openHour &&
    gameState.player.hour < currentLocSpec.closeHour;

  // Lots available at current location and current hour
  const availableLotsHere = gameState.world.dailyLots.filter(
    (lot) =>
      lot.location === gameState.player.currentLocation &&
      gameState.player.hour >= lot.availableFromHour &&
      gameState.player.hour < lot.availableUntilHour
  );

  // Is Mr. Smash physically in the same location as Leo Smith?
  const isSmashHere =
    gameState.world.terryStatus.isFollowing ||
    gameState.world.terryStatus.location === gameState.player.currentLocation ||
    gameState.player.currentLocation === 'smash_flat';

  // Helper to append dialogue in activeEncounter
  const createDialogue = (
    speaker: 'PLAYER' | 'NPC' | 'SYSTEM',
    speakerName: string,
    text: string,
    mathDebug?: string
  ): DialogueEntry => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    speaker,
    speakerName,
    text,
    timestamp: formattedHour,
    mathDebug,
  });

  /**
   * Advances the global game clock by +hours (Time Engine)
   * Every movement between locations rolls a Police Car Boot Search check based on Police Heat!
   */
  const advanceTimeEngine = (
    baseState: GameState,
    hoursToAdvance: number,
    destination?: LocationId,
    reasonLog?: string
  ): GameState => {
    const next = structuredClone(baseState);
    const prevLocation = next.player.currentLocation;
    const targetLocation = destination || prevLocation;

    next.player.hour += hoursToAdvance;
    next.player.currentLocation = targetLocation;

    if (reasonLog) {
      next.logs = [
        `[${formatGameHour(next.player.hour).formatted}] ${reasonLog}`,
        ...next.logs.slice(0, 35),
      ];
    }

    // If Mr. Smash is escorting Leo, he moves along; otherwise he stays at his own flat ('smash_flat')
    if (next.world.terryStatus.isFollowing) {
      next.world.terryStatus.location = targetLocation;
    } else {
      next.world.terryStatus.location = 'smash_flat';
    }

    // Update Police Heat dynamically depending on whether the Car Boot has contraband or is clean
    const illicitCarriedCount = next.player.inventory.filter((i) => i.isIllicit).length;
    if (illicitCarriedCount > 0 && targetLocation !== 'warehouse' && targetLocation !== 'apartment') {
      const nightRisk = next.player.hour >= 18 ? 9 : 5;
      next.world.policeHeat = Math.min(
        100,
        next.world.policeHeat + illicitCarriedCount * nightRisk
      );
    } else {
      // Driving with a clean car boot gradually lowers Police Heat
      next.world.policeHeat = Math.max(5, next.world.policeHeat - 4);
    }

    // Check critical curfew limit (03:00 AM = hour >= 27)
    if (next.player.hour >= 27) {
      soundFX.playDealRejected(next.soundEnabled);
      next.logs = [
        `[03:00 AM CURFEW] Exhaustion! Past 03:00 AM — Leo Smith (You) had to drive straight home to rest (-£45).`,
        ...next.logs,
      ];
      next.player.bankroll = Math.max(0, next.player.bankroll - 45);
      return performSleepTransition(next, true);
    }

    // POLICE CAR BOOT SEARCH (STOP & SEARCH) during travel between locations!
    // Probability increases or decreases directly according to Police Heat (0–100%).
    if (destination && destination !== prevLocation) {
      const roll = Math.random() * 100;
      const effectiveStopChance = next.world.terryStatus.isFollowing
        ? Math.round(next.world.policeHeat * 0.6)
        : next.world.policeHeat;

      if (roll < effectiveStopChance) {
        if (illicitCarriedCount > 0) {
          // Caught red-handed with contraband in the Car Boot!
          soundFX.playPoliceSiren(next.soundEnabled);
          const fineAmount = 160 + illicitCarriedCount * 85;
          const contrabandFound = next.player.inventory.find((i) => i.isIllicit);
          next.activeEncounter = {
            npcId: 'sheriff_cage',
            npcName: 'Sheriff Cage',
            originalName: 'The Law (Car Boot Search)',
            npcType: 'police',
            tradeRole: 'POLICE_CHECK',
            itemInPlay: contrabandFound || null,
            patience: 3,
            maxPatience: 3,
            targetPrice: fineAmount,
            currentQuote: fineAmount,
            offerWeight: 5,
            rounds: 0,
            finalOfferLocked: false,
            negotiationActive: true,
            transcript: [
              createDialogue(
                'NPC',
                'Sheriff Cage',
                `"Pull over, Leo! Police Stop & Search (Heat: ${next.world.policeHeat}%)! Let's open that Car Boot... Well, well! What are you doing driving around with ${contrabandFound?.name}?! Pay an immediate fine of £${fineAmount} quid (type PAY), offer a sweetener, or I'm confiscating everything in your boot!"`
              ),
            ],
          };
          next.mode = 'CONVERSATION';
          return next;
        } else {
          // Police stopped and searched the car, but the Car Boot had no contraband!
          soundFX.playBeep(440, 0.08, 'square', next.soundEnabled);
          next.world.policeHeat = Math.max(5, next.world.policeHeat - 8);
          next.logs = [
            `[POLICE CAR SEARCH] Sheriff Cage pulled your car over en route to ${LOCATION_SPECS[targetLocation].name} (Heat was ${effectiveStopChance}%) and searched your Car Boot! Finding no contraband inside, he waved you through (Heat -8%).`,
            ...next.logs,
          ];
        }
      }
    }

    // Check Game Over or Victory conditions
    if (
      next.player.bankroll <= 0 &&
      next.player.inventory.length === 0 &&
      next.player.warehouseInventory.length === 0 &&
      next.player.pendingDeals.length === 0
    ) {
      next.mode = 'GAME_OVER';
    } else if (next.player.bankroll >= next.player.targetGoal) {
      next.mode = 'VICTORY';
    }

    return next;
  };

  /**
   * Sleeping at Leo Smith's Flat: advances clock to 06:00 AM next day, refreshes market & saves.
   */
  const performSleepTransition = (baseState: GameState, forced = false): GameState => {
    const next = structuredClone(baseState);
    next.player.day += 1;
    next.player.hour = 6; // 06:00 AM
    next.player.currentLocation = 'apartment';
    next.activeEncounter = null;

    // Daily market index fluctuation
    const newElecMult = Number((0.85 + Math.random() * 0.55).toFixed(2));
    const newMiscMult = Number((0.85 + Math.random() * 0.55).toFixed(2));
    next.world.marketPrices = {
      electrical: newElecMult,
      miscellaneous: newMiscMult,
    };

    const { lots, rumor } = generateDailyMarket(next.player.day, newElecMult, newMiscMult);
    next.world.dailyLots = lots;
    next.world.winchesterRumor = rumor;
    next.world.policeHeat = Math.max(10, Math.round(next.world.policeHeat * 0.55));

    // Daily flat overhead / living expenses
    const dailyCost = 30;
    next.player.bankroll = Math.max(0, next.player.bankroll - dailyCost);

    next.logs = [
      `[06:00 - DAY ${next.player.day}] ${
        forced ? 'Woke up after late-night exhaustion.' : 'Rested well at your flat.'
      } Daily overheads: -£${dailyCost}. Fresh stock has arrived at the shops and The Winchester Club!`,
      ...next.logs.slice(0, 35),
    ];

    if (next.player.day > next.player.maxDays && next.player.bankroll < next.player.targetGoal) {
      next.mode = 'GAME_OVER';
    } else if (next.player.bankroll >= next.player.targetGoal) {
      next.mode = 'VICTORY';
    } else {
      next.mode = 'MAIN_HUB';
    }

    return next;
  };

  /**
   * Move between locations manually (Consumes +1 Hour & risks Police Car Boot Search)
   */
  const handleMoveToLocation = (dest: LocationId) => {
    if (dest === gameState.player.currentLocation) {
      setActiveWorkspaceView('stage');
      return;
    }
    soundFX.playStep(gameState.soundEnabled);
    setGameState((prev) => {
      const cleaned = { ...prev, activeEncounter: null, mode: 'MAIN_HUB' as const };
      return advanceTimeEngine(
        cleaned,
        1,
        dest,
        `Drove to ${LOCATION_SPECS[dest].name} (+1h).`
      );
    });
    setActiveWorkspaceView('stage');
  };

  /**
   * Pass 1 Hour at The Winchester Club (Bar): advances clock +1h and spawns new random patrons at the bar
   */
  const handlePassHourAtBar = () => {
    if (gameState.player.currentLocation !== 'winchester_club') return;
    soundFX.playBeep(460, 0.08, 'triangle', gameState.soundEnabled);

    setGameState((prev) => {
      const cleaned = { ...prev, activeEncounter: null, mode: 'MAIN_HUB' as const };
      const nextHour = cleaned.player.hour + 1;
      const { updatedLots, newRumor, arrivedNames } = rotateWinchesterClubPatrons(
        cleaned.player.day,
        nextHour,
        cleaned.world.marketPrices.electrical,
        cleaned.world.marketPrices.miscellaneous,
        cleaned.world.dailyLots
      );

      cleaned.world.dailyLots = updatedLots;
      cleaned.world.winchesterRumor = newRumor;

      return advanceTimeEngine(
        cleaned,
        1,
        undefined,
        `Passed 1 hour at The Winchester Club (+1h). New patrons walked into the bar: ${arrivedNames.join(
          ', '
        )}!`
      );
    });
  };

  /**
   * Start conversation with an NPC (The NPC introduces themselves and pitches their wares via typewriter!)
   */
  const handleStartLotNegotiation = (lot: MarketLot) => {
    soundFX.playBeep(520, 0.07, 'square', gameState.soundEnabled);

    const isSellingToPlayer = lot.role === 'SELLING_TO_PLAYER';
    const inCarBoot = gameState.player.inventory.some((i) => i.shortKey === lot.item.shortKey);
    const inLockup = gameState.player.warehouseInventory.some(
      (i) => i.shortKey === lot.item.shortKey
    );

    const openingLine = isSellingToPlayer
      ? `"Alright Leo! Step closer and listen to this: I've got a prime parcel of ${
          lot.item.name
        } (${
          lot.item.isIllicit ? 'Dodgy Contraband — keep it away from Sheriff Cage!' : 'Legit Gear'
        }). I'M ASKING £${lot.initialQuote} quid (${Math.round(
          lot.initialQuote / 25
        )} ponies) for the lot. What's your offer?"`
      : inCarBoot
      ? `"Hello Leo! Word is you've got ${lot.item.name} right outside in your Car Boot! I'm offering £${lot.initialQuote} quid (${Math.round(
          lot.initialQuote / 25
        )} ponies) cash on the spot. Or tell me how much you want!"`
      : inLockup
      ? `"Hello Leo! I'm looking to buy ${lot.item.name}. I hear you've got a lot stashed in your Lock-up! Let's agree on a price first — I'm offering £${lot.initialQuote} quid. Once we shake on it, you'll need to drive to your Lock-up, load it into your Car Boot, and drop it off at Mr. Smash's Flat (5% delivery commission)!"`
      : `"Hello Leo! Today I'm in the market to buy ${lot.item.name} — I can pay around £${lot.initialQuote} to £${lot.targetPrice} quid. We can lock in a deal right now, and then you go pick up the merchandise at the shop or Lock-up and deliver it to Mr. Smash's Flat (5% commission)!"`;

    const encounter: ActiveEncounter = {
      npcId: lot.npcId,
      npcName: lot.npcName,
      originalName: lot.originalName,
      npcType: lot.npcId === 'casual_dealer' ? 'casual' : 'merchant',
      tradeRole: lot.role,
      itemInPlay: lot.item,
      patience: lot.patience,
      maxPatience: lot.patience,
      targetPrice: lot.targetPrice,
      currentQuote: lot.initialQuote,
      offerWeight: 4,
      rounds: 0,
      finalOfferLocked: false,
      negotiationActive: true,
      transcript: [createDialogue('NPC', lot.npcName, openingLine)],
    };

    setGameState((prev) => ({
      ...prev,
      mode: 'CONVERSATION',
      activeEncounter: encounter,
    }));
    setActiveWorkspaceView('stage');
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  /**
   * Talk to Thomas Beer at The Winchester Club
   */
  const handleTalkToThomasBeer = () => {
    soundFX.playBeep(480, 0.07, 'square', gameState.soundEnabled);
    const encounter: ActiveEncounter = {
      npcId: 'thomas_beer',
      npcName: 'Thomas Beer',
      originalName: 'Winchester Club Barman',
      npcType: 'barman',
      tradeRole: 'BAR_CHAT',
      itemInPlay: null,
      patience: 10,
      maxPatience: 10,
      targetPrice: 15,
      currentQuote: 15,
      offerWeight: 1,
      rounds: 0,
      finalOfferLocked: false,
      negotiationActive: true,
      transcript: [
        createDialogue(
          'NPC',
          'Thomas Beer',
          `"Afternoon, Leo! Usual large VAT? ${gameState.world.winchesterRumor} (Type 'drink' to buy a round for £15 and cool down Police Heat, or 'bye' to step away from the bar)."`
        ),
      ],
    };
    setGameState((prev) => ({
      ...prev,
      mode: 'CONVERSATION',
      activeEncounter: encounter,
    }));
    setActiveWorkspaceView('stage');
  };

  /**
   * Talk directly to Mr. Smash at his Delivery Apartment ('smash_flat')
   */
  const handleTalkToSmash = () => {
    soundFX.playBeep(400, 0.07, 'square', gameState.soundEnabled);
    const pendingCount = gameState.player.pendingDeals.length;
    const encounter: ActiveEncounter = {
      npcId: 'mr_smash',
      npcName: 'Mr. Smash',
      originalName: 'Delivery & Minder (5% Commission)',
      npcType: 'minder',
      tradeRole: 'MINDER_ORDERS',
      itemInPlay: null,
      patience: 10,
      maxPatience: 10,
      targetPrice: 0,
      currentQuote: 0,
      offerWeight: 1,
      rounds: 0,
      finalOfferLocked: false,
      negotiationActive: true,
      transcript: [
        createDialogue(
          'NPC',
          'Mr. Smash',
          `"Welcome to my flat, Leo! As your delivery man, I charge a strict 5% commission on whatever price you negotiate. ${
            pendingCount > 0
              ? `You currently have ${pendingCount} active delivery contract(s). Make sure you load the merchandise into your Car Boot at the Shop or Lock-up and hand it over to me right here!`
              : 'Whenever you buy or sell goods that aren’t in your car, go fetch them in your Car Boot and bring them here so I can dispatch them for a 5% cut.'
          } You can also type 'be my minder' if you want me riding shotgun to lower police checks!"`
        ),
      ],
    };
    setGameState((prev) => ({
      ...prev,
      mode: 'CONVERSATION',
      activeEncounter: encounter,
    }));
    setActiveWorkspaceView('stage');
  };

  /**
   * Step 1 of Manual Logistics: Pick up a Pending Purchase (`BUY_PICKUP`) into the Car Boot at the supplier's location
   */
  const handlePickupBoughtDealIntoCar = (dealId: string) => {
    setGameState((prev) => {
      const deal = prev.player.pendingDeals.find((d) => d.id === dealId);
      if (!deal) return prev;

      if (prev.player.currentLocation !== deal.pickupLocation) {
        return {
          ...prev,
          logs: [
            `[MANUAL TRAVEL REQUIRED] You must drive to ${LOCATION_SPECS[deal.pickupLocation].name} first to load "${deal.item.name}" into your Car Boot!`,
            ...prev.logs,
          ],
        };
      }

      if (prev.player.inventory.length >= prev.player.maxCarryCapacity) {
        return {
          ...prev,
          logs: [
            `[CAR BOOT FULL] Free up space in your Car Boot at The Lock-up before loading "${deal.item.name}"!`,
            ...prev.logs,
          ],
        };
      }

      soundFX.playDealSuccess(prev.soundEnabled);
      const next = structuredClone(prev);
      const targetDeal = next.player.pendingDeals.find((d) => d.id === dealId)!;
      targetDeal.pickedUpIntoCar = true;
      next.player.inventory.push(targetDeal.item);
      next.logs = [
        `[LOADED INTO CAR BOOT] You loaded "${targetDeal.item.name}" into your Car Boot at ${LOCATION_SPECS[targetDeal.pickupLocation].name}. Now drive to Mr. Smash's Flat (Delivery) to pay his 5% commission (£${targetDeal.commissionFivePercent}) and finalize the intake, or stash it at The Lock-up!`,
        ...next.logs,
      ];
      return next;
    });
  };

  /**
   * Step 2 of Manual Logistics: At Mr. Smash's Flat ('smash_flat'), hand over the item from Car Boot to Mr. Smash (5% Commission)
   */
  const handleCompleteDeliveryAtSmashFlat = (dealId: string) => {
    setGameState((prev) => {
      const deal = prev.player.pendingDeals.find((d) => d.id === dealId);
      if (!deal) return prev;

      if (prev.player.currentLocation !== 'smash_flat') {
        return {
          ...prev,
          logs: [
            `[MANUAL TRAVEL REQUIRED] You must drive to Mr. Smash's Flat (Delivery) with "${deal.item.name}" in your Car Boot to complete this delivery!`,
            ...prev.logs,
          ],
        };
      }

      const bootIdx = prev.player.inventory.findIndex(
        (i) => i.shortKey === deal.item.shortKey
      );

      if (bootIdx === -1) {
        return {
          ...prev,
          logs: [
            `[MISSING CARGO] "${deal.item.name}" is NOT in your Car Boot! Drive to ${LOCATION_SPECS[deal.pickupLocation].name} (or The Lock-up), load it into your Car Boot, and return to Mr. Smash's Flat!`,
            ...prev.logs,
          ],
        };
      }

      soundFX.playDealSuccess(prev.soundEnabled);
      const next = structuredClone(prev);
      const [cargoItem] = next.player.inventory.splice(bootIdx, 1);
      const commission = deal.commissionFivePercent;

      if (deal.type === 'SELL_DELIVERY') {
        // Selling to buyer via Mr. Smash Delivery: player receives agreedPrice minus 5% commission!
        const netPayout = deal.agreedPrice - commission;
        next.player.bankroll += netPayout;
        next.world.terryStatus.totalCommissionPaid += commission;
        next.logs = [
          `[DELIVERY COMPLETED AT MR. SMASH'S FLAT] Handed "${cargoItem.name}" to Mr. Smash for buyer ${deal.npcName}. Gross Sale: £${deal.agreedPrice} | Mr. Smash 5% Commission: -£${commission.toFixed(
            2
          )} | Net Credited to Bankroll: +£${netPayout.toFixed(2)}!`,
          ...next.logs,
        ];
      } else {
        // BUY_PICKUP processed via Mr. Smash: deducts 5% commission and moves cargo safely into The Lock-up
        next.player.bankroll = Math.max(0, next.player.bankroll - commission);
        next.world.terryStatus.totalCommissionPaid += commission;
        next.player.warehouseInventory.push(cargoItem);
        next.logs = [
          `[DELIVERY INTAKE AT MR. SMASH'S FLAT] Mr. Smash processed "${cargoItem.name}", charged his 5% commission (-£${commission.toFixed(
            2
          )}), and stashed the lot in The Lock-up!`,
          ...next.logs,
        ];
      }

      next.player.pendingDeals = next.player.pendingDeals.filter((d) => d.id !== dealId);
      if (next.player.bankroll >= next.player.targetGoal) {
        next.mode = 'VICTORY';
      }
      return next;
    });
  };

  /**
   * Process Free-Text Parser Commands
   */
  const handleCommandSubmit = (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const rawText = (overrideText ?? commandInput).trim();
    if (!rawText) return;
    setCommandInput('');

    const parsed = parseFreeTextCommand(rawText);

    // 1. Global Help / Dictionary
    if (parsed.intent === 'HELP') {
      setRefModal({ open: true, tab: 'dictionary' });
      return;
    }

    // 2. Sleep command
    if (parsed.intent === 'SLEEP') {
      soundFX.playDealSuccess(gameState.soundEnabled);
      setGameState((prev) => performSleepTransition(prev, false));
      setActiveWorkspaceView('stage');
      return;
    }

    // 3. Text Navigation ("go to warehouse", etc.)
    if (parsed.intent === 'GO_TO' && parsed.targetLocation) {
      handleMoveToLocation(parsed.targetLocation);
      return;
    }

    // 4. Minder Escort toggle
    if (parsed.intent === 'SMASH_MINDER') {
      soundFX.playDealSuccess(gameState.soundEnabled);
      setGameState((prev) => {
        const next = structuredClone(prev);
        next.world.terryStatus.isFollowing = true;
        next.world.terryStatus.location = next.player.currentLocation;
        next.logs = [
          `[MR. SMASH] "Right you are, Leo! I'm riding with you as your Minder now — reduces police car search risk!"`,
          ...next.logs,
        ];
        if (next.activeEncounter) {
          next.activeEncounter.transcript.push(
            createDialogue('PLAYER', 'Leo Smith (You)', rawText),
            createDialogue(
              'NPC',
              'Mr. Smash',
              `"You got it, Leo! I'll ride shotgun with you across London."`
            )
          );
        }
        return next;
      });
      return;
    }

    if (parsed.intent === 'SMASH_STOP_MINDER') {
      soundFX.playStep(gameState.soundEnabled);
      setGameState((prev) => {
        const next = structuredClone(prev);
        next.world.terryStatus.isFollowing = false;
        next.world.terryStatus.location = 'smash_flat';
        next.logs = [
          `[MR. SMASH] Smash returned to Mr. Smash's Flat (Delivery) and awaits your deliveries.`,
          ...next.logs,
        ];
        if (next.activeEncounter) {
          next.activeEncounter.transcript.push(
            createDialogue('PLAYER', 'Leo Smith (You)', rawText),
            createDialogue(
              'NPC',
              'Mr. Smash',
              `"Alright Leo, I'll be back at my flat waiting for your deliveries (5% commission)."`
            )
          );
        }
        return next;
      });
      return;
    }

    // 5. If no active encounter, check if player typed "looking for ..."
    if (!gameState.activeEncounter) {
      if (parsed.intent === 'LOOKING_FOR') {
        const q = (parsed.targetItemKey || '').toLowerCase();
        const found = availableLotsHere.find(
          (l) =>
            l.item.shortKey.includes(q) ||
            l.item.name.toLowerCase().includes(q) ||
            l.item.type.includes(q)
        );
        if (found) {
          handleStartLotNegotiation(found);
          return;
        }
      }
      setGameState((prev) => ({
        ...prev,
        logs: [
          `[PARSER] Command "${rawText}": Tap an NPC in the scene above so they introduce their products, or use commands like "go to warehouse", "go to smash", "sleep", or "dictionary".`,
          ...prev.logs,
        ],
      }));
      return;
    }

    // 6. Inside an ActiveEncounter (Haggling, Police Check, Creditor, Barman)
    setGameState((prev) => {
      const next = structuredClone(prev);
      const enc = next.activeEncounter;
      if (!enc) return next;

      const keywordNote =
        parsed.extractedKeywords.length > 0
          ? `Keywords Extracted: [${parsed.extractedKeywords.join(' · ')}]`
          : undefined;

      enc.transcript.push(createDialogue('PLAYER', 'Leo Smith (You)', rawText, keywordNote));

      // Strict 1985 rule: reject spelled-out number words
      if (parsed.intent === 'WRITTEN_NUMBER_ERROR') {
        soundFX.playDealRejected(next.soundEnabled);
        enc.transcript.push(
          createDialogue(
            'SYSTEM',
            'ZX Parser 1985',
            `SYNTAX ERROR: Never spell numbers out in words! Use numerical digits (e.g., "offer 150 quid") or British monetary slang ("6 ponies", "a monkey", "2 tons").`
          )
        );
        return next;
      }

      // Case A: Bar Chat with Thomas Beer
      if (enc.tradeRole === 'BAR_CHAT') {
        if (parsed.intent === 'RUMOR' || rawText.toLowerCase().includes('drink')) {
          if (next.player.bankroll >= 15) {
            next.player.bankroll -= 15;
            next.world.policeHeat = Math.max(5, next.world.policeHeat - 15);
            soundFX.playDealSuccess(next.soundEnabled);
            enc.transcript.push(
              createDialogue(
                'NPC',
                'Thomas Beer',
                `"Cheers, Leo! A round of pints (-£15) settles the nerves and drops Police Heat to ${next.world.policeHeat}%. ${next.world.winchesterRumor}"`
              )
            );
          } else {
            enc.transcript.push(
              createDialogue(
                'NPC',
                'Thomas Beer',
                `"Short of £15 for a round, Leo? Times must be tough!"`
              )
            );
          }
          return next;
        }
        if (parsed.intent === 'REJECT_BYE') {
          next.activeEncounter = null;
          next.mode = 'MAIN_HUB';
          return next;
        }
        enc.transcript.push(
          createDialogue(
            'NPC',
            'Thomas Beer',
            `"${next.world.winchesterRumor} Type 'drink' to lower Police Heat or 'bye' to leave the bar."`
          )
        );
        return next;
      }

      // Case B: Police Car Search (Sheriff Cage) or Underworld Creditor
      if (enc.tradeRole === 'POLICE_CHECK' || enc.tradeRole === 'CREDITOR_DEMAND') {
        if (parsed.intent === 'PAY_FINE_OR_DEBT' || parsed.intent === 'ACCEPT') {
          const amountToPay = enc.currentQuote;
          if (next.player.bankroll >= amountToPay) {
            next.player.bankroll -= amountToPay;
            next.world.policeHeat = Math.max(10, next.world.policeHeat - 30);
            soundFX.playStep(next.soundEnabled);
            next.logs = [
              `[POLICE SEARCH SETTLED] Paid £${amountToPay} to ${enc.npcName} and kept your Car Boot cargo.`,
              ...next.logs,
            ];
          } else {
            next.player.inventory = next.player.inventory.filter((i) => !i.isIllicit);
            next.logs = [
              `[CAR BOOT CONFISCATED!] Unable to pay £${amountToPay}, ${enc.npcName} confiscated all contraband from your Car Boot!`,
              ...next.logs,
            ];
          }
          next.activeEncounter = null;
          next.mode = 'MAIN_HUB';
          return next;
        }

        if (parsed.intent === 'OFFER' && typeof parsed.amount === 'number') {
          if (
            parsed.amount >= Math.round(enc.targetPrice * 0.75) &&
            next.player.bankroll >= parsed.amount
          ) {
            next.player.bankroll -= parsed.amount;
            next.world.policeHeat = Math.max(10, next.world.policeHeat - 25);
            soundFX.playDealSuccess(next.soundEnabled);
            next.logs = [
              `[ROADSIDE SETTLEMENT] ${enc.npcName} accepted £${parsed.amount} and waved your car through!`,
              ...next.logs,
            ];
            next.activeEncounter = null;
            next.mode = 'MAIN_HUB';
            return next;
          } else {
            soundFX.playDealRejected(next.soundEnabled);
            enc.currentQuote = Math.round(enc.currentQuote * 1.15);
            enc.transcript.push(
              createDialogue(
                'NPC',
                enc.npcName,
                `"Trying to insult me with £${parsed.amount}, Leo?! Now the fine is £${enc.currentQuote}! Type PAY before I empty your Car Boot!"`
              )
            );
            return next;
          }
        }

        if (parsed.intent === 'REFUSE_FINE_OR_DEBT' || parsed.intent === 'REJECT_BYE') {
          soundFX.playDealRejected(next.soundEnabled);
          next.player.inventory = next.player.inventory.filter((i) => !i.isIllicit);
          next.logs = [
            `[CONFISCATED] ${enc.npcName} seized the contraband from your Car Boot!`,
            ...next.logs,
          ];
          next.activeEncounter = null;
          next.mode = 'MAIN_HUB';
          return next;
        }

        enc.transcript.push(
          createDialogue(
            'NPC',
            enc.npcName,
            `"Don't stall me while I'm searching your car! Type PAY (£${enc.currentQuote}) or make a sensible offer!"`
          )
        );
        return next;
      }

      // Case C: Walk away voluntarily (BYE) -> Consumes +1 Hour
      if (parsed.intent === 'REJECT_BYE') {
        soundFX.playStep(next.soundEnabled);
        next.activeEncounter = null;
        next.mode = 'MAIN_HUB';
        return advanceTimeEngine(
          next,
          1,
          undefined,
          `Ended conversation with ${enc.npcName} without a deal (+1h elapsed).`
        );
      }

      // Case D: Accept current quote on the table (ACCEPT)
      if (parsed.intent === 'ACCEPT') {
        return finalizeTradeDeal(next, enc, enc.currentQuote);
      }

      // Case E: If Final Offer was locked and player tried to haggle further
      if (enc.finalOfferLocked && parsed.intent === 'OFFER') {
        soundFX.playDealRejected(next.soundEnabled);
        next.activeEncounter = null;
        next.mode = 'MAIN_HUB';
        next.player.reputation = Math.max(0, next.player.reputation - 5);
        return advanceTimeEngine(
          next,
          1,
          undefined,
          `${enc.npcName} lost patience after you rejected the Final Offer ("Forget it, mate! Get out!") (+1h).`
        );
      }

      // Case F: Numerical / Slang Offer (OFFER)
      if (parsed.intent === 'OFFER' && typeof parsed.amount === 'number') {
        enc.rounds += 1;
        const step = evaluateBargainOffer(enc, parsed.amount);
        enc.patience = step.newPatience;
        enc.currentQuote = step.newNpcQuote;
        if (step.finalOfferTriggered) {
          enc.finalOfferLocked = true;
        }

        if (step.accepted && typeof step.agreedPrice === 'number') {
          enc.transcript.push(
            createDialogue('NPC', enc.npcName, step.npcReply, step.mathFormulaText)
          );
          return finalizeTradeDeal(next, enc, step.agreedPrice);
        }

        if (step.aborted) {
          soundFX.playDealRejected(next.soundEnabled);
          next.activeEncounter = null;
          next.mode = 'MAIN_HUB';
          next.player.reputation = Math.max(0, next.player.reputation - 8);
          return advanceTimeEngine(
            next,
            1,
            undefined,
            `Talks collapsed with ${enc.npcName}: ${step.npcReply} (+1h elapsed, Reputation -8).`
          );
        }

        soundFX.playBeep(390, 0.07, 'square', next.soundEnabled);
        enc.transcript.push(
          createDialogue('NPC', enc.npcName, step.npcReply, step.mathFormulaText)
        );
        return next;
      }

      // Case G: Ask price or look for item
      if (parsed.intent === 'ASK_PRICE' || parsed.intent === 'LOOKING_FOR') {
        enc.transcript.push(
          createDialogue(
            'NPC',
            enc.npcName,
            `"We're talking about ${
              enc.itemInPlay?.name || 'business'
            }. My quote on the table is £${enc.currentQuote} quid (${Math.round(
              enc.currentQuote / 25
            )} ponies). Make an offer with 'offer <amount> quid' or type 'accept'!"`
          )
        );
        return next;
      }

      // Unrecognized command fallback
      enc.transcript.push(
        createDialogue(
          'SYSTEM',
          'Parser 1985',
          `Unrecognised command. Write naturally with digits or British slang (e.g., "I can give you 6 ponies", "accept", "bye").`
        )
      );
      return next;
    });
  };

  /**
   * Finalizes buying or selling merchandise WITHOUT automatic movement of off-site goods!
   * Implements Rule #4:
   * - If the merchandise is NOT in your Car Boot (or needs pickup from shop / Lock-up),
   *   you must manually drive to pick it up at the Lock-up or Shop, load it into your Car Boot,
   *   and drive to Mr. Smash's Flat ('smash_flat') where he takes a 5% commission!
   */
  const finalizeTradeDeal = (
    state: GameState,
    enc: ActiveEncounter,
    agreedPrice: number
  ): GameState => {
    const item = enc.itemInPlay;
    if (!item) {
      state.activeEncounter = null;
      state.mode = 'MAIN_HUB';
      return state;
    }

    const commission5Pct = Number((agreedPrice * 0.05).toFixed(2));

    if (enc.tradeRole === 'SELLING_TO_PLAYER') {
      // PLAYER IS BUYING
      if (state.player.bankroll < agreedPrice) {
        soundFX.playDealRejected(state.soundEnabled);
        enc.transcript.push(
          createDialogue(
            'NPC',
            enc.npcName,
            `"What do you mean you haven't got £${agreedPrice} quid on you, Leo?! Come back when your bankroll is liquid!"`
          )
        );
        return state;
      }

      state.player.bankroll -= agreedPrice;
      const purchasedItem: TradeItem = {
        ...item,
        id: `${item.shortKey}_${Date.now()}`,
        buyPrice: agreedPrice,
      };

      state.world.dailyLots = state.world.dailyLots.filter(
        (l) =>
          !(
            l.npcId === enc.npcId &&
            l.role === 'SELLING_TO_PLAYER' &&
            l.item.shortKey === item.shortKey
          )
      );

      soundFX.playDealSuccess(state.soundEnabled);
      state.player.reputation = Math.min(100, state.player.reputation + 4);
      state.activeEncounter = null;
      state.mode = 'MAIN_HUB';

      // Determine where the goods must be picked up from if not at the shop or if car boot is full
      const supplierShopLocation: LocationId =
        enc.npcId === 'chingling' || item.type === 'electrical'
          ? 'chingling_shop'
          : 'freak_stain_shop';

      const isAtSupplierShop = state.player.currentLocation === supplierShopLocation;
      const hasCarSpace = state.player.inventory.length < state.player.maxCarryCapacity;

      if (isAtSupplierShop && hasCarSpace) {
        // Bought directly at the shop and loaded into Car Boot (Player must still manually drive to Lock-up or Smash's Flat!)
        state.player.inventory.push(purchasedItem);
        return advanceTimeEngine(
          state,
          1,
          undefined,
          `PURCHASED AT SHOP: Loaded "${purchasedItem.name}" (£${agreedPrice}) into your Car Boot. Drive manually to The Lock-up to store it or to Mr. Smash's Flat for delivery (watch out for police car searches!).`
        );
      } else {
        // Closed deal away from the stock (e.g., at Winchester Club) OR Car Boot was full -> NO AUTOMATIC TELEPORT!
        const newDeal: PendingDeal = {
          id: `deal_buy_${Date.now()}`,
          type: 'BUY_PICKUP',
          npcId: enc.npcId,
          npcName: enc.npcName,
          item: purchasedItem,
          agreedPrice,
          commissionFivePercent: commission5Pct,
          pickupLocation: supplierShopLocation,
          deliveryLocation: 'smash_flat',
          pickedUpIntoCar: false,
        };
        state.player.pendingDeals.push(newDeal);

        return advanceTimeEngine(
          state,
          1,
          undefined,
          `DEAL AGREED (£${agreedPrice}): "${purchasedItem.name}" is waiting at ${LOCATION_SPECS[supplierShopLocation].name}. Drive there manually to load it into your Car Boot, then bring it to Mr. Smash's Flat (5% commission: £${commission5Pct}) or The Lock-up!`
        );
      }
    } else {
      // PLAYER IS SELLING TO NPC
      const inCarBootIdx = state.player.inventory.findIndex(
        (i) => i.shortKey === item.shortKey
      );

      state.world.dailyLots = state.world.dailyLots.filter(
        (l) =>
          !(
            l.npcId === enc.npcId &&
            l.role === 'BUYING_FROM_PLAYER' &&
            l.item.shortKey === item.shortKey
          )
      );

      soundFX.playDealSuccess(state.soundEnabled);
      state.player.reputation = Math.min(100, state.player.reputation + 5);
      state.activeEncounter = null;
      state.mode = 'MAIN_HUB';

      if (inCarBootIdx >= 0) {
        // Even if the item is in the car boot, the buyer requires delivery via Mr. Smash's Flat (5% commission) OR direct hand-off:
        // Let's check rule #4: "Ao comprar ou vender, caso a mercadoria não esteja no carro, você deve fazer o deslocamento para pegar a mercadoria no armazém ou nas lojas e entregar para o seu delivery, que fica em apartamento próprio e recebe uma comissão de 5% do que você negocia."
        // Since the item IS already in the car boot right now:
        const sold = state.player.inventory.splice(inCarBootIdx, 1)[0];
        const netProceeds = agreedPrice - commission5Pct;
        state.player.bankroll += netProceeds;
        state.world.terryStatus.totalCommissionPaid += commission5Pct;
        return advanceTimeEngine(
          state,
          1,
          undefined,
          `SOLD FROM CAR BOOT: "${sold.name}" sold to ${enc.npcName} for £${agreedPrice} (5% Delivery Commission: -£${commission5Pct.toFixed(
            2
          )} | Net: +£${netProceeds.toFixed(2)}).`
        );
      } else {
        // Merchandise is NOT in the Car Boot! Do NOT move it automatically!
        // Create a Pending Delivery Contract requiring the player to drive to Lock-up / Shop, load into Car Boot, and deliver to Mr. Smash's Flat (5% commission).
        const inWarehouse = state.player.warehouseInventory.some(
          (i) => i.shortKey === item.shortKey
        );
        const pickupSpot: LocationId = inWarehouse
          ? 'warehouse'
          : item.type === 'electrical'
          ? 'chingling_shop'
          : 'freak_stain_shop';

        const pendingSale: PendingDeal = {
          id: `deal_sell_${Date.now()}`,
          type: 'SELL_DELIVERY',
          npcId: enc.npcId,
          npcName: enc.npcName,
          item,
          agreedPrice,
          commissionFivePercent: commission5Pct,
          pickupLocation: pickupSpot,
          deliveryLocation: 'smash_flat',
          pickedUpIntoCar: false,
        };
        state.player.pendingDeals.push(pendingSale);

        return advanceTimeEngine(
          state,
          1,
          undefined,
          `SALE CONTRACT SIGNED (£${agreedPrice} with ${enc.npcName}): Since "${item.name}" is NOT in your Car Boot, you must manually drive to ${LOCATION_SPECS[pickupSpot].name} to load it into your Car Boot, then drive to Mr. Smash's Flat (Delivery) to hand it over (5% commission: £${commission5Pct})!`
        );
      }
    }
  };

  /**
   * Manual transfer between Car Boot and The Lock-up (Warehouse) — ONLY allowed when physically at The Lock-up!
   */
  const handleTransferToWarehouse = (itemId: string) => {
    setGameState((prev) => {
      if (prev.player.currentLocation !== 'warehouse') {
        return {
          ...prev,
          logs: [
            `[MANUAL TRAVEL REQUIRED] You cannot teleport goods! Drive to The Lock-up (Warehouse) (+1h) first to unload your Car Boot.`,
            ...prev.logs,
          ],
        };
      }
      soundFX.playStep(prev.soundEnabled);
      const next = structuredClone(prev);
      const idx = next.player.inventory.findIndex((i) => i.id === itemId);
      if (idx === -1) return prev;
      const [moved] = next.player.inventory.splice(idx, 1);
      next.player.warehouseInventory.push(moved);
      next.logs = [
        `[LOCK-UP] Unloaded "${moved.name}" from your Car Boot into The Lock-up.`,
        ...next.logs,
      ];
      return next;
    });
  };

  const handleRetrieveFromWarehouse = (itemId: string) => {
    setGameState((prev) => {
      if (prev.player.currentLocation !== 'warehouse') {
        return {
          ...prev,
          logs: [
            `[MANUAL TRAVEL REQUIRED] You must drive to The Lock-up (Warehouse) (+1h) in person to load this merchandise into your Car Boot!`,
            ...prev.logs,
          ],
        };
      }
      if (prev.player.inventory.length >= prev.player.maxCarryCapacity) {
        return {
          ...prev,
          logs: [
            `[CAR BOOT FULL] Your Car Boot only holds ${prev.player.maxCarryCapacity} lots at a time!`,
            ...prev.logs,
          ],
        };
      }
      soundFX.playStep(prev.soundEnabled);
      const next = structuredClone(prev);
      const idx = next.player.warehouseInventory.findIndex((i) => i.id === itemId);
      if (idx === -1) return prev;
      const [moved] = next.player.warehouseInventory.splice(idx, 1);
      next.player.inventory.push(moved);
      next.logs = [
        `[LOCK-UP] Loaded "${moved.name}" into your Car Boot. Drive to Mr. Smash's Flat (Delivery) if you have a pending sale contract!`,
        ...next.logs,
      ];
      return next;
    });
  };

  /**
   * Start New Career
   */
  const handleStartNewGame = () => {
    clearSavedGame();
    const fresh = createInitialGameState();
    setGameState(fresh);
    setActiveWorkspaceView('stage');
    soundFX.playDealSuccess(fresh.soundEnabled);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  };

  const stageBgColor = isNight ? currentLocSpec.nightBgHex : currentLocSpec.dayBgHex;
  const isAtWarehouse = gameState.player.currentLocation === 'warehouse';
  const isAtSmashFlat = gameState.player.currentLocation === 'smash_flat';

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#0a0f0d] text-slate-100 crt-scanlines pb-16 md:pb-0">
      {/* Top Header with only the game title and New Game action */}
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-slate-800/90 bg-slate-950/90">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveWorkspaceView('stage');
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-amber-400 whitespace-nowrap shrink-0"
        >
          The Trader
        </a>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleStartNewGame}
            className="min-h-[38px] px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            New Game
          </button>
        </div>
      </header>

      {/* COMPACT TOP HUD: STACKED BANKROLL + CLOCK ON LEFT, POLICE HEAT + MR. SMASH DELIVERY ALIGNED BESIDE/BELOW */}
      <section
        aria-label="Player Status HUD"
        className={`border-b transition-colors duration-300 px-3 sm:px-6 py-2 ${
          isNight
            ? 'bg-slate-950 border-slate-800 text-slate-100'
            : 'bg-amber-950/30 border-amber-800/40 text-amber-50'
        }`}
      >
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-stretch justify-between gap-2">
          {/* Compact 2-Column Stacked Status Cluster (Tight margins close to the words) */}
          <div className="flex flex-wrap items-stretch gap-2">
            {/* LEFT STACK: Bankroll on top, Day & Hour directly below */}
            <div className="flex flex-col gap-1.5">
              {/* Top: Bankroll (tightly fitted around the text) */}
              <div className="inline-flex items-center gap-2.5 px-2.5 py-1 rounded-md bg-slate-900/95 border border-slate-800 w-fit">
                <div>
                  <div className="text-[10px] text-slate-400 leading-tight whitespace-nowrap">
                    Bankroll · Goal £{gameState.player.targetGoal}
                  </div>
                  <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 tabular-nums leading-tight whitespace-nowrap">
                    £{gameState.player.bankroll.toFixed(2)}
                  </div>
                </div>
                <div className="border-l border-slate-800 pl-2 text-[10px] text-slate-400 font-mono leading-tight whitespace-nowrap">
                  <div>Rep: {gameState.player.reputation}%</div>
                  <div>
                    Boot: {gameState.player.inventory.length}/{gameState.player.maxCarryCapacity}
                  </div>
                </div>
              </div>

              {/* Bottom: Day & Hour (directly below Bankroll, tightly fitted) */}
              <div className="inline-flex items-center gap-2.5 px-2.5 py-1 rounded-md bg-slate-900/95 border border-slate-800 w-fit">
                <div>
                  <div className="text-[10px] text-slate-400 leading-tight whitespace-nowrap">
                    Day {gameState.player.day}/{gameState.player.maxDays} · Curfew 03:00
                  </div>
                  <div className="text-sm sm:text-base font-bold font-mono text-amber-300 tabular-nums leading-tight flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{formattedHour}</span>
                  </div>
                </div>
                <div className="border-l border-slate-800 pl-2 text-[10px] text-slate-300 leading-tight whitespace-nowrap">
                  <div className="font-semibold">{isNight ? 'Night Mode' : 'Day Mode'}</div>
                  <div className="text-slate-400">
                    {isNight ? 'High Patrols' : 'Shops Open'}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT STACK (Aligned beside Left Stack): Police Heat on top, Mr. Smash Delivery below */}
            <div className="flex flex-col gap-1.5">
              {/* Top: Police Heat (Car Search Risk) */}
              <div className="inline-flex items-center gap-2.5 px-2.5 py-1 rounded-md bg-slate-900/95 border border-slate-800 w-fit">
                <div>
                  <div className="text-[10px] text-slate-400 leading-tight whitespace-nowrap">
                    Police Car Search (HEAT)
                  </div>
                  <div
                    className={`text-sm sm:text-base font-bold font-mono tabular-nums leading-tight whitespace-nowrap ${
                      gameState.world.policeHeat >= 75
                        ? 'text-rose-400'
                        : gameState.world.policeHeat >= 40
                        ? 'text-amber-400'
                        : 'text-sky-400'
                    }`}
                  >
                    {gameState.world.policeHeat}% ·{' '}
                    {gameState.world.policeHeat >= 75
                      ? 'CRITICAL'
                      : gameState.world.policeHeat >= 40
                      ? 'HIGH'
                      : 'LOW'}
                  </div>
                </div>
                <AlertTriangle
                  className={`w-3.5 h-3.5 shrink-0 ${
                    gameState.world.policeHeat >= 75 ? 'text-rose-500' : 'text-slate-500'
                  }`}
                />
              </div>

              {/* Bottom: Mr. Smash Delivery (5% Fee) aligned beside Day/Hour and below Police Heat */}
              <div className="inline-flex items-center gap-2.5 px-2.5 py-1 rounded-md bg-slate-900/95 border border-slate-800 w-fit">
                <div>
                  <div className="text-[10px] text-slate-300 leading-tight whitespace-nowrap">
                    <strong className="text-slate-100">Mr. Smash (Delivery)</strong> · 5% Fee
                  </div>
                  <div className="text-xs font-semibold font-mono text-sky-400 leading-tight whitespace-nowrap">
                    {gameState.player.pendingDeals.length > 0
                      ? `${gameState.player.pendingDeals.length} PENDING DELIVERY(S)`
                      : 'AT MR. SMASH’S FLAT'}
                  </div>
                </div>
                <div className="border-l border-slate-800 pl-2 text-[10px] text-slate-400 font-mono leading-tight whitespace-nowrap">
                  <div>5% Fees Paid:</div>
                  <div className="text-slate-200">
                    £{gameState.world.terryStatus.totalCommissionPaid.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Utility Actions (Dictionary & Sound) */}
          <div className="flex items-center gap-1.5 self-center shrink-0">
            <button
              onClick={() => setRefModal({ open: true, tab: 'dictionary' })}
              className="hidden sm:flex min-h-[36px] px-2.5 py-1 rounded-md bg-amber-400/15 hover:bg-amber-400 hover:text-slate-950 border border-amber-400/40 text-amber-300 text-xs font-semibold transition-colors items-center gap-1 whitespace-nowrap"
              title="Open Game Slang & Terms Dictionary"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Dictionary</span>
            </button>
            <button
              onClick={() =>
                setGameState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
              }
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
              title={gameState.soundEnabled ? '8-bit Sound ON' : 'Sound Muted'}
            >
              {gameState.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* GAME OVER OR VICTORY MODAL */}
      {(gameState.mode === 'GAME_OVER' || gameState.mode === 'VICTORY') && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 text-center shadow-2xl">
            <h2
              className={`text-2xl font-bold ${
                gameState.mode === 'VICTORY' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {gameState.mode === 'VICTORY'
                ? 'King of the London Underworld!'
                : 'Bankrupt · Out of Business!'}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {gameState.mode === 'VICTORY'
                ? `Nice one, Leo Smith (You)! You built your bankroll to £${gameState.player.bankroll.toFixed(
                    2
                  )} on Day ${gameState.player.day}, smashing the £${
                    gameState.player.targetGoal
                  } target while outsmarting Sheriff Cage!`
                : `Your working capital dried up or the ${gameState.player.maxDays}-day deadline expired at £${gameState.player.bankroll.toFixed(
                    2
                  )}. In London's backstreets, a cash crunch is fatal!`}
            </p>
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
              <div>Final Bankroll: £{gameState.player.bankroll.toFixed(2)}</div>
              <div>Days Traded: {gameState.player.day}</div>
              <div>Winchester Club Reputation: {gameState.player.reputation}%</div>
            </div>
            <button
              onClick={handleStartNewGame}
              className="w-full min-h-[44px] py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* MAIN GAME WORKSPACE */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-3 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* LEFT / CENTER COLUMN (8 COLS ON DESKTOP): STAGE + CHAT + CAR BOOT & MR. SMASH BELOW CHAT */}
        <div
          className={`lg:col-span-8 flex flex-col gap-4 ${
            activeWorkspaceView === 'mobile_map' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {activeWorkspaceView === 'logistics' ? (
            /* DEDICATED LOGISTICS & LOCK-UP VIEW */
            <div className="p-4 sm:p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-100">
                    Car Boot, Lock-up & Delivery Contracts
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    No automatic teleporting: drive to the Shop or Lock-up to load your Car Boot, then drive to Mr. Smash&apos;s Flat (5% commission).
                  </p>
                </div>
                <button
                  onClick={() => setActiveWorkspaceView('stage')}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  Back to Stage
                </button>
              </div>

              {/* Active Pending Contracts (Rule #4) */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    <span>Pending Pickup & Delivery Contracts (5% Commission to Mr. Smash)</span>
                  </h2>
                  <span className="text-xs font-mono text-slate-400">
                    {gameState.player.pendingDeals.length} active
                  </span>
                </div>

                {gameState.player.pendingDeals.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono py-2">
                    No pending contracts right now. Negotiate a purchase or sale with any NPC!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {gameState.player.pendingDeals.map((deal) => {
                      const hasItemInBoot = gameState.player.inventory.some(
                        (i) => i.shortKey === deal.item.shortKey
                      );
                      return (
                        <div
                          key={deal.id}
                          className="p-3.5 rounded-lg bg-slate-900 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-100">
                              {deal.type === 'SELL_DELIVERY'
                                ? `SALE CONTRACT TO ${deal.npcName.toUpperCase()}`
                                : `PURCHASE PICKUP FROM ${deal.npcName.toUpperCase()}`}{' '}
                              · {deal.item.name}
                            </div>
                            <div className="text-[11px] font-mono text-amber-300">
                              Agreed Price: £{deal.agreedPrice} · Mr. Smash 5% Commission: £
                              {deal.commissionFivePercent.toFixed(2)}
                            </div>
                            <div className="text-xs text-slate-300">
                              {!hasItemInBoot
                                ? `Step 1: Drive to ${
                                    LOCATION_SPECS[deal.pickupLocation].name
                                  } and load "${deal.item.name}" into your Car Boot.`
                                : `Step 2: Cargo is in your Car Boot! Drive to Mr. Smash's Flat (Delivery) and hand it over.`}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 shrink-0">
                            {deal.type === 'BUY_PICKUP' && !deal.pickedUpIntoCar && (
                              <button
                                onClick={() =>
                                  gameState.player.currentLocation === deal.pickupLocation
                                    ? handlePickupBoughtDealIntoCar(deal.id)
                                    : handleMoveToLocation(deal.pickupLocation)
                                }
                                className="min-h-[40px] px-3 py-1.5 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
                              >
                                {gameState.player.currentLocation === deal.pickupLocation
                                  ? 'Load into Car Boot Now'
                                  : `Drive to ${LOCATION_SPECS[deal.pickupLocation].name} (+1h)`}
                              </button>
                            )}

                            {hasItemInBoot && (
                              <button
                                onClick={() =>
                                  isAtSmashFlat
                                    ? handleCompleteDeliveryAtSmashFlat(deal.id)
                                    : handleMoveToLocation('smash_flat')
                                }
                                className="min-h-[40px] px-3 py-1.5 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
                              >
                                {isAtSmashFlat
                                  ? `Hand to Mr. Smash (-5% / £${deal.commissionFivePercent.toFixed(
                                      2
                                    )})`
                                  : "Drive to Mr. Smash's Flat (+1h)"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Car Boot vs. Lock-up Warehouse */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-100">
                      Car Boot · Leo Smith (You)
                    </h2>
                    <span className="text-xs font-mono text-slate-400">
                      {gameState.player.inventory.length}/{gameState.player.maxCarryCapacity} lots
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Subject to Police Stop & Search during travel based on Police Heat ({gameState.world.policeHeat}%).
                  </p>
                  {gameState.player.inventory.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 font-mono">
                      Car Boot is currently empty.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {gameState.player.inventory.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 rounded bg-slate-900 border border-slate-800"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ItemColorBlock type={item.type} isIllicit={item.isIllicit} size="sm" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-100 break-words leading-snug">
                                {item.name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                Cost: £{item.buyPrice} · {item.isIllicit ? 'CONTRABAND' : 'LEGIT'}
                              </div>
                            </div>
                          </div>
                          {isAtWarehouse ? (
                            <button
                              onClick={() => handleTransferToWarehouse(item.id)}
                              className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-amber-400 hover:bg-amber-300 text-slate-950 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              Unload into Lock-up
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMoveToLocation('warehouse')}
                              className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              Drive to Lock-up (+1h)
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-amber-400">
                      The Lock-up (Warehouse)
                    </h2>
                    <span className="text-xs font-mono text-slate-400">
                      {gameState.player.warehouseInventory.length} lots stored
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    You must be physically at The Lock-up to load items into your Car Boot.
                  </p>
                  {gameState.player.warehouseInventory.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 font-mono">
                      Lock-up garage is empty.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {gameState.player.warehouseInventory.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 rounded bg-slate-900 border border-slate-800"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ItemColorBlock type={item.type} isIllicit={item.isIllicit} size="sm" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-100 break-words leading-snug">
                                {item.name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                Cost: £{item.buyPrice} · Safe in Lock-up
                              </div>
                            </div>
                          </div>
                          {isAtWarehouse ? (
                            <button
                              onClick={() => handleRetrieveFromWarehouse(item.id)}
                              className="min-h-[38px] px-3 py-1.5 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              Load into Car Boot
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMoveToLocation('warehouse')}
                              className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              Drive Here to Pick Up (+1h)
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* VISUAL STAGE OF CURRENT LOCATION (NO SPOILERS UNDER SPRITES) */
            <div
              className="rounded-xl border border-slate-800 overflow-hidden shadow-xl transition-colors duration-500"
              style={{ backgroundColor: stageBgColor }}
            >
              {/* Location Header */}
              <div className="px-4 sm:px-6 py-4 bg-slate-950/75 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-amber-300">
                    <span>{currentLocSpec.codeTag}</span>
                    <span aria-hidden="true">·</span>
                    <span>{currentLocSpec.originalName}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Hours: {currentLocSpec.openHour}:00 to{' '}
                      {currentLocSpec.closeHour >= 24
                        ? `0${currentLocSpec.closeHour - 24}:00`
                        : `${currentLocSpec.closeHour}:00`}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                    {currentLocSpec.name}
                  </h1>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    {currentLocSpec.description}
                  </p>
                </div>

                {/* Bar Pass 1 Hour action, Sleep action if at Flat, or Go Home shortcut */}
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  {gameState.player.currentLocation === 'winchester_club' && (
                    <button
                      onClick={handlePassHourAtBar}
                      className="flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 shadow-sm"
                      title="Wait 1 hour at the bar so other patrons arrive randomly"
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Pass 1 Hour (+1h)</span>
                    </button>
                  )}

                  {gameState.player.currentLocation === 'apartment' ? (
                    <button
                      onClick={() => handleCommandSubmit(undefined, 'sleep')}
                      className="w-full sm:w-auto min-h-[42px] px-4 py-2 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Sleep Until 06:00 (Save Day)
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMoveToLocation('apartment')}
                      className="flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 text-xs font-medium bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
                    >
                      <Home className="w-3.5 h-3.5 text-amber-400" />
                      <span>Drive Home (+1h)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Color-Coded Sprite Stage (IMPROVEMENTS #2 & #3: Leo Smith (You), NO item/price text under sprites!) */}
              <div className="p-4 sm:p-6 space-y-5">
                {/* Protagonist Row: Leo Smith (You) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/75 border border-white/10">
                  <div className="flex items-center gap-4">
                    <ColorSprite npcId="leo_smith" size="md" />
                    {gameState.world.terryStatus.isFollowing && (
                      <ColorSprite npcId="mr_smash" size="md" />
                    )}
                    <div className="space-y-1">
                      <div className="text-sm sm:text-base font-bold text-amber-400 break-words">
                        Leo Smith (You)
                        {gameState.world.terryStatus.isFollowing ? ' & Mr. Smash (Minder)' : ''}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {isAtWarehouse
                          ? 'At your Lock-up garage. You can load or unload your Car Boot right here.'
                          : isAtSmashFlat
                          ? "At Mr. Smash's Flat. Hand over cargo from your Car Boot to complete deliveries (5% commission)."
                          : 'Approach any character below so they introduce themselves and pitch their deal.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                    <button
                      onClick={() => setActiveWorkspaceView('logistics')}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-amber-300 transition-colors"
                    >
                      Car Boot & Contracts ({gameState.player.pendingDeals.length})
                    </button>
                    <button
                      onClick={() => setRefModal({ open: true, tab: 'sprites' })}
                      className="text-xs font-mono text-sky-300 hover:underline whitespace-nowrap"
                    >
                      Sprites v1 →
                    </button>
                  </div>
                </div>

                {/* Contextual Action Banner when at Shop / Lock-up / Mr. Smash's Flat */}
                {gameState.player.pendingDeals.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-500/40 space-y-2">
                    <div className="text-xs font-bold text-sky-300 flex items-center gap-2">
                      <Car className="w-4 h-4 shrink-0" />
                      <span>Active Manual Delivery / Pickup Contracts:</span>
                    </div>
                    {gameState.player.pendingDeals.map((deal) => {
                      const hasItemInBoot = gameState.player.inventory.some(
                        (i) => i.shortKey === deal.item.shortKey
                      );
                      return (
                        <div
                          key={deal.id}
                          className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs"
                        >
                          <div className="text-slate-200 break-words">
                            <strong>{deal.item.name}</strong> ({deal.npcName} · £{deal.agreedPrice}{' '}
                            · 5% Fee: £{deal.commissionFivePercent.toFixed(2)})
                          </div>
                          <div className="flex items-center gap-2">
                            {deal.type === 'BUY_PICKUP' && !deal.pickedUpIntoCar && (
                              <button
                                onClick={() =>
                                  gameState.player.currentLocation === deal.pickupLocation
                                    ? handlePickupBoughtDealIntoCar(deal.id)
                                    : handleMoveToLocation(deal.pickupLocation)
                                }
                                className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold whitespace-nowrap"
                              >
                                {gameState.player.currentLocation === deal.pickupLocation
                                  ? 'Load into Car Boot'
                                  : `Drive to ${LOCATION_SPECS[deal.pickupLocation].name} (+1h)`}
                              </button>
                            )}
                            {deal.type === 'SELL_DELIVERY' && !hasItemInBoot && (
                              <button
                                onClick={() =>
                                  isAtWarehouse
                                    ? setActiveWorkspaceView('logistics')
                                    : handleMoveToLocation(deal.pickupLocation)
                                }
                                className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold whitespace-nowrap"
                              >
                                {isAtWarehouse
                                  ? 'Load from Lock-up into Car'
                                  : `Drive to ${LOCATION_SPECS[deal.pickupLocation].name} (+1h)`}
                              </button>
                            )}
                            {hasItemInBoot && (
                              <button
                                onClick={() =>
                                  isAtSmashFlat
                                    ? handleCompleteDeliveryAtSmashFlat(deal.id)
                                    : handleMoveToLocation('smash_flat')
                                }
                                className="px-3 py-1.5 rounded bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold whitespace-nowrap"
                              >
                                {isAtSmashFlat
                                  ? `Deliver to Mr. Smash (-5% / £${deal.commissionFivePercent.toFixed(
                                      2
                                    )})`
                                  : "Drive to Mr. Smash's Flat (+1h)"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Interactive NPCs Present at this Location (IMPROVEMENT #3: Zero product/inventory spoilers under sprites!) */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-mono text-slate-200">
                      Characters Present Here (Approach & Talk to hear what they have to offer):
                    </div>
                    {gameState.player.currentLocation === 'winchester_club' && (
                      <button
                        onClick={handlePassHourAtBar}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-400 hover:text-slate-950 border border-emerald-400/50 text-xs font-mono font-semibold text-emerald-300 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pass 1 Hour at Bar (+1h · New People Arrive)</span>
                      </button>
                    )}
                  </div>

                  {!isCurrentLocationOpen ? (
                    <div className="p-4 rounded-xl bg-slate-950/85 border border-rose-500/40 text-xs text-rose-200 font-mono leading-relaxed">
                      CLOSED! {currentLocSpec.name} only trades between{' '}
                      {currentLocSpec.openHour}:00 and {currentLocSpec.closeHour}:00. You wasted an hour turning up after hours!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Thomas Beer at The Winchester Club */}
                      {gameState.player.currentLocation === 'winchester_club' && (
                        <button
                          onClick={handleTalkToThomasBeer}
                          className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-emerald-500/40 text-left transition-all group"
                        >
                          <ColorSprite npcId="thomas_beer" size="md" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="text-sm font-bold text-emerald-400 group-hover:underline leading-snug break-words">
                              Thomas Beer
                            </div>
                            <div className="text-xs text-slate-300 leading-snug break-words">
                              Winchester Club Barman
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 pt-0.5">
                              [Approach & Talk]
                            </div>
                          </div>
                        </button>
                      )}

                      {/* Mr. Smash at Mr. Smash's Flat (or when escorting) */}
                      {isSmashHere && (
                        <button
                          onClick={handleTalkToSmash}
                          className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-sky-500/40 text-left transition-all group"
                        >
                          <ColorSprite npcId="mr_smash" size="md" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="text-sm font-bold text-sky-400 group-hover:underline leading-snug break-words">
                              Mr. Smash
                            </div>
                            <div className="text-xs text-slate-300 leading-snug break-words">
                              Delivery & Minder (5% Commission)
                            </div>
                            <div className="text-[11px] font-mono text-amber-300 pt-0.5">
                              [Approach & Talk]
                            </div>
                          </div>
                        </button>
                      )}

                      {/* Traders / Contacts Present Here (NO spoilers of what they possess or prices!) */}
                      {availableLotsHere.map((lot, idx) => (
                        <button
                          key={`${lot.npcId}-${lot.role}-${idx}`}
                          onClick={() => handleStartLotNegotiation(lot)}
                          className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-amber-500/40 text-left transition-all group"
                        >
                          <ColorSprite npcId={lot.npcId} size="md" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="text-sm font-bold text-amber-300 group-hover:underline leading-snug break-words">
                              {lot.npcName}
                            </div>
                            <div className="text-xs text-slate-300 leading-snug break-words">
                              {lot.npcId === 'chingling'
                                ? 'Electrical Dealer'
                                : lot.npcId === 'mr_freak_stain'
                                ? 'Curiosities Dealer'
                                : 'Club Contact'}
                            </div>
                            <div className="text-[11px] font-mono text-emerald-400 pt-0.5">
                              [Approach & Hear Pitch]
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* INTERACTIVE FREE-TEXT PARSER & MATHEMATICAL BARGAIN CONSOLE */}
          <div className="rounded-xl bg-slate-900/95 border border-slate-800 overflow-hidden shadow-xl">
            {/* Active Negotiation Header */}
            <div className="px-4 sm:px-5 py-3 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-mono font-semibold text-slate-200 break-words">
                  {gameState.activeEncounter
                    ? `CONVERSATION WITH: ${gameState.activeEncounter.npcName}`
                    : '1985 KEYWORD PARSER (APPROACH AN NPC OR TYPE COMMANDS)'}
                </span>
              </div>

              {gameState.activeEncounter && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
                  <span
                    className={`${
                      gameState.activeEncounter.patience <= 2
                        ? 'text-rose-400 font-bold'
                        : 'text-emerald-400'
                    }`}
                  >
                    NPC Patience: {gameState.activeEncounter.patience}/
                    {gameState.activeEncounter.maxPatience}
                  </span>
                </div>
              )}
            </div>

            {/* Dialogue & Hourly Event Log Transcript with Typewriter Effect on ALL messages */}
            <div
              ref={transcriptContainerRef}
              className="p-4 sm:p-5 h-60 sm:h-64 overflow-y-auto space-y-3 bg-[#070b09] font-mono text-xs"
            >
              {gameState.activeEncounter ? (
                gameState.activeEncounter.transcript.map((entry, idx, arr) => {
                  const isLatestNonPlayer =
                    (entry.speaker === 'NPC' || entry.speaker === 'SYSTEM') &&
                    idx === arr.length - 1;
                  return (
                    <TypewriterMessage
                      key={entry.id}
                      entry={entry}
                      isLatestMessage={isLatestNonPlayer}
                      soundEnabled={gameState.soundEnabled}
                      onTypingProgress={scrollTranscriptToBottom}
                    />
                  );
                })
              ) : (
                <div className="space-y-2.5">
                  <div className="text-slate-400 text-[11px] pb-1 border-b border-slate-900">
                    Approach any character above so they introduce their products, or type natural commands below.
                  </div>
                  {gameState.logs.map((logLine, i) => (
                    <TypewriterLogEntry
                      key={`${i}-${logLine}`}
                      text={logLine}
                      shouldAnimate={i === 0}
                      isHighlighted={i === 0}
                      soundEnabled={gameState.soundEnabled}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Quick Contextual Command Chips */}
            <div className="px-4 sm:px-5 py-2.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-mono text-slate-400 shrink-0">Prompts:</span>
              {gameState.activeEncounter ? (
                <>
                  {gameState.activeEncounter.tradeRole === 'SELLING_TO_PLAYER' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleCommandSubmit(
                            undefined,
                            `I can offer ${Math.round(
                              gameState.activeEncounter!.targetPrice * 0.95
                            )} quid`
                          )
                        }
                        className="min-h-[36px] px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-amber-400 hover:text-slate-950 text-amber-300 border border-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                      >
                        offer {Math.round(gameState.activeEncounter.targetPrice * 0.95)} quid
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCommandSubmit(
                            undefined,
                            `How about ${Math.max(
                              1,
                              Math.round(gameState.activeEncounter!.targetPrice / 25)
                            )} ponies`
                          )
                        }
                        className="min-h-[36px] px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-amber-400 hover:text-slate-950 text-amber-300 border border-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                      >
                        offer {Math.max(1, Math.round(gameState.activeEncounter.targetPrice / 25))}{' '}
                        ponies
                      </button>
                    </>
                  )}
                  {gameState.activeEncounter.tradeRole === 'BUYING_FROM_PLAYER' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleCommandSubmit(
                          undefined,
                          `I want ${Math.round(
                            gameState.activeEncounter!.targetPrice * 1.05
                          )} quid for the lot`
                        )
                      }
                      className="min-h-[36px] px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-amber-400 hover:text-slate-950 text-amber-300 border border-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                    >
                      want {Math.round(gameState.activeEncounter.targetPrice * 1.05)} quid
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCommandSubmit(undefined, 'accept')}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-mono bg-emerald-950 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-emerald-700 rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    accept (£{gameState.activeEncounter.currentQuote})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCommandSubmit(undefined, 'bye')}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-mono bg-rose-950 hover:bg-rose-500 hover:text-white text-rose-300 border border-rose-800 rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    bye (+1h)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleMoveToLocation('warehouse')}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-amber-400 hover:text-slate-950 text-amber-300 border border-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    go to lock-up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveToLocation('smash_flat')}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-sky-400 hover:text-slate-950 text-sky-300 border border-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    go to smash&apos;s flat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCommandSubmit(undefined, 'be my minder')}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-sky-400 hover:text-slate-950 text-sky-300 border border-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    be my minder
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setRefModal({ open: true, tab: 'dictionary' })}
                className="min-h-[36px] px-3 py-1.5 text-xs font-mono bg-amber-500/20 hover:bg-amber-400 hover:text-slate-950 text-amber-300 border border-amber-500/40 rounded transition-colors whitespace-nowrap shrink-0 ml-auto"
              >
                Dictionary
              </button>
            </div>

            {/* Live Keyword Scanner Preview when typing */}
            {commandInput.trim().length > 0 &&
              (() => {
                const liveParsed = parseFreeTextCommand(commandInput);
                return (
                  <div className="px-4 sm:px-5 py-1.5 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-slate-400">
                      Keyword Scanner:{' '}
                      {liveParsed.extractedKeywords.length > 0 ? (
                        <span className="text-emerald-400 font-semibold">
                          [{liveParsed.extractedKeywords.join(' · ')}]
                        </span>
                      ) : (
                        <span className="text-rose-400">
                          [No recognized keywords yet — include digits/slang or action verbs]
                        </span>
                      )}
                    </span>
                    {typeof liveParsed.amount === 'number' && (
                      <span className="text-amber-300 font-bold">
                        Parsed Value: £{liveParsed.amount}
                      </span>
                    )}
                  </div>
                );
              })()}

            {/* Free-Text Parser Input */}
            <form
              onSubmit={(e) => handleCommandSubmit(e)}
              className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2.5 sm:gap-3"
            >
              <span className="text-amber-400 font-mono font-bold pl-1 sm:pl-2 select-none">
                &gt;
              </span>
              <input
                ref={inputRef}
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder='Write naturally: e.g. "Look mate I will give you 6 ponies for those tellies"...'
                className="flex-1 min-h-[44px] bg-transparent text-base sm:text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* BOTTOM SECTION DIRECTLY BELOW CHAT: CAR BOOT & LOCK-UP + MR. SMASH DELIVERY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Car Boot & Lock-up Overview */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-400" />
                    <span>Car Boot & Lock-up</span>
                  </h2>
                  <button
                    onClick={() =>
                      setActiveWorkspaceView(
                        activeWorkspaceView === 'logistics' ? 'stage' : 'logistics'
                      )
                    }
                    className="text-xs font-mono text-amber-400 hover:underline"
                  >
                    {activeWorkspaceView === 'logistics' ? 'Back to Stage' : 'Contracts →'}
                  </button>
                </div>

                {/* In Car Boot */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>In Car Boot · Leo Smith (You)</span>
                    <span className="font-mono">
                      {gameState.player.inventory.length}/{gameState.player.maxCarryCapacity}
                    </span>
                  </div>
                  {gameState.player.inventory.length === 0 ? (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800/80 text-xs text-slate-500 font-mono">
                      Car Boot is empty.
                    </div>
                  ) : (
                    gameState.player.inventory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemColorBlock type={item.type} isIllicit={item.isIllicit} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-100 break-words leading-snug">
                              {item.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              Paid: £{item.buyPrice} ·{' '}
                              <span
                                className={item.isIllicit ? 'text-rose-400' : 'text-emerald-400'}
                              >
                                {item.isIllicit ? 'CONTRABAND' : 'LEGIT'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isAtWarehouse && (
                          <button
                            onClick={() => handleTransferToWarehouse(item.id)}
                            className="min-h-[34px] px-2.5 py-1 text-[11px] font-mono bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded transition-colors whitespace-nowrap shrink-0"
                          >
                            Unload
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* In The Lock-up */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>In The Lock-up (Warehouse)</span>
                    <span className="font-mono">
                      {gameState.player.warehouseInventory.length} lots
                    </span>
                  </div>
                  {gameState.player.warehouseInventory.length === 0 ? (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800/80 text-xs text-slate-500 font-mono">
                      No parcels in The Lock-up.
                    </div>
                  ) : (
                    gameState.player.warehouseInventory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemColorBlock type={item.type} isIllicit={item.isIllicit} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-100 break-words leading-snug">
                              {item.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              Paid: £{item.buyPrice} · Stored at Lock-up
                            </div>
                          </div>
                        </div>
                        {isAtWarehouse ? (
                          <button
                            onClick={() => handleRetrieveFromWarehouse(item.id)}
                            className="min-h-[34px] px-2.5 py-1 text-[11px] font-mono bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded transition-colors whitespace-nowrap shrink-0"
                          >
                            Load Car
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-500 shrink-0">
                            At Lock-up
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 2. Mr. Smash Delivery Apartment Info (Below Chat right beside Car Boot & Lock-up) */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-bold text-sky-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Mr. Smash · Delivery (5% Fee)</span>
                  </h2>
                  <button
                    onClick={() => setRefModal({ open: true, tab: 'dictionary' })}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Dictionary</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mr. Smash lives in his own apartment (<strong>Mr. Smash&apos;s Flat</strong>) and
                  handles your deliveries for a <strong>5% commission</strong> on the negotiated
                  value.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Active Contracts:</span>
                    <span className="text-sky-400 font-bold">
                      {gameState.player.pendingDeals.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Minder Escort Status:</span>
                    <span
                      className={
                        gameState.world.terryStatus.isFollowing
                          ? 'text-emerald-400 font-semibold'
                          : 'text-slate-400'
                      }
                    >
                      {gameState.world.terryStatus.isFollowing
                        ? 'Riding Shotgun (-40% Police Risk)'
                        : 'At His Flat'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleMoveToLocation('smash_flat')}
                  className="min-h-[42px] p-2.5 text-xs font-medium bg-slate-950 hover:bg-slate-800 text-sky-300 border border-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  Drive to Smash&apos;s Flat
                </button>
                <button
                  onClick={() =>
                    handleCommandSubmit(
                      undefined,
                      gameState.world.terryStatus.isFollowing ? 'stop minder' : 'be my minder'
                    )
                  }
                  className="min-h-[42px] p-2.5 text-xs font-medium bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {gameState.world.terryStatus.isFollowing
                    ? 'Dismiss Escort'
                    : 'Hire Minder Escort'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 COLS ON DESKTOP): STRETCHED LONDON STREET CIRCUIT */}
        <aside
          className={`lg:col-span-4 flex flex-col ${
            activeWorkspaceView === 'mobile_map' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* London Street Circuit stretched vertically to align with the entire Left Column */}
          <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 rounded-xl bg-slate-900/90 border border-slate-800 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  London Street Circuit
                </h2>
                <span className="text-xs font-mono text-amber-400">+1 Hour / drive</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Driving between locations carries a{' '}
                <strong className="text-rose-400">{gameState.world.policeHeat}%</strong> chance of a
                Police Car Boot Search based on your current HEAT!
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-between gap-2.5 py-1">
              {(Object.keys(LOCATION_SPECS) as LocationId[]).map((locKey) => {
                const spec = LOCATION_SPECS[locKey];
                const isHere = gameState.player.currentLocation === locKey;
                const isOpenNow =
                  gameState.player.hour >= spec.openHour &&
                  gameState.player.hour < spec.closeHour;
                const hasPendingPickupHere = gameState.player.pendingDeals.some(
                  (d) => d.pickupLocation === locKey && !d.pickedUpIntoCar
                );

                return (
                  <button
                    key={locKey}
                    disabled={isHere}
                    onClick={() => handleMoveToLocation(locKey)}
                    className={`w-full flex-1 min-h-[68px] p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                      isHere
                        ? 'bg-amber-500/15 border-amber-400 text-slate-100 cursor-default shadow-sm'
                        : 'bg-slate-950/90 hover:bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: spec.accentHex }}
                        />
                        <span className="text-xs sm:text-sm font-bold text-slate-100 break-words leading-snug">
                          {spec.name}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center gap-1.5">
                        <span className={isOpenNow ? 'text-emerald-400' : 'text-rose-400'}>
                          {isOpenNow ? 'OPEN' : 'CLOSED'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{spec.originalName}</span>
                        {hasPendingPickupHere && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-400 font-semibold">PICKUP WAITING</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400/90 line-clamp-1">
                        {spec.description}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isHere ? (
                        <span className="px-2 py-1 rounded bg-amber-400/20 border border-amber-400/40 text-[11px] font-mono font-semibold text-amber-300">
                          HERE NOW
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200">
                          <span>Drive (+1h)</span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </main>

      {/* MOBILE FIXED BOTTOM TAB BAR */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 items-center h-14 px-2"
      >
        <button
          onClick={() => setActiveWorkspaceView('stage')}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            activeWorkspaceView === 'stage' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">Stage & Talk</span>
        </button>

        <button
          onClick={() => setActiveWorkspaceView('mobile_map')}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            activeWorkspaceView === 'mobile_map' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">Map & Car</span>
        </button>

        <button
          onClick={() => setActiveWorkspaceView('logistics')}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            activeWorkspaceView === 'logistics' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">
            Contracts ({gameState.player.pendingDeals.length})
          </span>
        </button>

        <button
          onClick={() => setRefModal({ open: true, tab: 'dictionary' })}
          className="flex flex-col items-center justify-center h-full text-amber-300 hover:text-amber-400 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 font-semibold whitespace-nowrap">Dictionary</span>
        </button>
      </nav>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 px-4 sm:px-6 py-3 text-xs text-slate-500">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>The Trader</span>
          <span className="font-mono">
            {saveExists ? 'Auto-Save Active (localStorage: the_trader_save_state)' : 'New Game'} · Sprites v1 (Color-Coded)
          </span>
        </div>
      </footer>

      {/* Dictionary & Sprites Reference Modal */}
      <ReferenceModal
        isOpen={refModal.open}
        initialTab={refModal.tab}
        onClose={() => setRefModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
