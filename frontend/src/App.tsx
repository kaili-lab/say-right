/**
 * 前端应用入口占位页。
 * UI-002 仅需验证工程已启动，业务壳层在 UI-003 再引入。
 */
function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
      <section className="rounded-2xl border border-orange-200 bg-white px-10 py-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-orange-700">应用已启动</h1>
        <p className="mt-3 text-sm text-slate-600">React 前端工程与测试基线初始化完成。</p>
      </section>
    </main>
  );
}

export default App;
