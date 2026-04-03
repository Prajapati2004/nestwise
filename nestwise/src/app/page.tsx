"use client";

import { useState } from "react";
import TopBar from "./components/TopBar";
import NavBar from "./components/NavBar";
import SearchPage from "./components/SearchPage";
import CalculatorPage from "./components/CalculatorPage";
import InboxPage from "./components/InboxPage";
import TrackerPage from "./components/TrackerPage";
import RealtorsPage from "./components/RealtorsPage";
import AiAdvisorPage from "./components/AiAdvisorPage";

export type PageId =
  | "search"
  | "calculator"
  | "inbox"
  | "tracker"
  | "realtors"
  | "ai";

export default function Home() {
  const [activePage, setActivePage] = useState<PageId>("search");
  const [aiSeedQuestion, setAiSeedQuestion] = useState<string | null>(null);

  function navigateToAi(question: string) {
    setAiSeedQuestion(question);
    setActivePage("ai");
  }

  return (
    <>
      <TopBar />
      <NavBar activePage={activePage} setActivePage={setActivePage} />
      <main>
        {activePage === "search" && (
          <SearchPage onAskAi={navigateToAi} />
        )}
        {activePage === "calculator" && <CalculatorPage />}
        {activePage === "inbox" && <InboxPage />}
        {activePage === "tracker" && <TrackerPage />}
        {activePage === "realtors" && (
          <RealtorsPage onAskAi={navigateToAi} />
        )}
        {activePage === "ai" && (
          <AiAdvisorPage
            seedQuestion={aiSeedQuestion}
            onSeedConsumed={() => setAiSeedQuestion(null)}
          />
        )}
      </main>
    </>
  );
}
