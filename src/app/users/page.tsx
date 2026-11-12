"use client";

import {
  Add,
  ArrowLeft,
} from "@carbon/icons-react";
import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  PasswordInput,
  Search,
  Select,
  SelectItem,
  TextInput,
  Tile,
} from "@carbon/react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SuccessToast } from "@/components/success-toast";
import { getApiUrl } from "@/lib/api-url";
import { fetchGet } from "@/lib/fetch-get";
import { validateTextFields } from "@/lib/field-validation";
import { type FormEvent, useCallback, useEffect, useState } from "react";

const IS_DEMO_LOGIN =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";
const DEMO_USERS_KEY = "carbon-starter-demo-users";

interface UserRecord {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

type UserRole = "user" | "admin";

function readDemoUsers(): UserRecord[] {
  const savedUsers = localStorage.getItem(DEMO_USERS_KEY);
  if (!savedUsers) return [];

  const parsedUsers: unknown = JSON.parse(savedUsers);
  if (
    !Array.isArray(parsedUsers) ||
    !parsedUsers.every(
      (user) =>
        typeof user === "object" &&
        user !== null &&
        typeof user.id === "string" &&
        typeof user.createdAt === "string" &&
        (user.role === undefined ||
          user.role === "user" ||
          user.role === "admin"),
    )
  ) {
    throw new Error("The demo user list is invalid. Clear it and try again.");
  }
  return parsedUsers.map((user) => ({
    id: user.id,
    username:
      typeof user.username === "string"
        ? user.username
        : `user-${user.id.slice(0, 8)}`,
    name: typeof user.name === "string" ? user.name : "User",
    role: user.role ?? "user",
    createdAt: user.createdAt,
    ...(typeof user.updatedAt === "string"
      ? { updatedAt: user.updatedAt }
      : {}),
  }));
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [userSearch, setUserSearch] = useState("");
  const normalizedUserSearch = userSearch.trim().toLocaleLowerCase();
  const filteredUsers = (
    normalizedUserSearch
      ? users.filter((user) =>
          [user.name, user.username, user.role].some((value) =>
            value.toLocaleLowerCase().includes(normalizedUserSearch),
          ),
        )
      : users
  )
    .slice()
    .sort(
      (first, second) =>
        Date.parse(second.updatedAt ?? second.createdAt) -
        Date.parse(first.updatedAt ?? first.createdAt),
    );
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const loadUsers = useCallback(async () => {
    setError("");
    setIsLoading(true);
    try {
      if (IS_DEMO_LOGIN && sessionStorage.getItem("demo-login-username")) {
        setIsDemoSession(true);
        const demoUsername = sessionStorage.getItem("demo-login-username");
        const demoUserId = "demo-current-user";
        const demoUsers = readDemoUsers();
        const demoUser = demoUsers.find((user) => user.id === demoUserId);
        if (!demoUser) {
          demoUsers.unshift({
            id: demoUserId,
            username: demoUsername ?? "demo",
            name: demoUsername ?? "demo",
            role: "admin",
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(demoUsers));
        } else if (demoUser.role !== "admin") {
          demoUser.role = "admin";
          localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(demoUsers));
        }
        setCurrentUserId(demoUserId);
        setCurrentUserName(demoUser?.name ?? demoUsername ?? "demo");
        setUsers(demoUsers);
        return;
      }

      const profileResponse = await fetchGet(`${getApiUrl()}/auth/me`, {
        credentials: "include",
      });
      if (profileResponse.status === 401) {
        router.replace("/login");
        return;
      }
      if (!profileResponse.ok) {
        throw new Error("Unable to verify your account role.");
      }
      const profile: UserRecord = await profileResponse.json();
      if (profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      const usersResponse = await fetchGet(`${getApiUrl()}/users`, {
        credentials: "include",
      });
      if (usersResponse.status === 401) {
        router.replace("/login");
        return;
      }
      if (usersResponse.status === 403) {
        router.replace("/dashboard");
        return;
      }
      if (!usersResponse.ok) {
        throw new Error("Unable to load users. Please try again.");
      }
      setCurrentUserId(profile.id);
      setCurrentUserName(profile.name);
      setUsers(await usersResponse.json());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load users. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadUsers);
  }, [loadUsers]);

  useEffect(() => {
    function syncFormWithLocation() {
      if (isLoading) return;
      const params = new URLSearchParams(window.location.search);
      const form = params.get("form");
      if (form === "create") {
        setEditingUser(null);
        setUsername("");
        setName("");
        setPassword("");
        setRole("user");
        setFieldErrors({});
        setError("");
        setIsFormOpen(true);
      } else if (form === "edit") {
        const user = users.find((item) => item.id === params.get("id"));
        if (user) {
          setEditingUser(user);
          setUsername(user.username);
          setName(user.name);
          setPassword("");
          setRole(user.role);
          setFieldErrors({});
          setError("");
          setIsFormOpen(true);
        }
      } else {
        setIsFormOpen(false);
        setEditingUser(null);
      }
    }

    syncFormWithLocation();
    window.addEventListener("popstate", syncFormWithLocation);
    return () => window.removeEventListener("popstate", syncFormWithLocation);
  }, [isLoading, users]);

  function openCreateForm() {
    setEditingUser(null);
    setUsername("");
    setName("");
    setPassword("");
    setRole("user");
    setError("");
    setNotice("");
    setFieldErrors({});
    window.history.pushState(null, "", "/users?form=create");
    setIsFormOpen(true);
  }

  function openEditForm(user: UserRecord) {
    setEditingUser(user);
    setUsername(user.username);
    setName(user.name);
    setPassword("");
    setRole(user.role);
    setError("");
    setNotice("");
    setFieldErrors({});
    window.history.pushState(
      null,
      "",
      `/users?form=edit&id=${encodeURIComponent(user.id)}`,
    );
    setIsFormOpen(true);
  }

  function closeForm() {
    window.history.replaceState(null, "", "/users");
    setIsFormOpen(false);
    setEditingUser(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const nextFieldErrors = validateTextFields({
      username: {
        label: "Username",
        value: username,
        required: true,
        maxLength: 64,
      },
      name: { label: "Name", value: name, required: true, maxLength: 120 },
      password: {
        label: "Password",
        value: password,
        required: !editingUser,
        minLength: 8,
        maxLength: 72,
        trim: false,
      },
    });
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;
    setIsSaving(true);

    try {
      if (isDemoSession) {
        const currentUsers = readDemoUsers();
        const now = new Date().toISOString();
        const normalizedUsername = username.trim().toLowerCase();
        if (!normalizedUsername || !name.trim()) {
          throw new Error("Username and name are required.");
        }
        if (
          currentUsers.some(
            (user) =>
              user.id !== editingUser?.id &&
              user.username.trim().toLowerCase() === normalizedUsername,
          )
        ) {
          throw new Error("This username is already in use.");
        }
        const updatedUsers = editingUser
          ? currentUsers.map((user) =>
              user.id === editingUser.id
                ? {
                    ...user,
                    username: normalizedUsername,
                    name: name.trim(),
                    role,
                    updatedAt: now,
                  }
                : user,
            )
          : [
              {
                id: crypto.randomUUID(),
                username: normalizedUsername,
                name: name.trim(),
                role,
                createdAt: now,
                updatedAt: now,
              },
              ...currentUsers,
            ];
        localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
        if (editingUser?.id === currentUserId) {
          sessionStorage.setItem("demo-login-username", normalizedUsername);
          setCurrentUserName(name.trim());
        }
      } else {
        const response = await fetch(
          editingUser
            ? `${getApiUrl()}/users/${editingUser.id}`
            : `${getApiUrl()}/users`,
          {
            method: editingUser ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              username,
              name,
              role,
              ...(password ? { password } : {}),
            }),
          },
        );
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          const result: { message?: string | string[] } = await response.json();
          const message = Array.isArray(result.message)
            ? result.message.join(" ")
            : result.message;
          throw new Error(message ?? "Unable to save this user.");
        }
        const savedUser: UserRecord = await response.json();
        setUsers((currentUsers) =>
          editingUser
            ? currentUsers.map((user) =>
                user.id === savedUser.id ? savedUser : user,
              )
            : [savedUser, ...currentUsers],
        );
        if (savedUser.id === currentUserId) {
          setCurrentUserName(savedUser.name);
        }
      }

      window.history.replaceState(null, "", "/users");
      setNotice(editingUser ? "User updated." : "User added.");
      setIsFormOpen(false);
      setEditingUser(null);
      setUsername("");
      setName("");
      setPassword("");
      setRole("user");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save this user. Please try again.";
      if (/username/i.test(message)) {
        setFieldErrors((current) => ({ ...current, username: message }));
      } else {
        setError(message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!userToDelete) return;
    setError("");
    setNotice("");
    setIsSaving(true);

    try {
      if (isDemoSession) {
        const updatedUsers = readDemoUsers().filter(
          (user) => user.id !== userToDelete.id,
        );
        localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
      } else {
        const response = await fetch(
          `${getApiUrl()}/users/${userToDelete.id}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        );
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          const result: { message?: string | string[] } = await response.json();
          const message = Array.isArray(result.message)
            ? result.message.join(" ")
            : result.message;
          throw new Error(message ?? "Unable to delete this user.");
        }
        setUsers((currentUsers) =>
          currentUsers.filter((user) => user.id !== userToDelete.id),
        );
      }

      setNotice(`${userToDelete.username} was deleted.`);
      setUserToDelete(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete this user. Please try again.",
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
      if (!response.ok) {
        throw new Error("Could not sign out. Please try again.");
      }
      router.replace("/login");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not sign out. Please try again.",
      );
    }
  }

  return (
    <>
      <AppHeader
        user={
          currentUserName
            ? { name: currentUserName, role: "admin" }
            : null
        }
        onSignOut={handleLogout}
      />

      {notice && (
        <SuccessToast message={notice} onClose={() => setNotice("")} />
      )}

      {!isFormOpen && (
        <main className="users-main" id="main-content">
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <div className="users-heading">
                <div>
                  <p className="dashboard-eyebrow">ADMINISTRATION</p>
                  <h1 className="dashboard-title">Users</h1>
                  <p className="dashboard-description">
                    Add, edit, and remove accounts for your workspace.
                  </p>
                </div>
              </div>

              {isDemoSession && (
                <InlineNotification
                  kind="info"
                  lowContrast
                  hideCloseButton
                  title="Development demo"
                  subtitle="Users created here are saved only in this browser. Sign in with an API account to manage PostgreSQL users."
                />
              )}
              {error && !isFormOpen && (
                <InlineNotification
                  kind="error"
                  lowContrast
                  title="User management error"
                  subtitle={error}
                />
              )}
            </Column>

            <Column sm={4} md={8} lg={16}>
              <Tile className="users-table-tile">
                {isLoading ? (
                  <p role="status">Loading users...</p>
                ) : users.length === 0 ? (
                  <div className="users-empty">
                    <h2>No users yet</h2>
                    <p>Add a user to get started.</p>
                    <Button
                      kind="tertiary"
                      renderIcon={Add}
                      onClick={openCreateForm}
                    >
                      Add user
                    </Button>
                  </div>
                ) : (
                  <div className="users-table-wrapper">
                    <div className="users-table-toolbar">
                      <Search
                        className="table-search"
                        id="users-search"
                        labelText="Search users"
                        placeholder="Search by name, username, or role..."
                        size="lg"
                        value={userSearch}
                        onChange={(event) => {
                          setUserSearch(event.currentTarget.value);
                          setPage(1);
                        }}
                        onClear={() => {
                          setUserSearch("");
                          setPage(1);
                        }}
                      />
                      <Button renderIcon={Add} onClick={openCreateForm}>
                        Add user
                      </Button>
                    </div>
                    {filteredUsers.length === 0 ? (
                      <div className="users-empty">
                        <h2>No users match your search</h2>
                        <p>Try a different name, username, or role.</p>
                      </div>
                    ) : (
                      <>
                        <table className="cds--data-table cds--data-table--zebra users-table">
                          <thead>
                            <tr>
                              <th scope="col">Name</th>
                              <th scope="col">Username</th>
                              <th scope="col">Role</th>
                              <th scope="col">Created</th>
                              <th scope="col">
                                <span className="visually-hidden">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleUsers.map((user) => (
                              <tr key={user.id}>
                                <td>
                                  <strong>{user.name}</strong>
                                  {user.id === currentUserId && (
                                    <span className="users-table__you">
                                      You
                                    </span>
                                  )}
                                </td>
                                <td>{user.username}</td>
                                <td>
                                  {user.role === "admin"
                                    ? "Administrator"
                                    : "User"}
                                </td>
                                <td>
                                  {new Date(
                                    user.createdAt,
                                  ).toLocaleDateString()}
                                </td>
                                <td className="users-table__actions">
                                  <OverflowMenu
                                    aria-label={`Actions for ${user.username}`}
                                    iconDescription={`Actions for ${user.username}`}
                                    flipped
                                    size="sm"
                                  >
                                    <OverflowMenuItem
                                      itemText="Edit"
                                      onClick={() => openEditForm(user)}
                                    />
                                    <OverflowMenuItem
                                      itemText="Delete"
                                      isDelete
                                      hasDivider
                                      disabled={user.id === currentUserId}
                                      onClick={() => setUserToDelete(user)}
                                    />
                                  </OverflowMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <Pagination
                          id="users-pagination"
                          page={currentPage}
                          pageSize={pageSize}
                          pageSizes={[10, 20, 50]}
                          totalItems={filteredUsers.length}
                          onChange={({
                            page: nextPage,
                            pageSize: nextPageSize,
                          }) => {
                            setPage(nextPage);
                            setPageSize(nextPageSize);
                          }}
                        />
                      </>
                    )}
                  </div>
                )}
              </Tile>
            </Column>
          </Grid>
        </main>
      )}

      {isFormOpen && (
        <main className="users-main form-page" id="main-content">
          <Grid>
            <Column sm={4} md={8} lg={10} className="form-page__column">
              <div className="users-heading form-page__heading">
                <div>
                  <p className="dashboard-eyebrow">ADMINISTRATION</p>
                  <h1 className="dashboard-title">
                    {editingUser ? "Edit user" : "Add user"}
                  </h1>
                  <p className="dashboard-description">
                    {editingUser
                      ? "Update this account's details and access."
                      : "Create an account for your workspace."}
                  </p>
                </div>
                <Button
                  kind="secondary"
                  renderIcon={ArrowLeft}
                  onClick={closeForm}
                >
                  Back to users
                </Button>
              </div>
              {error && (
                <InlineNotification
                  kind="error"
                  lowContrast
                  title="Unable to save user"
                  subtitle={error}
                />
              )}
              <form
                className="users-form form-page__surface"
                onSubmit={(event) => void handleSave(event)}
              >
                <TextInput
                  id="user-username"
                  labelText="Username"
                  helperText="Must be unique. Usernames are case-insensitive."
                  invalid={Boolean(fieldErrors.username)}
                  invalidText={fieldErrors.username}
                  value={username}
                  onChange={(event) => {
                    setUsername(event.currentTarget.value);
                    setFieldErrors((current) => ({ ...current, username: "" }));
                  }}
                  maxLength={64}
                />
                <TextInput
                  id="user-name"
                  labelText="Name"
                  invalid={Boolean(fieldErrors.name)}
                  invalidText={fieldErrors.name}
                  value={name}
                  onChange={(event) => {
                    setName(event.currentTarget.value);
                    setFieldErrors((current) => ({ ...current, name: "" }));
                  }}
                  maxLength={120}
                />
                <Select
                  id="user-role"
                  labelText="Role"
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.currentTarget.value === "admin" ? "admin" : "user",
                    )
                  }
                >
                  <SelectItem value="admin" text="Administrator" />
                  <SelectItem value="user" text="User" />
                </Select>
                <PasswordInput
                  id="user-password"
                  labelText={
                    editingUser ? "New password (optional)" : "Password"
                  }
                  helperText={
                    editingUser
                      ? "Leave blank to keep the current password."
                      : "At least 8 characters."
                  }
                  invalid={Boolean(fieldErrors.password)}
                  invalidText={fieldErrors.password}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.currentTarget.value);
                    setFieldErrors((current) => ({ ...current, password: "" }));
                  }}
                  minLength={8}
                  maxLength={72}
                />
                <div className="form-page__actions">
                  <Button kind="secondary" type="button" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving
                      ? "Saving..."
                      : editingUser
                        ? "Save changes"
                        : "Create user"}
                  </Button>
                </div>
              </form>
            </Column>
          </Grid>
        </main>
      )}

      <Modal
        open={userToDelete !== null}
        modalHeading="Delete user?"
        primaryButtonText={isSaving ? "Deleting..." : "Delete user"}
        secondaryButtonText="Cancel"
        danger
        primaryButtonDisabled={isSaving}
        onRequestClose={() => setUserToDelete(null)}
        onRequestSubmit={() => void handleDelete()}
      >
        <p>
          This permanently deletes <strong>{userToDelete?.username}</strong> and
          prevents them from signing in.
        </p>
      </Modal>
    </>
  );
}
