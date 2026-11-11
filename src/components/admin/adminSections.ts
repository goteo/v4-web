import type { AdminSidebarItem } from "./AdminSidebar.svelte";

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
        href: "/admin/reviews/projects",
        labelKey: "pages.admin.nav.reviews",
        descriptionKey: "pages.admin.reviews.description",
    },
    {
        href: "/admin/users",
        labelKey: "pages.admin.nav.users",
        descriptionKey: "pages.admin.users.description",
    },
    {
        href: "/admin/categorization",
        labelKey: "pages.admin.nav.categorization",
        descriptionKey: "pages.admin.categorization.description",
    },
    {
        href: "/admin/comm",
        labelKey: "pages.admin.nav.comm",
        descriptionKey: "pages.admin.comm.description",
        subSections: [
            { href: "/admin/comm/blog", labelKey: "pages.admin.comm.tabs.blog" },
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
            { href: "/admin/home/proposed", labelKey: "pages.admin.home.tabs.proposed" },
            { href: "/admin/home/featured-users", labelKey: "pages.admin.home.tabs.featuredUsers" },
            { href: "/admin/home/banners", labelKey: "pages.admin.home.tabs.banners" },
        ],
    },
    {
        href: "/admin/customize",
        labelKey: "pages.admin.nav.customize",
        descriptionKey: "pages.admin.customize.description",
        subSections: [
            { href: "/admin/customize/logo", labelKey: "pages.admin.customize.tabs.logo" },
            { href: "/admin/customize/colors", labelKey: "pages.admin.customize.tabs.colors" },
            { href: "/admin/customize/footer", labelKey: "pages.admin.customize.tabs.footer" },
        ],
    },
];

/**
 * Sidebar entries for the sub-sections of a section, in the shape `WithSidebar` expects.
 *
 * Read out of the registry so that a sub-section is declared once: every page of a section
 * shares the very same sidebar, instead of each page folder carrying a copy of the list that
 * has to be kept in sync by hand.
 *
 * @param sectionHref the `href` of the section, e.g. "/admin/home"
 */
export function getSubSections(sectionHref: string): AdminSidebarItem[] {
    const section = ADMIN_SECTIONS.find((section) => section.href === sectionHref);

    return (section?.subSections ?? []).map(({ labelKey, href }) => ({
        label: labelKey,
        href,
    }));
}
