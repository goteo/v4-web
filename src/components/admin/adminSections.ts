export interface AdminLink {
    /** i18n key, resolved via t() at render time */
    labelKey: string;
    /** raw admin path without locale prefix, e.g. "/admin/charges" */
    href: string;
}

export interface AdminSection extends AdminLink {
    /** i18n key for the landing card description */
    descriptionKey?: string;
    /** sub-links shown on the landing card and in the sidebar */
    subSections?: AdminLink[];
}

export const ADMIN_SECTIONS: AdminSection[] = [
    {
        href: "/admin/charges",
        labelKey: "pages.admin.nav.charges",
        descriptionKey: "pages.admin.charges.description",
    },
    {
        href: "/admin/projects",
        labelKey: "pages.admin.nav.projects",
        descriptionKey: "pages.admin.projects.description",
    },
    {
        href: "/admin/users",
        labelKey: "pages.admin.nav.users",
        descriptionKey: "pages.admin.users.description",
    },
    {
        href: "/admin/comm",
        labelKey: "pages.admin.nav.comm",
        descriptionKey: "pages.admin.comm.description",
        subSections: [
            { href: "/admin/comm/banners", labelKey: "pages.admin.comm.tabs.banners" },
            { href: "/admin/comm/newsletter", labelKey: "pages.admin.comm.tabs.newsletter" },
        ],
    },
    {
        href: "/admin/home",
        labelKey: "pages.admin.nav.home",
        descriptionKey: "pages.admin.home.description",
        subSections: [
            { href: "/admin/home/hero", labelKey: "pages.admin.home.tabs.hero" },
            { href: "/admin/home/highlights", labelKey: "pages.admin.home.tabs.highlights" },
        ],
    },
];
