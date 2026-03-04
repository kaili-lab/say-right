/**
 * 应用主导航壳层。
 *
 * WHAT: 提供统一顶部/底部导航与桌面端头像菜单。
 * WHY: 保证四个主 Tab 的布局一致，并把账号菜单行为集中在一个入口维护。
 */
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { clearSession, logoutAccount, readSessionEmail } from "../pages/authApi";
import { DESKTOP_TABS, MOBILE_TABS } from "./navigation";

const navBase =
  "rounded-xl px-3 py-2 text-sm font-medium text-stone-500 transition hover:bg-orange-50 hover:text-orange-500";
const navActive = "bg-orange-50 text-orange-500 font-semibold";

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);

  const sessionEmail = readSessionEmail();
  const avatarText = useMemo(() => {
    const normalizedEmail = sessionEmail?.trim() ?? "";
    return normalizedEmail ? normalizedEmail[0]!.toUpperCase() : "K";
  }, [sessionEmail]);

  useEffect(() => {
    if (!isAvatarMenuOpen) {
      return;
    }

    // 仅在菜单打开时监听全局事件，避免长期挂载无效监听器。
    function handleOutsideClick(event: MouseEvent) {
      if (!avatarMenuRef.current?.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    }

    function handleEscClose(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAvatarMenuOpen(false);
      }
    }

    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEscClose);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleEscClose);
    };
  }, [isAvatarMenuOpen]);

  function handleAccountInfoClick() {
    setIsAvatarMenuOpen(false);
    navigate("/me");
  }

  async function handleLogout() {
    try {
      await logoutAccount();
    } catch {
      // 登出端点失败不阻断本地会话清理，保证用户可立即退出。
    } finally {
      clearSession();
      setIsAvatarMenuOpen(false);
      navigate("/auth/login", { replace: true, state: { notice: "已退出登录。" } });
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-800 md:h-screen md:flex md:flex-col md:overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#faf9f6]/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-orange-500 text-xs font-extrabold text-white">
              SR
            </span>
            <span className="text-sm font-bold text-amber-800">Say Right</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
            {DESKTOP_TABS.map((tab) => (
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

          <div ref={avatarMenuRef} className="relative hidden md:block">
            <button
              type="button"
              aria-label="用户菜单"
              aria-haspopup="menu"
              aria-expanded={isAvatarMenuOpen}
              onClick={() => setIsAvatarMenuOpen((previous) => !previous)}
              className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-xs font-semibold text-amber-800 transition hover:bg-orange-200"
            >
              {avatarText}
            </button>

            {isAvatarMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-[42px] min-w-[190px] rounded-xl border border-stone-200 bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleAccountInfoClick}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-orange-50"
                >
                  账号信息
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 transition hover:bg-red-50"
                >
                  退出登录
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-6 md:min-h-0 md:flex-1 md:overflow-y-auto md:px-6 md:pb-8">
        {children}
      </main>

      <nav
        aria-label="移动端主导航"
        data-testid="bottom-nav"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-stone-200 bg-[#faf9f6]/95 p-2 pb-[calc(env(safe-area-inset-bottom,8px)+8px)] backdrop-blur md:hidden"
      >
        {MOBILE_TABS.map((tab) => (
          <NavLink
            key={`mobile-${tab.path}`}
            to={tab.path}
            className={({ isActive }) =>
              `rounded-lg px-2 py-2 text-center text-xs font-medium ${isActive ? "text-orange-500" : "text-stone-500"}`
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
