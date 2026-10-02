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
        path: "/admin",
        roles: ["ROLE_ADMIN"],
    },
];
