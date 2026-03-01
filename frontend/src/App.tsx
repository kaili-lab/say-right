import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "./app/AppShell";
import { AuthLoginPage } from "./pages/AuthLoginPage";
import { AuthRegisterPage } from "./pages/AuthRegisterPage";
import { DeckListPage } from "./pages/DeckListPage";
import { HomePage } from "./pages/HomePage";
import { RecordPage } from "./pages/RecordPage";
import { ReviewDeckListPage } from "./pages/ReviewDeckListPage";
import { ReviewSessionPage } from "./pages/ReviewSessionPage";

/**
 * 应用根路由组件。
 * 认证页独立于主导航壳层，业务主路径统一走 AppShell。
 */
function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/auth/login" element={<AuthLoginPage />} />
      <Route path="/auth/register" element={<AuthRegisterPage />} />
      <Route element={<ShellLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/review" element={<ReviewDeckListPage />} />
        <Route path="/review/session/:deckId" element={<ReviewSessionPage />} />
        <Route path="/decks" element={<DeckListPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
