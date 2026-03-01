/**
 * 登录页面。
 *
 * WHAT: 提供邮箱密码登录入口，成功后写入本地会话并回到首页。
 * WHY: UI-011 需要最小可用账号流程，便于后续接口鉴权联调。
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthApiError, loginAccount, persistSession } from "./authApi";

function validateCredentials(email: string, password: string) {
  const normalizedEmail = email.trim();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    return "请输入邮箱和密码。";
  }
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return "请输入合法的邮箱地址。";
  }
  if (normalizedPassword.length < 8) {
    return "密码至少 8 位。";
  }
  return "";
}

export function AuthLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateCredentials(email, password);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const result = await loginAccount({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      persistSession(result, email.trim().toLowerCase());
      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(`登录失败：${error.message}`);
      } else if (error instanceof Error) {
        setErrorMessage(`登录失败：${error.message}`);
      } else {
        setErrorMessage("登录失败，请稍后重试。");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-[480px] rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-amber-800">登录</h1>
      <p className="mt-1 text-sm text-stone-500">使用邮箱和密码登录 Say Right。</p>

      <form className="mt-5 space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-semibold text-stone-600">
            邮箱
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1 block text-sm font-semibold text-stone-600">
            密码
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {errorMessage ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {isSubmitting ? "登录中..." : "登录"}
        </button>
      </form>

      <p className="mt-4 text-sm text-stone-600">
        还没有账号？
        <Link to="/auth/register" className="ml-1 font-semibold text-orange-600 hover:text-orange-700">
          去注册
        </Link>
      </p>
    </section>
  );
}
