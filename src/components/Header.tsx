import { PlusCircle, Bell, User} from "lucide-react";

interface HeaderProps {
  balance?: number;
  onDeposit?: () => void;
}

export default function Header({ balance = 1250.50, onDeposit }: HeaderProps) {
  // Muotoillaan saldo selkeäksi dollarisummaksi ($2,000.00)
  const formattedBalance = "$" + balance.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <header className="absolute top-0 left-0 right-0 z-30 h-16 bg-[#FAF6F0]/90 backdrop-blur-md border-b border-[#E2D6C3] px-2.5 sm:px-6 flex items-center justify-between select-none shadow-xs">
      
      {/* Vasen reuna: Suurennettu päällekkäinen AGORA PLAY -logo */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#AA7C11] flex items-center justify-center text-[#FAF6F0] font-serif font-bold text-xl sm:text-2xl shadow-md border border-[#F3E5AB] shrink-0">
          ✦
        </div>
        <div className="flex flex-col justify-center leading-none">
          <span className="font-serif font-extrabold text-md sm:text-base tracking-[0.18em] text-[#2D2621]">
            AGORA
          </span>
          <span className="font-serif font-bold text-md sm:text-sm tracking-[0.22em] text-amber-600 mt-0.5">
            Play
          </span>
        </div>
      </div>

      {/* Oikea reuna: Saldo, talletus ja profiili */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        
        {/* Saldo-laatikko (BALANCE $2,000.00) */}
        <div className="flex items-center gap-1.5 bg-[#F4EBE1]/90 border border-[#E2D6C3] px-2.5 sm:px-3 py-1.5 rounded-xl shadow-inner whitespace-nowrap">
          <div className="flex flex-col text-right">
            <span className="text-[8px] sm:text-[9px] text-[#8C827A] font-bold leading-none uppercase tracking-wider">
              BALANCE
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#2D2621] font-mono tracking-tight leading-tight mt-0.5">
              {formattedBalance}
            </span>
          </div>
        </div>

        {/* Talleta-painike */}
        <button
          onClick={onDeposit}
          className="flex items-center justify-center gap-1 bg-gradient-to-r from-[#D4AF37] to-[#C59B27] hover:from-[#E2BE48] hover:to-[#D4AF37] text-[#2D2621] font-bold text-xs px-2.5 sm:px-3.5 py-2 rounded-xl shadow-sm border border-[#F3E5AB] transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          title="Deposit"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#2D2621] shrink-0" />
          <span className="hidden sm:inline">Deposit</span>
        </button>

        {/* Ilmoitukset */}
        <button 
          className="p-1.5 sm:p-2 rounded-xl bg-[#F0E8DC]/80 hover:bg-[#E2D6C3] text-[#2D2621] transition-all cursor-pointer border border-[#E2D6C3] shadow-xs relative shrink-0"
          title="Notifications"
        >
          <Bell className="w-3.5 h-3.5 text-[#4A423C]" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
        </button>

        {/* Profiili */}
        <div className="flex items-center pl-1 sm:pl-1.5 border-l border-[#E2D6C3] shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F0E8DC] border border-[#D4AF37]/50 flex items-center justify-center text-[#2D2621] font-bold shadow-xs cursor-pointer hover:bg-[#E2D6C3] transition-all">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-800" />
          </div>
        </div>

      </div>
    </header>
  );
}