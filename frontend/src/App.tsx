import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./app/AppShell";
import { TabPlaceholderPage } from "./pages/TabPlaceholderPage";

/**
 * 应用根组件。
 * UI-003 阶段先搭好 AppShell 和四个 Tab 占位路由，后续任务逐页替换成真实业务页。
 */
function App() {
  return (
    <AppShell>
      <Routes>
        <Route
          path="/"
          element={<TabPlaceholderPage title="首页" description="应用已启动 · 首页占位路由已就绪。" />}
        />
        <Route path="/record" element={<TabPlaceholderPage title="记录" description="记录页占位路由。" />} />
        <Route path="/review" element={<TabPlaceholderPage title="复习" description="复习页占位路由。" />} />
        <Route path="/decks" element={<TabPlaceholderPage title="卡片组" description="卡片组页占位路由。" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
