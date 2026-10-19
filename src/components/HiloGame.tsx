import { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  ChevronsRight,
  Equal,
  Sparkles,
  Leaf,
  X,
  ShieldCheck,
  Layers,
  Info,
} from "lucide-react";
import DemoWalletModal from "./DemoWalletModal";
import "../App.css";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
} from "framer-motion";

type Direction = "higher" | "lower" | "same";
type Status = "idle" | "playing" | "lost" | "cashed";

interface HiLoGameProps {
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onModalToggle?: (isOpen: boolean) => void;
}

interface HiLoCard {
  id: number;
  rank: number; // 1 = Ace (matalin) ... 13 = King (korkein)
  suit: number; // 0 = ♠, 1 = ♥, 2 = ♦, 3 = ♣
}

interface HistoryStep {
  id: number;
  card: HiLoCard;
  guess: Direction | "skip" | null; // null = aloituskortti
  mult: number | null; // kumulatiivinen kerroin kortin jälkeen
  result: "win" | "loss" | "skip" | null;
  skipped?: boolean; // kortti on ohitettu (korvattu uudella kortilla)
}

const RTP = 0.98;

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"];
const isRed = (suit: number) => suit === 1 || suit === 2;

// Arvausvaihtoehdot nykyisen kortin mukaan. Vasen paikka on "Higher", oikea "Lower".
//  - 2...Q: "Higher / same" ja "Lower / same" (sama arvo voittaa)
//  - Ässä (A): "Higher" (A uudelleen häviää) ja "Same" (vain A voittaa)
//  - Kuningas (K): "Same" (vain K voittaa) ja "Lower" (K uudelleen häviää)
interface GuessOption {
  dir: Direction;
  label: string;
  p: number; // voittotodennäköisyys
  strict: boolean; // true = sama arvo ei voita (vain A:n Higher ja K:n Lower)
}

function getOptions(rank: number): [GuessOption, GuessOption] {
  if (rank === 1) {
    return [
      { dir: "higher", label: "Higher", p: 12 / 13, strict: true },
      { dir: "same", label: "Same", p: 1 / 13, strict: false },
    ];
  }
  if (rank === 13) {
    return [
      { dir: "same", label: "Same", p: 1 / 13, strict: false },
      { dir: "lower", label: "Lower", p: 12 / 13, strict: true },
    ];
  }
  return [
    { dir: "higher", label: "Higher / same", p: (14 - rank) / 13, strict: false },
    { dir: "lower", label: "Lower / same", p: rank / 13, strict: false },
  ];
}

function isWin(opt: GuessOption, rank: number, next: number): boolean {
  if (opt.dir === "same") return next === rank;
  if (opt.dir === "higher") return opt.strict ? next > rank : next >= rank;
  return opt.strict ? next < rank : next <= rank;
}

const multFor = (p: number) => RTP / p;

function drawCard(id: number): HiLoCard {
  const u = crypto.getRandomValues(new Uint32Array(1))[0];
  const n = Math.floor((u / 4294967296) * 52);
  return { id, rank: (n % 13) + 1, suit: Math.floor(n / 13) };
}

function fmt(n: number): string {
  return "$" + n.toFixed(2);
}

function playSound(src: string, volume = 1.0) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
}

function AnimatedBalance({ value }: { value: number }) {
  const count = useMotionValue(value);
  const [displayValue, setDisplayValue] = useState("$" + value.toFixed(2));

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue("$" + latest.toFixed(2));
      },
    });

    return () => controls.stop();
  }, [value, count]);

  return <span>{displayValue}</span>;
}

// ---------- Kortti ----------
function CardFace({
  card,
  className = "",
  rankClass = "text-3xl",
  suitClass = "text-2xl",
  corners = false,
  ring = "",
}: {
  card: HiLoCard;
  className?: string;
  rankClass?: string;
  suitClass?: string;
  corners?: boolean;
  ring?: string;
}) {
  const color = isRed(card.suit) ? "text-[#B91C1C]" : "text-[#2D2621]";
  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-xl bg-[#FFFDF8] border border-[#E2D6C3] shadow-[0_8px_20px_rgba(0,0,0,0.12)] font-serif select-none ${color} ${ring} ${className}`}
    >
      {corners && (
        <>
          <div className="absolute top-2 left-2.5 flex flex-col items-center leading-none text-sm font-bold">
            <span>{RANKS[card.rank - 1]}</span>
            <span className="text-xs">{SUITS[card.suit]}</span>
          </div>
          <div className="absolute bottom-2 right-2.5 flex flex-col items-center leading-none text-sm font-bold rotate-180">
            <span>{RANKS[card.rank - 1]}</span>
            <span className="text-xs">{SUITS[card.suit]}</span>
          </div>
        </>
      )}
      <span className={`font-bold leading-none ${rankClass}`}>
        {RANKS[card.rank - 1]}
      </span>
      <span className={`leading-none mt-1 ${suitClass}`}>
        {SUITS[card.suit]}
      </span>
    </div>
  );
}

export default function HiLoGame({
  balance,
  setBalance,
  onModalToggle,
}: HiLoGameProps) {
  const idRef = useRef<number>(0);
  const nextId = () => ++idRef.current;

  const [isWalletOpen, setIsWalletOpen] = useState<boolean>(false);
  const [betAmount, setBetAmount] = useState<string>("100.00");
  const [betError, setBetError] = useState<boolean>(false);

  const [status, setStatus] = useState<Status>("idle");
  const [currentCard, setCurrentCard] = useState<HiLoCard>(() =>
    drawCard(0),
  );
  const [history, setHistory] = useState<HistoryStep[]>([]);
  const [cumMult, setCumMult] = useState<number>(1);
  const [roundBet, setRoundBet] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [lossNote, setLossNote] = useState<string>("");

  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onModalToggle?.(isWalletOpen);
  }, [isWalletOpen, onModalToggle]);

  useEffect(() => {
    if (!betError) return;
    const id = window.setTimeout(() => setBetError(false), 550);
    return () => window.clearTimeout(id);
  }, [betError]);

  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [history.length]);

  const playing = status === "playing";
  const rank = currentCard.rank;
  const [leftOpt, rightOpt] = getOptions(rank);
  const payout = Math.floor(roundBet * cumMult * 100) / 100;
  const canCashout = playing && cumMult > 1;

  // ---------- Pelilogiikka ----------
  function startRound() {
    const amount = Number.parseFloat(betAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) {
      setBetError(true);
      return;
    }

    playSound("/sounds/bet.wav", 0.5);
    setBalance((b) => b - amount);

    const start = status === "idle" ? currentCard : drawCard(nextId());
    setCurrentCard(start);
    setRoundBet(amount);
    setCumMult(1);
    setMessage("");
    setLossNote("");
    setHistory([
      { id: nextId(), card: start, guess: null, mult: null, result: null },
    ]);
    setStatus("playing");
  }

  function guess(opt: GuessOption) {
    if (!playing) return;

    playSound("/sounds/card-flick.wav", 1.0);

    const next = drawCard(nextId());
    const win = isWin(opt, rank, next.rank);

    setCurrentCard(next);

    if (win) {
      const m = cumMult * multFor(opt.p);
      setCumMult(m);
      setHistory((h) => [
        ...h,
        { id: nextId(), card: next, guess: opt.dir, mult: m, result: "win" },
      ]);
    } else {
      setHistory((h) => [
        ...h,
        { id: nextId(), card: next, guess: opt.dir, mult: null, result: "loss" },
      ]);
      setStatus("lost");
      playSound("/sounds/lose.wav", 0.25);
      setMessage(`Round lost  -${fmt(roundBet)}`);
      // Sama kortti A:lla/K:lla häviää, ellei pelaaja valinnut "Same"
      setLossNote(
        next.rank === rank
          ? `Same card (${RANKS[rank - 1]}) - only "Same" would have won`
          : "",
      );
    }
  }

  function skipCard() {
    playSound("/sounds/card-flick.wav", 1.0);
    const next = drawCard(nextId());
    setCurrentCard(next);

    if (!playing) return;

    if (history.length <= 1) {
      setHistory([
        { id: nextId(), card: next, guess: null, mult: null, result: null },
      ]);
    } else {
      // Ohitettu kortti (esim. 9) merkitään "Skipped", ja uusi kortti (esim. J)
      // jatkaa samalla kertoimella. Uusi kortti on se, jonka päälle arvataan seuraavaksi.
      setHistory((h) => [
        ...h.slice(0, -1),
        { ...h[h.length - 1], skipped: true },
        { id: nextId(), card: next, guess: "skip", mult: cumMult, result: "skip" },
      ]);
    }
  }

  function cashout() {
    if (!canCashout) return;
    setBalance((b) => b + payout);
    if (payout > roundBet) playSound("/sounds/win.wav", 1.0);
    setStatus("cashed");
    setMessage(
      `Cashed out ${fmt(payout)} at x${cumMult.toFixed(2)}  +${fmt(payout - roundBet)}`,
    );
  }

  function handleMainButton() {
    if (playing) cashout();
    else startRound();
  }

  // ---------- Panoksen apufunktiot ----------
  function addBet(amount: number) {
    const current = Number.parseFloat(betAmount) || 0;
    setBetAmount((current + amount).toFixed(2));
  }
  function scaleBet(mult: number) {
    const current = Number.parseFloat(betAmount) || 0;
    setBetAmount(Math.max(0.01, current * mult).toFixed(2));
  }
  const clearBet = () => setBetAmount("0.00");
  const maxBet = () => setBetAmount(balance.toFixed(2));

  const ringClass =
    status === "lost"
      ? "ring-4 ring-rose-500"
      : status === "cashed"
        ? "ring-4 ring-emerald-500"
        : "ring-4 ring-[#D4AF37]";

  const currentStack = (
    <div className="relative pb-3">
      <div className="absolute inset-x-2 bottom-1.5 top-2 rounded-xl bg-[#E4D5B0] border border-[#D4AF37]/50" />
      <div className="absolute inset-x-4 bottom-0 top-4 rounded-xl bg-[#D9C48F] border border-[#D4AF37]/50" />

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={currentCard.id}
          initial={{ opacity: 0, y: -24, rotateY: -80 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ transformPerspective: 900 }}
          className="relative"
        >
          <CardFace
            card={currentCard}
            ring={ringClass}
            corners
            className="w-[124px] h-[178px] sm:w-[150px] sm:h-[215px] lg:w-[176px] lg:h-[252px]"
            rankClass="text-6xl sm:text-7xl lg:text-8xl"
            suitClass="text-4xl sm:text-5xl lg:text-6xl"
          />
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={skipCard}
        aria-label="Skip card"
        title="Skip card"
        className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-xl bg-[#2D2621] hover:bg-[#443830] text-[#FAF6F0] flex items-center justify-center shadow-lg border border-[#D4AF37]/50 cursor-pointer transition-colors active:scale-95"
      >
        <ChevronsRight className="w-5 h-5" />
      </button>
    </div>
  );

  const guessRow = (slot: "left" | "right") => {
    const opt = slot === "left" ? leftOpt : rightOpt;
    const disabled = !playing;
    const m = multFor(opt.p);
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => guess(opt)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
          disabled
            ? "bg-[#EFE8DC] border-[#E2D6C3] text-[#8C827A] cursor-not-allowed"
            : "bg-[#FAF6F0] border-[#E2D6C3] text-[#2D2621] hover:border-[#D4AF37] shadow-sm cursor-pointer"
        }`}
      >
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-serif font-bold truncate">
            {opt.label}
          </div>
          <div className="text-[11px] font-mono font-semibold text-amber-800">
            x{m.toFixed(2)}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-none rounded-lg bg-[#F4EBE1] border border-[#E2D6C3] px-2 py-1 text-[11px] font-mono font-bold">
          {opt.dir === "higher" ? (
            <ArrowUp className="w-3 h-3 text-emerald-600" />
          ) : opt.dir === "lower" ? (
            <ArrowDown className="w-3 h-3 text-rose-600" />
          ) : (
            <Equal className="w-3 h-3 text-amber-700" strokeWidth={3} />
          )}
          {(opt.p * 100).toFixed(2)}%
        </div>
      </button>
    );
  };

  const bigGuessCard = (slot: "left" | "right") => {
    const opt = slot === "left" ? leftOpt : rightOpt;
    const disabled = !playing;
    const m = multFor(opt.p);
    const caption =
      opt.dir === "same"
        ? "Exact same rank wins"
        : opt.strict
          ? "Same rank loses"
          : opt.dir === "higher"
            ? "KING being the highest"
            : "ACE being the lowest";
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => guess(opt)}
          className={`w-[150px] h-[230px] rounded-2xl border-2 flex flex-col items-center justify-between py-6 px-3 transition-all shadow-lg ${
            disabled
              ? "bg-gradient-to-b from-[#E8DFCB] to-[#DCCFB4] border-[#D3C5A8] text-[#8C827A] cursor-not-allowed"
              : "bg-gradient-to-b from-[#F3E5AB] via-[#FBF3D5] to-[#E9D79A] border-[#D4AF37] text-amber-950 hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] cursor-pointer"
          }`}
        >
          {opt.dir === "higher" ? (
            <ChevronUp className="w-10 h-10" strokeWidth={3} />
          ) : opt.dir === "lower" ? (
            <ChevronDown className="w-10 h-10" strokeWidth={3} />
          ) : (
            <Equal className="w-10 h-10" strokeWidth={3} />
          )}
          <span className="font-serif font-bold text-sm tracking-wide uppercase">
            {opt.label}
          </span>
          <span
            className={`w-full rounded-lg py-2 text-center font-mono font-bold text-base ${
              disabled
                ? "bg-[#CFC2A6] text-[#6F665C]"
                : "bg-[#2D2621] text-[#FAF6F0]"
            }`}
          >
            x{m.toFixed(2)}
          </span>
        </button>
        <span className="text-[11px] text-[#8C827A]">{caption}</span>
      </div>
    );
  };

  const mainDisabled = playing && !canCashout;
  const mainLabel = playing
    ? canCashout
      ? `Cashout ${fmt(payout)}`
      : "Pick higher or lower"
    : "Place Bet";

  const statusPill = (() => {
    if (status === "idle")
      return {
        cls: "bg-[#F4EBE1] border-[#E2D6C3] text-[#8C827A]",
        text: "Place your bet to start the round",
      };
    if (status === "playing")
      return {
        cls: "bg-amber-100 border-amber-400 text-amber-900",
        text: `Current x${cumMult.toFixed(2)}`, // ei renderöidä: pelin aikana näytetään kerroinlaatikko
      };
    if (status === "lost")
      return {
        cls: "bg-rose-100 border-rose-400 text-rose-900",
        text: message,
      };
    return {
      cls: "bg-emerald-100 border-emerald-500 text-emerald-900",
      text: message,
    };
  })();

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-2 antialiased text-[#2D2621] font-sans">
      <div className="relative rounded-3xl p-3 sm:p-8 border border-[#EADFCF] bg-[#FAF6F0]/20 backdrop-blur shadow-[0_20px_50px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(255,255,255,0.8)] transition-all">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight flex items-center gap-2 text-[#2D2621]">
              Hi-Lo
              <span className="text-amber-500 text-xl font-normal">✦</span>
            </h1>
            <p className="text-xs sm:text-sm mt-1 text-[#8C827A]">
              Higher or lower? Climb the ladder, cash out in time.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsWalletOpen(true)}
            className="group flex items-center gap-3 bg-[#F0E8DC] hover:bg-[#EAE0D0] px-4 py-2.5 rounded-2xl border border-[#E2D6C3] shadow-inner transition-colors cursor-pointer active:scale-[0.98]"
          >
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-right text-[#8C827A]">
                Balance
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#2D2621]">
                <AnimatedBalance value={balance} />
              </div>
            </div>

            <div className="w-9 h-9 rounded-xl bg-[#FAF6F0] flex items-center justify-center border border-[#E2D6C3] shadow-sm text-amber-700 group-hover:scale-105 transition-transform pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3" />
              </svg>
            </div>
          </button>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[320px_1fr] gap-4 mb-6">
          {/* BOARD */}
          <div className="order-1 lg:order-2 rounded-2xl border border-[#E2D6C3] bg-[#EFE8DC] shadow-[inset_0_2px_6px_rgba(0,0,0,0.05)] p-3 sm:p-5 flex flex-col gap-4">
            <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center justify-items-center gap-6 py-4">
              {bigGuessCard("left")}
              {currentStack}
              {bigGuessCard("right")}
            </div>

            <div className="lg:hidden flex items-stretch gap-3">
              <div className="flex-none pt-3 pr-2">{currentStack}</div>

              <div className="flex flex-col items-center self-stretch text-[11px] font-bold text-stone-500 py-1">
                <span>K</span>
                <ChevronUp className="w-3.5 h-3.5" />
                <div className="flex-1 w-px bg-stone-400" />
                <ChevronDown className="w-3.5 h-3.5" />
                <span>A</span>
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                {guessRow("left")}
                {guessRow("right")}
              </div>
            </div>

            {/* Skip card (mobiili): kertoimen yläpuolella */}
            <button
              type="button"
              onClick={skipCard}
              className="lg:hidden w-full py-3 rounded-xl border-2 border-[#2D2621] bg-[#FAF6F0] hover:bg-[#EFE8DC] text-[#2D2621] font-serif font-bold text-sm transition-all active:scale-[0.98] cursor-pointer shadow-sm"
            >
              Skip card
            </button>

            {playing ? (
              <div className="rounded-xl border-2 border-[#D4AF37] bg-gradient-to-r from-[#FBF3D5] to-[#F3E5AB] px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[11px] sm:text-xs font-serif font-bold uppercase tracking-wider text-amber-900">
                    Current multiplier
                  </span>
                  {cumMult === 1 && (
                    <span className="text-[11px] font-serif text-amber-800 mt-0.5">
                      Pick higher or lower
                    </span>
                  )}
                </div>
                <span className="text-3xl sm:text-4xl font-mono font-extrabold text-amber-950 leading-none">
                  x{cumMult.toFixed(2)}
                </span>
              </div>
            ) : status === "cashed" ? (
              <motion.div
                key="cashed-banner"
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="relative overflow-hidden rounded-2xl border border-[#D4AF37] bg-[radial-gradient(ellipse_at_center,#FFA20F_0%,#EE8100_55%,#D96F00_100%)] shadow-[0_10px_24px_rgba(238,129,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.45)] px-4 py-4 flex items-center justify-between gap-2"
              >
                <Leaf className="w-7 h-7 sm:w-9 sm:h-9 text-lime-200 -rotate-[35deg] flex-none drop-shadow" />
                <div className="flex flex-col items-center text-center min-w-0">
                  <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-serif font-bold uppercase tracking-[0.18em] text-amber-50">
                    <Sparkles className="w-3.5 h-3.5 text-amber-100" />
                    Cashed out x{cumMult.toFixed(2)}
                  </span>
                  <span className="text-3xl sm:text-4xl font-serif font-extrabold text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] truncate max-w-full">
                    +{(payout - roundBet).toFixed(2)} USD
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-amber-50">
                    Payout {fmt(payout)}
                  </span>
                </div>
                <Leaf className="w-7 h-7 sm:w-9 sm:h-9 text-lime-200 rotate-[35deg] scale-x-[-1] flex-none drop-shadow" />
              </motion.div>
            ) : status === "lost" ? (
              <motion.div
                key="lost-banner"
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="rounded-2xl border border-rose-500 bg-[radial-gradient(ellipse_at_center,#EF5B67_0%,#D93645_60%,#B8232E_100%)] shadow-[0_10px_24px_rgba(217,54,69,0.3),inset_0_1px_2px_rgba(255,255,255,0.35)] px-4 py-4 flex flex-col items-center text-center"
              >
                <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-serif font-bold uppercase tracking-[0.18em] text-rose-50">
                  <X className="w-3.5 h-3.5" strokeWidth={3} />
                  Round lost
                </span>
                <span className="text-3xl sm:text-4xl font-serif font-extrabold text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                  -{roundBet.toFixed(2)} USD
                </span>
                {lossNote && (
                  <span className="mt-1 text-[11px] sm:text-xs font-serif font-semibold text-rose-50">
                    {lossNote}
                  </span>
                )}
              </motion.div>
            ) : (
              <div
                className={`rounded-xl border px-4 py-2.5 text-center text-xs sm:text-sm font-serif font-bold whitespace-pre ${statusPill.cls}`}
              >
                {statusPill.text}
              </div>
            )}

            {/* Historia */}
            <div
              ref={historyRef}
              className="rounded-xl border border-[#E2D6C3] bg-[#F4EFE6] shadow-inner px-3 sm:px-4 py-3 overflow-x-auto min-h-[148px] sm:min-h-[196px] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#EFE8DC] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/50 [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              {history.length === 0 ? (
                <div className="h-[110px] sm:h-[160px] flex items-center justify-center text-xs text-[#8C827A] font-serif">
                  Your cards will appear here
                </div>
              ) : (
                <div className="flex items-start w-max pr-2">
                  {history.slice(-5).map((step, index) => {
                    const label = step.skipped
                      ? { text: "Skipped", cls: "bg-[#D9CDB6] text-[#5C5249]" }
                      : step.result === null
                        ? { text: "Start card", cls: "bg-emerald-600 text-white" }
                        : step.result === "loss"
                          ? { text: "Lost", cls: "bg-rose-600 text-white" }
                          : {
                              text: `${(step.mult ?? 1).toFixed(2)}x`,
                              cls: "bg-emerald-600 text-white",
                            };
                    const badgeCls =
                      step.result === "win"
                        ? "bg-emerald-500 text-white"
                        : step.result === "loss"
                          ? "bg-rose-500 text-white"
                          : "bg-stone-400 text-white";
                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, scale: 0.7, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 26 }}
                        className={`relative flex-none flex flex-col items-center gap-1.5 ${
                          index > 0 ? "ml-6" : ""
                        }`}
                      >
                        {index > 0 && (
                          <div
                            className={`absolute -left-[22px] top-[40px] sm:top-[57px] -translate-y-1/2 z-10 w-5 h-5 rounded-md flex items-center justify-center shadow ${badgeCls}`}
                          >
                            {step.guess === "higher" ? (
                              <ArrowUp className="w-3 h-3" strokeWidth={3} />
                            ) : step.guess === "lower" ? (
                              <ArrowDown className="w-3 h-3" strokeWidth={3} />
                            ) : step.guess === "same" ? (
                              <Equal className="w-3 h-3" strokeWidth={3} />
                            ) : (
                              <ChevronsRight className="w-3 h-3" strokeWidth={3} />
                            )}
                          </div>
                        )}
                        <CardFace
                          card={step.card}
                          className={`w-[56px] h-[80px] sm:w-[80px] sm:h-[114px] ${
                            step.result === "loss"
                              ? "ring-2 ring-rose-500"
                              : ""
                          } ${step.skipped ? "grayscale brightness-95" : ""}`}
                          rankClass="text-2xl sm:text-4xl"
                          suitClass="text-lg sm:text-2xl"
                        />
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] sm:text-[11px] font-bold font-mono whitespace-nowrap ${label.cls}`}
                        >
                          {label.text}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CONTROLS */}
          <div className="order-2 lg:order-1 rounded-2xl p-3 sm:p-4 border border-[#E5DAC8] bg-[#F4EFE6] flex flex-col gap-4">
            <button
              onClick={handleMainButton}
              disabled={mainDisabled}
              className={`order-1 lg:order-4 w-full py-3.5 px-2 text-white font-serif font-bold text-sm sm:text-base rounded-2xl shadow-lg border cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap leading-tight disabled:cursor-not-allowed ${
                playing
                  ? "bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 enabled:hover:from-emerald-600 enabled:hover:to-emerald-700 border-emerald-400/50 disabled:from-stone-500 disabled:via-stone-500 disabled:to-stone-600 disabled:border-stone-400"
                  : "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-500 hover:to-amber-600 border-amber-400/50"
              }`}
            >
              {mainLabel}
            </button>

            <div className="order-2 lg:order-1 flex flex-col gap-2">
              <div className="text-xs font-semibold px-1 text-[#8C827A]">
                Bet Amount
              </div>
              <div
                className={`flex items-center rounded-xl px-3 bg-[#FAF6F0] border border-[#E2D6C3] shadow-inner justify-between ${
                  betError ? "flash-error" : ""
                }`}
              >
                <div className="flex items-center flex-1 mr-2">
                  <span className="text-sm font-semibold mr-1 text-[#8C827A]">
                    $
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={betAmount}
                    disabled={playing}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="gyre-num bg-transparent outline-none py-2 w-full text-base font-bold font-mono text-[#2D2621] disabled:opacity-100 disabled:text-[#8C827A]"
                  />
                </div>
                <button
                  onClick={clearBet}
                  disabled={playing}
                  className="text-xs font-semibold text-[#8C827A] hover:text-[#2D2621] px-2 py-1 rounded-lg hover:bg-[#E2D6C3]/40 transition-colors disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "+1", action: () => addBet(1) },
                  { label: "+5", action: () => addBet(5) },
                  { label: "+10", action: () => addBet(10) },
                  { label: "+100", action: () => addBet(100) },
                  { label: "1/2", action: () => scaleBet(0.5) },
                  { label: "X2", action: () => scaleBet(2) },
                  { label: "MAX", action: maxBet },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    disabled={playing}
                    className={`gyre-btn px-2 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-sm text-center disabled:cursor-not-allowed ${
                      btn.label === "MAX" ? "col-span-2" : ""
                    }`}
                    onClick={btn.action}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex lg:order-2 flex-col gap-2">
              {guessRow("left")}
              {guessRow("right")}
            </div>

            {/* Skip card (työpöytä): mobiilissa nappi on pelilaudalla kertoimen yläpuolella */}
            <button
              type="button"
              onClick={skipCard}
              className="hidden lg:block lg:order-3 w-full py-3 rounded-xl border-2 border-[#2D2621] bg-[#FAF6F0] hover:bg-[#EFE8DC] text-[#2D2621] font-serif font-bold text-sm transition-all active:scale-[0.98] cursor-pointer shadow-sm"
            >
              Skip card
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#E5DAC8] text-xs">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#EFE8DC] text-amber-800">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-stone-800">52 Cards</div>
              <div className="text-[10px] text-stone-500">
                Ace is low, King is high
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#EFE8DC] text-amber-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-stone-800">Provably Random</div>
              <div className="text-[10px] text-stone-500">
                Unbiased CSPRNG Engine
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsWalletOpen(true)}
            className="flex items-center gap-2 text-left p-2 rounded-xl hover:bg-[#EFE8DC]/60 transition-colors group cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-[#EFE8DC] text-amber-800 group-hover:bg-amber-100 transition-colors">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-stone-800 group-hover:text-amber-800 transition-colors">
                Disclaimer
              </div>
              <div className="text-[10px] text-stone-500">
                For Entertainment Only
              </div>
            </div>
          </button>
        </div>
      </div>

      <p className="text-[11px] mt-4 text-center text-stone-500">
        Hi-Lo is a simulated entertainment application using non-monetary demo
        credits. No real money gambling or rewards are offered.
      </p>

      <DemoWalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
      />
    </div>
  );
}