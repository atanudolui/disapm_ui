"use client";

import {
  ArrowLeft,
  Close,
  Menu,
  RainDrop,
  Report,
  UserMultiple,
} from "@carbon/icons-react";
import { Button, Header, HeaderName } from "@carbon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  const closeNavigation = () => setIsNavigationOpen(false);

  return (
    <Header className="app-shell-header" aria-label={ariaLabel}>
      <Button
        className="app-header__menu"
        kind="ghost"
        hasIconOnly
        renderIcon={isNavigationOpen ? Close : Menu}
        iconDescription={
          isNavigationOpen ? "Close navigation" : "Open navigation"
        }
        aria-label={isNavigationOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isNavigationOpen}
        aria-controls="app-side-navigation"
        onClick={() => setIsNavigationOpen((open) => !open)}
      />
      <HeaderName as={Link} href="/dashboard" prefix="">
        Purba Medinipur Puja Readiness Portal
      </HeaderName>
      {isNavigationOpen && (
        <button
          className="app-header__backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={closeNavigation}
        />
      )}
      <nav
        id="app-side-navigation"
        className={`app-header__nav${
          isNavigationOpen ? " app-header__nav--open" : ""
        }`}
        aria-label="Main navigation"
        aria-hidden={!isNavigationOpen}
        inert={!isNavigationOpen}
      >
        <Button
          as={Link}
          kind="ghost"
          href="/dashboard"
          aria-current={pathname === "/dashboard" ? "page" : undefined}
          onClick={closeNavigation}
        >
          Dashboard
        </Button>
        <Button
          as={Link}
          kind="ghost"
          href="/ghats"
          renderIcon={RainDrop}
          aria-current={pathname === "/ghats" ? "page" : undefined}
          onClick={closeNavigation}
        >
          Ghats
        </Button>
        <Button
          as={Link}
          kind="ghost"
          href="/reports"
          renderIcon={Report}
          aria-current={pathname === "/reports" ? "page" : undefined}
          onClick={closeNavigation}
        >
          Action Taken Report
        </Button>
        <Button
          as={Link}
          kind="ghost"
          href="/change-password"
          aria-current={pathname === "/change-password" ? "page" : undefined}
          onClick={closeNavigation}
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
            onClick={closeNavigation}
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
