"use client";

import { ArrowLeft, RainDrop, Report, UserMultiple } from "@carbon/icons-react";
import { Button, Header, HeaderName } from "@carbon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type UserRole = "user" | "admin";

interface AppHeaderProps {
  user?: {
    name: string;
    username?: string;
    role?: UserRole;
  } | null;
  onSignOut: () => void;
  ariaLabel?: string;
}

export function AppHeader({
  user,
  onSignOut,
  ariaLabel = "Puja Readiness Portal",
}: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <Header className="app-shell-header" aria-label={ariaLabel}>
      <HeaderName as={Link} href="/dashboard" prefix="">
        Purba Medinipur Puja Readiness Portal
      </HeaderName>
      <nav className="app-header__nav" aria-label="Main navigation">
        <Button
          as={Link}
          kind="ghost"
          href="/dashboard"
          aria-current={pathname === "/dashboard" ? "page" : undefined}
        >
          Dashboard
        </Button>
        <Button
          as={Link}
          kind="ghost"
          href="/ghats"
          renderIcon={RainDrop}
          aria-current={pathname === "/ghats" ? "page" : undefined}
        >
          Ghats
        </Button>
        <Button
          as={Link}
          kind="ghost"
          href="/reports"
          renderIcon={Report}
          aria-current={pathname === "/reports" ? "page" : undefined}
        >
          Action Taken Report
        </Button>
        <Button
          as={Link}
          kind="ghost"
          href="/change-password"
          aria-current={pathname === "/change-password" ? "page" : undefined}
        >
          Change password
        </Button>
        {user?.role === "admin" && (
          <Button
            as={Link}
            kind="ghost"
            href="/users"
            renderIcon={UserMultiple}
            aria-current={pathname === "/users" ? "page" : undefined}
          >
            Users
          </Button>
        )}
      </nav>
      <div className="app-header__actions">
        {user && (
          <span
            className="app-header__user"
            title={user.username ?? user.name}
          >
            {user.name}
          </span>
        )}
        <Button kind="ghost" renderIcon={ArrowLeft} onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </Header>
  );
}
