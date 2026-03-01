import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

import { MAIN_TABS } from "./navigation";

const navBase =
  "rounded-xl px-3 py-2 text-sm font-medium text-stone-500 transition hover:bg-orange-50 hover:text-orange-500";
const navActive = "bg-orange-50 text-orange-500 font-semibold";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-800">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#faf9f6]/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-orange-500 text-xs font-extrabold text-white">
              SR
            </span>
            <span className="text-sm font-bold text-amber-800">Say Right</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
            {MAIN_TABS.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) => `${navBase} ${isActive ? navActive : ""}`}
                end={tab.path === "/"}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-amber-800 md:flex">
            K
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-6 md:px-6 md:pb-8">{children}</main>

      <nav
        aria-label="移动端主导航"
        data-testid="bottom-nav"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-stone-200 bg-[#faf9f6]/95 p-2 pb-[calc(env(safe-area-inset-bottom,8px)+8px)] backdrop-blur md:hidden"
      >
        {MAIN_TABS.map((tab) => (
          <NavLink
            key={`mobile-${tab.path}`}
            to={tab.path}
            className={({ isActive }) =>
              `rounded-lg px-2 py-2 text-center text-xs font-medium ${
                isActive ? "text-orange-500" : "text-stone-500"
              }`
            }
            end={tab.path === "/"}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
