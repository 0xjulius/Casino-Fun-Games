"use client";

import { useState, useEffect } from "react";
import { 
  CircleDollarSign, 
  Rocket, 
  RefreshCw, 
  Triangle, 
  Dices, 
  Gem, 
  Bomb,
  Layers, 
  ChevronLeft,
  ChevronRight,
  MessageSquare
} from "lucide-react";

interface SidebarProps {
  activeGame?: string;
  onSelectGame?: (game: string) => void;
  onOpenChat?: () => void;
}

const navItems = [
  { name: "Roulette", icon: CircleDollarSign, available: true },
  { name: "Crash", icon: Rocket, available: true },
  { name: "Hilo", icon: Layers, available: true, isNew: true },
  { name: "Plinko", icon: Triangle, available: true },
  { name: "Duels", icon: RefreshCw, available: false },
  { name: "Dice", icon: Dices, available: false },
  { name: "Towers", icon: Gem, available: false },
  { name: "Mines", icon: Bomb, available: false },
];

export default function Sidebar({ activeGame = "Plinko", onSelectGame, onOpenChat }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleItemClick = (item: typeof navItems[0]) => {
    if (!item.available) return;
    onSelectGame?.(item.name);
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <aside className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FAF6F0]/95 backdrop-blur-md border-t border-[#E2D6C3] flex items-center justify-around p-2 shadow-lg overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeGame === item.name;

          return (
            <button
              key={item.name}
              onClick={() => handleItemClick(item)}
              disabled={!item.available}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative shrink-0 ${
                !item.available
                  ? "opacity-40 cursor-not-allowed"
                  : isActive
                  ? "bg-[#D4AF37]/20 text-[#8C6D18] border border-[#D4AF37]/40 shadow-inner cursor-pointer"
                  : "text-[#8C827A] hover:text-[#2D2621] cursor-pointer"
              }`}
              title={item.available ? item.name : `${item.name} (Coming soon)`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#D4AF37]" : "text-[#8C827A]"}`} />
              {item.isNew && item.available && (
                <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[9px] font-bold px-1 rounded-full uppercase tracking-tighter shadow-sm animate-pulse">
                  New
                </span>
              )}
            </button>
          );
        })}

        <button
          onClick={onOpenChat}
          className="p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center text-[#8C827A] hover:text-[#2D2621] bg-[#D4AF37]/10 border border-[#D4AF37]/30 shrink-0"
          title="Avaa chat"
        >
          <MessageSquare className="w-5 h-5 text-amber-700" />
        </button>
      </aside>

      {/* Desktop Collapsible Sidebar */}
      <aside 
        className={`hidden md:flex flex-col bg-[#FAF6F0]/90 backdrop-blur-md border-r border-[#E2D6C3] select-none shrink-0 shadow-sm z-40 transition-all duration-300 h-full ${
          isCollapsed ? "w-20 p-3" : "w-64 p-4"
        }`}
      >
        <div className={`flex items-center mb-6 pt-2 ${isCollapsed ? "justify-center px-0" : "justify-between px-2"}`}>
          {!isCollapsed && (
            <span className="font-serif font-bold text-lg tracking-wide text-[#2D2621]">
              Lobby <span className="text-amber-600">✦</span>
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-[#F0E8DC]/80 hover:bg-[#E2D6C3] text-[#2D2621] transition-all cursor-pointer"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="space-y-1.5 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeGame === item.name;

            return (
              <button
                key={item.name}
                onClick={() => handleItemClick(item)}
                disabled={!item.available}
                className={`w-full flex items-center ${
                  isCollapsed ? "justify-center py-3 px-0" : "justify-between px-3 py-3"
                } rounded-2xl font-medium text-sm transition-all ${
                  !item.available
                    ? "opacity-50 cursor-not-allowed bg-transparent text-[#8C827A]/60 border border-transparent"
                    : isActive
                    ? "bg-[#D4AF37]/15 text-[#8C6D18] border border-[#D4AF37]/40 shadow-inner font-bold cursor-pointer"
                    : "text-[#8C827A] hover:text-[#2D2621] hover:bg-[#F0E8DC]/60 border border-transparent cursor-pointer"
                }`}
                title={isCollapsed ? (!item.available ? `${item.name} (Coming soon)` : item.name) : undefined}
              >
                <div className="flex items-center gap-3.5 truncate">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-[#D4AF37]" : "text-[#8C827A]"}`} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1.5">
                    {item.isNew && item.available && (
                      <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 border border-amber-400/50 shrink-0">
                        New
                      </span>
                    )}
                    {!item.available && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#EFE8DC] text-stone-500 border border-[#E2D6C3]/60 shrink-0">
                        Soon
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}