"use client";

import {
  Column,
  Grid,
  Button,
  InlineNotification,
  PasswordInput,
  Tile,
} from "@carbon/react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getApiUrl } from "@/lib/api-url";
import { fetchGet } from "@/lib/fetch-get";
import { type FormEvent, useEffect, useState } from "react";

const IS_DEMO_LOGIN =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: "user" | "admin";
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        if (
          IS_DEMO_LOGIN &&
          sessionStorage.getItem("demo-login-username")
        ) {
          if (active) setIsDemoSession(true);
          return;
        }

        const response = await fetchGet(`${getApiUrl()}/auth/me`, {
          credentials: "include",
        });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          throw new Error("Unable to verify your account.");
        }
        if (active) setProfile(await response.json());
      } catch {
        if (active) {
          setError("Cannot reach the authentication service. Please try again.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from the current password.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${getApiUrl()}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const result: { message?: string | string[] } = await response.json();
        const message = Array.isArray(result.message)
          ? result.message.join(" ")
          : result.message;
        if (
          response.status === 401 &&
          message !== "Current password is incorrect."
        ) {
          router.replace("/login");
          return;
        }
        throw new Error(message ?? "Unable to change your password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Your password has been changed.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to change your password. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    if (isDemoSession) {
      sessionStorage.removeItem("demo-login-username");
      router.replace("/login");
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Sign-out failed.");
      router.replace("/login");
    } catch {
      setError("Could not sign out. Please try again.");
    }
  }

  return (
    <>
      <AppHeader
        user={profile}
        onSignOut={handleLogout}
        ariaLabel="Purba Medinipur Puja Readiness Portal change password"
      />

      <main className="dashboard-main change-password-main" id="main-content">
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <p className="dashboard-eyebrow">ACCOUNT</p>
            <h1 className="dashboard-title">Change password</h1>
            <p className="dashboard-description change-password-description">
              Verify your current password before choosing a new one.
            </p>
            {isLoading ? (
              <p role="status">Checking your session...</p>
            ) : error && !profile && !isDemoSession ? (
              <InlineNotification
                kind="error"
                lowContrast
                title="Account unavailable"
                subtitle={error}
              />
            ) : isDemoSession ? (
              <InlineNotification
                kind="info"
                lowContrast
                hideCloseButton
                title="Development demo session"
                subtitle="Password changes are unavailable in demo mode. Sign in with an API account to change your password."
              />
            ) : (
              <Tile className="change-password-panel">
                <div className="change-password-panel__heading">
                  <p className="change-password-panel__eyebrow">
                    ACCOUNT SECURITY
                  </p>
                  <h2>Update your credentials</h2>
                  <p>
                    Choose a strong password with at least 8 characters.
                  </p>
                </div>
                {error && (
                  <InlineNotification
                    kind="error"
                    lowContrast
                    title="Password not changed"
                    subtitle={error}
                  />
                )}
                {notice && (
                  <InlineNotification
                    kind="success"
                    lowContrast
                    title="Password changed"
                    subtitle={notice}
                  />
                )}
                <form
                  className="change-password-form"
                  onSubmit={handleSubmit}
                >
                  <PasswordInput
                    id="current-password"
                    name="currentPassword"
                    labelText="Current password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(event.currentTarget.value)
                    }
                    required
                    maxLength={72}
                  />
                  <div className="change-password-form__new-passwords">
                    <p className="change-password-form__section-title">
                      Choose a new password
                    </p>
                    <PasswordInput
                      id="new-password"
                      name="newPassword"
                      labelText="New password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) =>
                        setNewPassword(event.currentTarget.value)
                      }
                      required
                      minLength={8}
                      maxLength={72}
                    />
                    <PasswordInput
                      id="confirm-password"
                      name="confirmPassword"
                      labelText="Confirm new password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.currentTarget.value)
                      }
                      required
                      minLength={8}
                      maxLength={72}
                    />
                  </div>
                  <Button className="change-password-form__submit" type="submit" disabled={isSaving}>
                    {isSaving ? "Updating password..." : "Update password"}
                  </Button>
                </form>
              </Tile>
            )}
          </Column>
        </Grid>
      </main>
    </>
  );
}
