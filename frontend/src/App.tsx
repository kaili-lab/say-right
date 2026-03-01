import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./app/AppShell";
import { HomePage } from "./pages/HomePage";
import { TabPlaceholderPage } from "./pages/TabPlaceholderPage";

/**
 * 应用根组件。
 * 首页已接入真实 HomePage，其余 Tab 在对应任务中逐步替换。
 */
function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/record" element={<TabPlaceholderPage title="记录" description="记录页占位路由。" />} />
        <Route path="/review" element={<TabPlaceholderPage title="复习" description="复习页占位路由。" />} />
        <Route path="/decks" element={<TabPlaceholderPage title="卡片组" description="卡片组页占位路由。" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
