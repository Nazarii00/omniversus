"use client";

import Link from "next/link";
import { useActionState, useCallback, useState } from "react";
import { signInAction, signInWithProviderAction } from "../actions/authActions";
import styles from "../styles/auth.module.css";

type FieldError = string | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): FieldError {
  if (!email.trim()) return "Email is required";
  if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address";
  return null;
}

function validatePassword(password: string): FieldError {
  if (!password) return "Password is required";
  if (password.length < 8) return "At least 8 characters";
  return null;
}

export function LoginForm() {
  const [serverState, formAction, pending] = useActionState(signInAction, {
    error: null as string | null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const [oAuthPending, setOAuthPending] = useState<string | null>(null);

  const validate = useCallback(() => {
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    return !emailErr && !passwordErr;
  }, [email, password]);

  async function handleOAuth(provider: "google" | "discord" | "twitter") {
    setOAuthPending(provider);
    try {
      await signInWithProviderAction(provider);
    } catch {
      setOAuthPending(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Enter your credentials to continue</p>

        <form
          action={formAction}
          className={styles.form}
          onSubmit={(e) => {
            if (!validate()) e.preventDefault();
          }}
        >
          <label className={styles.field}>
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className={emailError ? styles.inputError : undefined}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              onBlur={() => setEmailError(validateEmail(email))}
            />
            {emailError ? (
              <span className={styles.fieldError}>{emailError}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span>Password</span>
            <div className={styles.passwordWrapper}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={passwordError ? styles.inputError : undefined}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                onBlur={() => setPasswordError(validatePassword(password))}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="m14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {passwordError ? (
              <span className={styles.fieldError}>{passwordError}</span>
            ) : null}
          </label>

          {serverState.error ? (
            <p className={styles.error}>{serverState.error}</p>
          ) : null}

          <button
            className={styles.submitButton}
            type="submit"
            disabled={pending}
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or continue with</span>
        </div>

        <div className={styles.oauthButtons}>
          <button
            type="button"
            className={styles.oauthButton}
            disabled={oAuthPending !== null}
            onClick={() => handleOAuth("google")}
          >
            <span className={styles.oauthIcon}>G</span>
            <span className={styles.oauthLabel}>
              {oAuthPending === "google" ? "Redirecting..." : "Google"}
            </span>
          </button>
          <button
            type="button"
            className={styles.oauthButton}
            disabled={oAuthPending !== null}
            onClick={() => handleOAuth("discord")}
          >
            <span className={styles.oauthIcon}>D</span>
            <span className={styles.oauthLabel}>
              {oAuthPending === "discord" ? "Redirecting..." : "Discord"}
            </span>
          </button>
          <button
            type="button"
            className={styles.oauthButton}
            disabled={oAuthPending !== null}
            onClick={() => handleOAuth("twitter")}
          >
            <span className={styles.oauthIcon}>X</span>
            <span className={styles.oauthLabel}>
              {oAuthPending === "twitter" ? "Redirecting..." : "X"}
            </span>
          </button>
        </div>

        <div className={styles.links}>
          Don{"\u2019"}t have an account?{" "}
          <Link href="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
