"use client";

import {
  ArrowLeft,
  RainDrop,
  Report,
  UserMultiple,
} from "@carbon/icons-react";
import {
  Button,
  Column,
  Grid,
  Header,
  HeaderName,
  InlineNotification,
  Tag,
  Tile,
} from "@carbon/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const IS_DEMO_LOGIN =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: "user" | "admin";
  createdAt: string;
}

interface GhatInspectionSummary {
  deficiencies: Array<{ status: "pending" | "rectified" }>;
}

interface GhatSummary {
  id: string;
  block: string;
  inspections: GhatInspectionSummary[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [ghats, setGhats] = useState<GhatSummary[]>([]);

  useEffect(() => {
    let active = true;

    function showDemoSession() {
      const username = sessionStorage.getItem("demo-login-username");
      if (!username) {
        router.replace("/login");
        return;
      }

      if (active) {
        setIsDemoSession(true);
        setUser({
          id: "demo",
          username,
          name: username,
          role: "admin",
          createdAt: new Date().toISOString(),
        });
      }
    }

    async function loadProfile() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });
        if (response.status === 401) {
          if (IS_DEMO_LOGIN) {
            showDemoSession();
            return;
          }
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          throw new Error("Unable to load your profile.");
        }
        const profile: UserProfile = await response.json();
        if (active) {
          setUser(profile);
          const ghatsResponse = await fetch(`${API_URL}/ghats`, {
            credentials: "include",
          });
          if (!ghatsResponse.ok) {
            if (ghatsResponse.status === 401) {
              router.replace("/login");
              return;
            }
            throw new Error("Unable to load ghat readiness summary.");
          }
          setGhats(await ghatsResponse.json());
        }
      } catch {
        if (IS_DEMO_LOGIN) {
          showDemoSession();
        } else if (active) {
          setError("Cannot reach the authentication service. Please try again.");
        }
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    if (isDemoSession) {
      sessionStorage.removeItem("demo-login-username");
      router.replace("/login");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
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
      <Header
        className="app-shell-header"
        aria-label="Puja Readiness Portal dashboard"
      >
        <HeaderName href="/dashboard" prefix="">
          Puja Readiness Portal
        </HeaderName>
        <nav className="app-header__nav" aria-label="Main navigation">
          <Button kind="ghost" href="/dashboard" aria-current="page">
            Dashboard
          </Button>
          <Button kind="ghost" href="/ghats" renderIcon={RainDrop}>
            Ghats
          </Button>
          <Button kind="ghost" href="/reports" renderIcon={Report}>
            Action Taken Report
          </Button>
          {user?.role === "admin" && (
            <Button kind="ghost" href="/users" renderIcon={UserMultiple}>
              Users
            </Button>
          )}
        </nav>
        <div className="app-header__actions">
          {user && (
            <span className="app-header__user" title={user.username}>
              {user.name}
            </span>
          )}
          <Button kind="ghost" renderIcon={ArrowLeft} onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </Header>

      <main className="dashboard-main" id="main-content">
        <Grid>
          {!user ? (
            <Column sm={4} md={8} lg={16}>
              {error ? (
                <>
                  <InlineNotification
                    kind="error"
                    lowContrast
                    title="Dashboard unavailable"
                    subtitle={error}
                  />
                  <Button href="/login">Return to sign in</Button>
                </>
              ) : (
                <p role="status">Checking your session...</p>
              )}
            </Column>
          ) : (
            <>
              <Column sm={4} md={8} lg={16}>
                {error && (
                  <InlineNotification
                    kind="error"
                    lowContrast
                    title="Sign-out failed"
                    subtitle={error}
                  />
                )}
                <p className="dashboard-eyebrow"></p>
                <h1 className="dashboard-title">
                  Welcome to Purba Medinipur Puja Readiness Portal
                </h1>
                <p className="dashboard-description">
                  Signed in as {user.name} (@{user.username}). Your workspace is ready.
                </p>
                {isDemoSession && (
                  <InlineNotification
                    kind="info"
                    lowContrast
                    hideCloseButton
                    title="Development demo session"
                    subtitle="Sign-in is skipped in development. Demo access is local to this browser and does not change PostgreSQL."
                  />
                )}
              </Column>
              {[
                {
                  label: "Registered Ghats",
                  value: ghats.length,
                  tone: "saffron",
                },
                {
                  label: "Inspections",
                  value: ghats.reduce(
                    (total, ghat) => total + ghat.inspections.length,
                    0,
                  ),
                  tone: "teal",
                },
                {
                  label: "Pending deficiencies",
                  value: ghats.reduce(
                    (total, ghat) =>
                      total +
                      (ghat.inspections[0]?.deficiencies.filter(
                        (deficiency) => deficiency.status === "pending",
                      ).length ?? 0),
                    0,
                  ),
                  tone: "rose",
                },
                {
                  label: "Blocks covered",
                  value: new Set(
                    ghats.map((ghat) => ghat.block.trim()).filter(Boolean),
                  ).size,
                  tone: "violet",
                },
              ].map(({ label, value, tone }) => (
                <Column key={label} sm={4} md={4} lg={4}>
                  <Tile className={`dashboard-stat dashboard-stat--${tone}`}>
                    <p className="dashboard-stat__label">{label}</p>
                    <p className="dashboard-stat__value">{value}</p>
                  </Tile>
                </Column>
              ))}
              <Column sm={4} md={8} lg={16}>
                <h2 className="dashboard-section-title">Readiness workflow</h2>
                <Tile className="dashboard-activity">
                  {[
                    {
                      title: "Ghat register",
                      detail: "Maintain district, sub-division, block and Nodal Officer details.",
                      status: `${ghats.length} ghats`,
                    },
                    {
                      title: "Inspections",
                      detail: "Assess access, crowd safety, rescue, amenities and cleanliness.",
                      status: `${ghats.reduce((total, ghat) => total + ghat.inspections.length, 0)} recorded`,
                    },
                    {
                      title: "Action Taken Report",
                      detail: "Review inspection coverage and deficiencies pending or rectified.",
                      status: "Open report",
                    },
                  ].map(({ title, detail, status }) => (
                    <div className="dashboard-activity__item" key={title}>
                      <div>
                        <p className="dashboard-activity__label">{title}</p>
                        <p className="dashboard-activity__meta">{detail}</p>
                      </div>
                      <Tag type="blue">{status}</Tag>
                    </div>
                  ))}
                  <div className="dashboard-workflow__actions">
                    <Button href="/ghats" renderIcon={RainDrop}>
                      Manage ghats
                    </Button>
                    <Button
                      kind="tertiary"
                      href="/reports"
                      renderIcon={Report}
                    >
                      View Action Taken Report
                    </Button>
                  </div>
                </Tile>
              </Column>
            </>
          )}
        </Grid>
      </main>
    </>
  );
}
