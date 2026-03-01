/**
 * 注册页面。
 *
 * WHAT: 提供邮箱密码注册入口，并给出明确成功/失败反馈。
 * WHY: 先完成最小账号闭环，后续可在此基础上扩展找回密码/OAuth。
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { AuthApiError, registerAccount } from "./authApi";

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

export function AuthRegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateCredentials(email, password);
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage("");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);
    try {
      await registerAccount({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      setSuccessMessage("注册成功，请前往登录。");
      setPassword("");
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(`注册失败：${error.message}`);
      } else if (error instanceof Error) {
        setErrorMessage(`注册失败：${error.message}`);
      } else {
        setErrorMessage("注册失败，请稍后重试。");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-[480px] rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-amber-800">注册</h1>
      <p className="mt-1 text-sm text-stone-500">创建你的 Say Right 账号。</p>

      <form className="mt-5 space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        <div>
          <label htmlFor="register-email" className="mb-1 block text-sm font-semibold text-stone-600">
            邮箱
          </label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label htmlFor="register-password" className="mb-1 block text-sm font-semibold text-stone-600">
            密码
          </label>
          <input
            id="register-password"
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

        {successMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {isSubmitting ? "注册中..." : "注册"}
        </button>
      </form>

      <p className="mt-4 text-sm text-stone-600">
        已有账号？
        <Link to="/auth/login" className="ml-1 font-semibold text-orange-600 hover:text-orange-700">
          去登录
        </Link>
      </p>
    </section>
  );
}
