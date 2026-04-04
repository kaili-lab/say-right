import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "./app/AppShell";
import { AuthLoginPage } from "./pages/AuthLoginPage";
import { AuthRegisterPage } from "./pages/AuthRegisterPage";
import { DeckListPage } from "./pages/DeckListPage";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { MePage } from "./pages/MePage";
import { RecordPage } from "./pages/RecordPage";
import { ReviewDeckListPage } from "./pages/ReviewDeckListPage";
import { ReviewSessionPage } from "./pages/ReviewSessionPage";
import { readAccessToken } from "./pages/authApi";

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

function RequireAuthLayout() {
  const accessToken = readAccessToken();
  if (!accessToken) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

function GuestOnlyLayout() {
  const accessToken = readAccessToken();
  if (accessToken) {
    return <Navigate to="/app" replace />;
  }
  return <Outlet />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<GuestOnlyLayout />}>
        <Route path="/auth/login" element={<AuthLoginPage />} />
        <Route path="/auth/register" element={<AuthRegisterPage />} />
      </Route>
      <Route element={<RequireAuthLayout />}>
        <Route element={<ShellLayout />}>
          <Route path="/app" element={<HomePage />} />
          <Route path="/record" element={<RecordPage />} />
          <Route path="/review" element={<ReviewDeckListPage />} />
          <Route path="/review/session/:deckId" element={<ReviewSessionPage />} />
          <Route path="/decks" element={<DeckListPage />} />
          <Route path="/me" element={<MePage />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
