import type { User } from "../openapi/client";

export type UserRole = NonNullable<User["roles"]>[number];

// Exhaustive on purpose: a role added in the API without an entry here is a type error.
export const roleStyles: Record<UserRole, string> = {
    ROLE_USER: "bg-blue-100 text-blue-800",
    ROLE_ADMIN: "bg-purple-100 text-purple-800",
};

export const USER_ROLES = Object.keys(roleStyles) as UserRole[];
