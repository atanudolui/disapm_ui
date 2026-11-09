"use client";

import { ArrowRight } from "@carbon/icons-react";
import {
  Button,
  InlineNotification,
  PasswordInput,
  TextInput,
} from "@carbon/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const IS_DEMO_LOGIN =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (IS_DEMO_LOGIN) {
      sessionStorage.setItem(
        "demo-login-username",
        username.trim() || "demo",
      );
      router.push("/dashboard");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const result: { message?: string | string[] } = await response.json();
        const message = Array.isArray(result.message)
          ? result.message.join(" ")
          : result.message;
        setError(message ?? "Unable to sign in. Please check your details.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Cannot reach the authentication service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-aside" aria-label="Welcome">
        <div className="login-aside__brand">
          <span className="login-aside__brand-mark" aria-hidden="true">
            R
          </span>
          <span>Puja Readiness Portal</span>
        </div>
        <div className="login-aside__content">
          <p className="login-aside__eyebrow">PUJA READINESS PORTAL</p>
          <h1 className="login-aside__title">
            Every ghat, ready for the season.
          </h1>
          <p className="login-aside__description">
            Coordinate puja preparations with a clear view of inspections,
            safety arrangements, and actions that still need attention.
          </p>
          <figure className="login-aside__artwork">
            <Image
              src="/chhath-puja.svg"
              alt="Devotees offering arghya to the rising sun beside a river during Chhath Puja"
              width={1200}
              height={650}
              priority
            />
            <figcaption>Chhath Puja · Arghya at sunrise</figcaption>
          </figure>
          <ul className="login-aside__features">
            <li>
              <span aria-hidden="true">01</span>
              <div>
                <strong>Ghat register</strong>
                <p>Keep sub-divisions, blocks and local contacts up to date.</p>
              </div>
            </li>
            <li>
              <span aria-hidden="true">02</span>
              <div>
                <strong>Readiness inspections</strong>
                <p>Review safety arrangements and inspection findings.</p>
              </div>
            </li>
            <li>
              <span aria-hidden="true">03</span>
              <div>
                <strong>Action tracking</strong>
                <p>Follow deficiencies through to rectification.</p>
              </div>
            </li>
          </ul>
        </div>
        <p className="login-aside__footer">
          A shared workspace for coordinated puja readiness.
        </p>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form__heading">
            <p className="login-form__eyebrow">SECURE WORKSPACE</p>
            <h2 className="login-form__title" id="login-title">
              Welcome back
            </h2>
          </div>
          <p className="login-form__description">
            Sign in with your assigned username and password to continue.
          </p>
          {error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Sign-in failed"
              subtitle={error}
              className="login-form__notification"
            />
          )}
          <TextInput
            id="username"
            name="username"
            labelText="Username"
            placeholder="Enter your username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.currentTarget.value)}
            required
            maxLength={64}
          />
          <PasswordInput
            id="password"
            name="password"
            labelText="Password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
          />
          <Button
            className="login-form__submit"
            type="submit"
            renderIcon={ArrowRight}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Please wait..." : "Sign in"}
          </Button>
          <p className="login-form__help">
            Need access? Contact your workspace administrator.
          </p>
          {IS_DEMO_LOGIN && (
            <p className="login-demo-note">
              Development demo is enabled: sign-in will not authenticate with
              the backend.
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
