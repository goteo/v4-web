import type { AdminSidebarItem } from "../admin/AdminSidebar.svelte";

/**
 * Routes of the profile sections. Shared by the tab bar, the sidebar and the login callbacks so
 * that the three never drift apart: `AdminSidebar` matches `activePath` against each `href`
 * verbatim, and the tab bar prefixes them with the locale.
 */
export const PROFILE_PATHS = {
    /** The personal profile, and with it the landing of the profile tab */
    root: "/me/manage",
    profile: "/me/manage/profile",
    preferences: "/me/manage/preferences",
} as const;

export interface MeLink {
    /** i18n key, resolved via t() at render time */
    labelKey: string;
    /** raw path without locale prefix, e.g. "/me/manage/profile" */
    href: string;
}

export interface MeSection extends MeLink {
    /**
     * Match the tab on this exact path only. Needed for `/me`, which prefixes every other tab and
     * would otherwise stay highlighted while a sub-section is open.
     */
    exact?: boolean;
    /** Sub-links listed in the sidebar while this tab is open */
    subSections?: MeLink[];
}

export const ME_SECTIONS: MeSection[] = [
    { href: "/me", labelKey: "pages.me.nav.activity", exact: true },
    // GOTEO-ME-WALLET / GOTEO-ME-INBOX: the wallet already exists as a checkout step
    // (`/checkout/wallet`) and there is no inbox route yet, so neither has a landing under `/me`
    // to send the tab to. Re-enable when those pages are built.
    // { href: "/me/wallet", labelKey: "pages.me.nav.wallet" },
    // { href: "/me/inbox", labelKey: "pages.me.nav.inbox" },
    {
        href: PROFILE_PATHS.root,
        labelKey: "pages.me.nav.profile",
        subSections: [
            {
                labelKey: "pages.me.manage.sidebar.personalProfile",
                href: PROFILE_PATHS.root,
            },
            {
                labelKey: "pages.me.manage.sidebar.publicProfile",
                href: PROFILE_PATHS.profile,
            },
            {
                labelKey: "pages.me.manage.preferences.nav.preferences",
                href: PROFILE_PATHS.preferences,
            },
        ],
    },
];

/**
 * Sidebar entries for the profile tab, in the shape `WithSidebar` expects. Read out of
 * `ME_SECTIONS` so a new profile section only has to be declared once, see
 * `admin/home/subsections.ts` for the same trick on the admin side.
 */
export const PROFILE_NAV_ITEMS: AdminSidebarItem[] = (
    ME_SECTIONS.find((section) => section.href === PROFILE_PATHS.root)?.subSections ?? []
).map(({ labelKey, href }) => ({ label: labelKey, href }));
