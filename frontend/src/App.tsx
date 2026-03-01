import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./app/AppShell";
import { DeckListPage } from "./pages/DeckListPage";
import { HomePage } from "./pages/HomePage";
import { RecordPage } from "./pages/RecordPage";
import { ReviewDeckListPage } from "./pages/ReviewDeckListPage";
import { ReviewSessionPage } from "./pages/ReviewSessionPage";

/**
 * 应用根组件。
 * 首页/记录/复习/卡片组四个主 Tab 已接入真实页面。
 */
function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/review" element={<ReviewDeckListPage />} />
        <Route path="/review/session/:deckId" element={<ReviewSessionPage />} />
        <Route path="/decks" element={<DeckListPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
