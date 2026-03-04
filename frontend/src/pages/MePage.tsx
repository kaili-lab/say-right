/**
 * 个人中心页。
 *
 * WHAT: 展示当前用户邮箱与昵称，提供退出登录入口。
 * WHY: 手机端没有顶部头像菜单，需要独立页面提供用户管理入口。
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AuthApiError, clearSession, fetchMe, logoutAccount } from "./authApi";
import type { MeInfo } from "./authApi";

type PageStatus = "loading" | "ready" | "error";

export function MePage({ fetchImpl = fetch }: { fetchImpl?: typeof fetch }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [meInfo, setMeInfo] = useState<MeInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let disposed = false;

    async function load() {
      try {
        const info = await fetchMe(fetchImpl);
        if (disposed) return;
        setMeInfo(info);
        setStatus("ready");
      } catch (error) {
        if (disposed) return;
        if (error instanceof AuthApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("加载用户信息失败，请稍后重试。");
        }
        setStatus("error");
      }
    }

    void load();
    return () => {
      disposed = true;
    };
  }, [fetchImpl]);

  async function handleLogout() {
    try {
      await logoutAccount(fetchImpl);
    } catch {
      // 登出端点失败不阻断本地会话清理。
    } finally {
      clearSession();
      navigate("/auth/login", { replace: true, state: { notice: "已退出登录。" } });
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-stone-400" role="status">
          加载中…
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-red-500" role="alert">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="mb-6 text-xl font-bold text-stone-800">我的</h1>

      <div className="mb-6 space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <div>
          <p className="mb-1 text-xs font-medium text-stone-400">邮箱</p>
          <p className="text-sm text-stone-700">{meInfo?.email}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-stone-400">昵称</p>
          <p className="text-sm text-stone-700">{meInfo?.displayName}</p>
        </div>
      </div>

      <div className="mb-6 space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
        <button
          type="button"
          disabled
          className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-stone-400 cursor-not-allowed"
        >
          修改昵称 <span className="text-xs text-stone-300">（即将上线）</span>
        </button>
        <button
          type="button"
          disabled
          className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-stone-400 cursor-not-allowed"
        >
          修改密码 <span className="text-xs text-stone-300">（即将上线）</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-100"
      >
        退出登录
      </button>
    </div>
  );
}
