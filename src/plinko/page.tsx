"use client";

import { useState } from "react";
import Sidebar from "../components/SideBar";
import Chat from "../components/Chat";
import Header from "../components/Header";
import GoldDust from "../components/GoldDust";
import PlinkoGame from "../components/PlinkoGame";
import bgImage from "../assets/bg2.png";

export default function PlinkoPage() {
  const [activeGame, setActiveGame] = useState("Plinko");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  
  const [balance, setBalance] = useState(2000.00);

  return (
    <div
      className="fixed inset-0 w-full h-full flex flex-row overflow-hidden select-none"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* 1. Vasen sivupalkki (Kiinteä, ei saa kutistua) */}
      <div className="h-full shrink-0 z-40 hidden md:block">
        <Sidebar 
          activeGame={activeGame} 
          onSelectGame={(game) => {
            setActiveGame(game);
            if (game === "Crash") {
              window.location.href = "/crash";
            } else if (game === "Roulette") {
              window.location.href = "/";
            }
          }} 
          onOpenChat={() => setMobileChatOpen(true)}
        />
      </div>

      {/* Mobiilin alavalikko */}
      <div className="md:hidden">
        <Sidebar 
          activeGame={activeGame} 
          onSelectGame={(game) => {
            setActiveGame(game);
            if (game === "Crash") {
              window.location.href = "/crash";
            } else if (game === "Roulette") {
              window.location.href = "/";
            }
          }} 
          onOpenChat={() => setMobileChatOpen(true)}
        />
      </div>

      {/* 2. Keskialue: Header + Pelialue (flex-1 ja min-w-0 pakottavat tämän joustamaan täydellisesti sivupalkin ja chatin välissä) */}
      <div className="flex-1 relative flex flex-col h-full overflow-hidden min-w-0">
        
        {/* Kasinon kiinteä yläpalkki */}
        <div className="shrink-0 z-30">
          <Header 
            balance={balance} 
            onDeposit={() => setBalance((prev) => prev + 100.00)} 
          />
        </div>

        {/* Pelialueen rullaava kontaineri */}
        <div className="flex-1 relative flex flex-col items-center justify-start overflow-y-auto pb-28 md:pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <GoldDust />

          <main className="w-full z-20 px-2 sm:px-4 pt-28 sm:pt-24 max-w-6xl mx-auto flex justify-center">
            <PlinkoGame 
              balance={balance}
              setBalance={setBalance}
            />
          </main>
        </div>
      </div>

      {/* 3. Oikea chatti (Hoitaa desktopin sivupalkin ja mobiilin modaalin itse) */}
      <Chat mobileOpen={mobileChatOpen} onCloseMobile={() => setMobileChatOpen(false)} />
    </div>
  );
}