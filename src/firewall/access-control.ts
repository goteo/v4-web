export type ControlItem = {
    path: string;
    roles: string[];
};

export const ACL: ControlItem[] = [
    {
        path: "/project/.*/edit",
        roles: ["ROLE_USER"],
    },
    {
        path: "/project/.*/manage",
        roles: ["ROLE_USER"],
    },
    {
        path: "/reviews",
        roles: ["ROLE_USER", "ROLE_ADMIN"],
    },
    {
        path: "/admin",
        roles: ["ROLE_ADMIN"],
    },
];
