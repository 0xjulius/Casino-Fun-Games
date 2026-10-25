import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface HistoryCardTooltipProps {
  isOpen: boolean;
  targetRect: DOMRect | null;
  cardRank: string;
  cardSuit: string;
  roundBet: number;
  stepMult: number | null;
  cumMultBefore: number | null;
  cumMultTotal?: number | null;
  isLoss: boolean;
  isCashed?: boolean;
  isStartCard?: boolean;
  isCurrentCard?: boolean;
  isSkipped?: boolean;
}

export default function HistoryCardTooltip({
  isOpen,
  targetRect,
  cardRank,
  cardSuit,
  roundBet,
  stepMult,
  cumMultBefore,
  cumMultTotal,
  isLoss,
  isCashed,
  isStartCard,
  isCurrentCard,
  isSkipped,
}: HistoryCardTooltipProps) {
  if (!targetRect) return null;

  // Tooltipin kiinteä leveys pikseleinä (w-48 = 192px)
  const tooltipWidth = 192;
  const padding = 12; // Turvamarginaali näytön reunaan

  const top = targetRect.top + window.scrollY - 8;
  const cardCenterX = targetRect.left + window.scrollX + targetRect.width / 2;

  let leftPos = cardCenterX - tooltipWidth / 2;

  if (leftPos < padding) {
    leftPos = padding;
  } else if (leftPos + tooltipWidth > window.innerWidth - padding) {
    leftPos = window.innerWidth - tooltipWidth - padding;
  }

  if (isSkipped) {
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: `${top}px`,
              left: `${leftPos}px`,
              transform: "translateY(-100%)",
            }}
            className="z-[9999] w-48 rounded-xl bg-[#1A1613] border border-[#D4AF37]/40 shadow-[0_10px_25px_rgba(0,0,0,0.6)] p-2.5 text-xs text-[#FAF6F0] font-mono pointer-events-none"
          >
            <div className="flex items-center justify-between border-b border-[#3D332B] pb-1.5 mb-1.5 font-serif font-bold text-amber-400">
              <span>Skipped Card</span>
              <span className="text-xl text-[#FAF6F0] font-bold">
                {cardRank}
                {cardSuit}
              </span>
            </div>
            <div className="flex justify-between items-center text-[#A3988E] text-[11px] py-0.5">
              <span>Bet</span>
              <span className="text-[#FAF6F0] font-bold">-</span>
            </div>
            <div className="flex justify-between items-center text-[#A3988E] text-[11px] py-0.5">
              <span>Multiplier</span>
              <span className="text-amber-400 font-bold">-</span>
            </div>
            <div className="flex justify-between items-center text-[#A3988E] text-[11px] py-0.5">
              <span>Payout</span>
              <span className="text-[#FAF6F0] font-bold">-</span>
            </div>
            <div className="flex justify-between items-center text-[#A3988E] text-[11px] pt-1 border-t border-[#3D332B] mt-1">
              <span>Profit</span>
              <span className="font-bold text-[#A3988E]">-</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  // Vain jos kyseessä on aidosti alkukortti eikä nykyinen peli/kotiutus
  if (isStartCard && !isCashed && !isCurrentCard) {
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: `${top}px`,
              left: `${leftPos}px`,
              transform: "translateY(-100%)",
            }}
            className="z-[9999] w-48 rounded-xl bg-[#1A1613] border border-[#D4AF37]/40 shadow-[0_10px_25px_rgba(0,0,0,0.6)] p-2.5 text-xs text-[#FAF6F0] font-mono pointer-events-none"
          >
            <div className="flex items-center justify-between border-b border-[#3D332B] pb-1.5 mb-1.5 font-serif font-bold text-amber-400">
              <span>Start Card</span>
              <span className="text-xl text-[#FAF6F0] font-bold">
                {cardRank}
                {cardSuit}
              </span>
            </div>
            <div className="flex justify-between items-center text-[#A3988E] text-[11px] py-0.5">
              <span>Bet</span>
              <span className="text-[#FAF6F0] font-bold">
                ${roundBet.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[#A3988E] text-[11px] py-0.5">
              <span>Multiplier</span>
              <span className="text-amber-400 font-bold">-</span>
            </div>
            <div className="flex justify-between items-center text-[#A3988E] text-[11px] py-0.5">
              <span>Payout</span>
              <span className="text-[#FAF6F0] font-bold">
                ${roundBet.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[#A3988E] text-[11px] pt-1 border-t border-[#3D332B] mt-1">
              <span>Profit</span>
              <span className="font-bold text-[#A3988E]">$0.00</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  const stepBet = roundBet * (cumMultBefore ?? 1);
  const finalMult = isCashed
    ? (cumMultTotal ?? cumMultBefore ?? 1)
    : (stepMult ?? 1);
  const stepPayout = isLoss
    ? 0
    : isCashed
      ? roundBet * finalMult
      : stepBet * finalMult;
  const stepProfit = isLoss
    ? -stepBet
    : isCashed
      ? stepPayout - roundBet
      : stepPayout - stepBet;

  // Otsikko: jos kotiutettu -> "Cashed Out", jos nykyinen kortti -> "Current Card", muuten "Card:"
  const headerTitle = isCashed
    ? "Cashed Out"
    : isCurrentCard
      ? "Current Card"
      : "Card:";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "absolute",
            top: `${top}px`,
            left: `${leftPos}px`,
            transform: "translateY(-100%)",
          }}
          className="z-[9999] w-48 rounded-xl bg-[#1A1613] border border-[#D4AF37]/40 shadow-[0_10px_25px_rgba(0,0,0,0.6)] p-2.5 text-xs text-[#FAF6F0] font-mono pointer-events-none"
        >
          <div className="flex items-center justify-between border-b border-[#3D332B] pb-1.5 mb-1.5 font-serif font-bold text-amber-400">
            <span>{headerTitle}</span>
            <span className="text-xl text-[#FAF6F0] font-bold">
              {cardRank}
              {cardSuit}
            </span>
          </div>

          <div className="flex justify-between items-center text-[#A3988E] text-[11px] py-0.5">
            <span>Bet</span>
            <span className="text-[#FAF6F0] font-bold">
              ${(isCashed ? roundBet : stepBet).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center text-[#A3988E] text-[11px] py-0.5">
            <span>Multiplier</span>
            <span className="text-amber-400 font-bold">
              {isCurrentCard && !isCashed
                ? "-"
                : isLoss
                  ? "0.00x"
                  : `${finalMult.toFixed(2)}x`}
            </span>
          </div>

          <div className="flex justify-between items-center text-[#A3988E] text-[11px] py-0.5">
            <span>Payout</span>
            <span className="text-[#FAF6F0] font-bold">
              {isCurrentCard && !isCashed
                ? `$${stepBet.toFixed(2)}`
                : isLoss
                  ? "$0.00"
                  : `$${stepPayout.toFixed(2)}`}
            </span>
          </div>

          <div className="flex justify-between items-center text-[#A3988E] text-[11px] pt-1 border-t border-[#3D332B] mt-1">
            <span>Profit</span>
            {isCurrentCard && !isCashed ? (
              <span className="font-bold text-[#A3988E]">-</span>
            ) : (
              <span
                className={`font-bold ${
                  isLoss
                    ? "text-rose-400"
                    : stepProfit >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                }`}
              >
                {isLoss
                  ? `-$${stepBet.toFixed(2)}`
                  : stepProfit >= 0
                    ? `+$${stepProfit.toFixed(2)}`
                    : `-$${Math.abs(stepProfit).toFixed(2)}`}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}