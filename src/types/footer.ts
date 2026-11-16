import type { Locale } from "../i18n/locales";

/** A text written once per UI locale. Missing locales fall back to the default one. */
export type LocalizedText = Partial<Record<Locale, string>>;

export interface FooterLinkItem {
    label: LocalizedText;
    /** path without locale prefix (e.g. "/faqs") or absolute URL */
    href: string;
}

export const FOOTER_SOCIAL_NETWORKS = ["email", "instagram", "facebook", "x", "linkedin"] as const;

export type FooterSocialNetwork = (typeof FOOTER_SOCIAL_NETWORKS)[number];

export interface FooterSocialLink {
    /** picks the icon and the accessible name, both resolved in code */
    network: FooterSocialNetwork;
    href: string;
}

export interface FooterNavColumn {
    title: LocalizedText;
    links: FooterLinkItem[];
}

export interface FooterPartner {
    src: string;
    /** organization name — plain text, deliberately not localized */
    alt: string;
    href?: string;
}

/** A titled row of logos ("Financia:", "Somos parte de:"…); hidden while it has none. */
export interface FooterPartnerGroup {
    title: LocalizedText;
    partners: FooterPartner[];
}

export const FOOTER_SECTIONS = ["partners", "navigation", "legal", "social"] as const;

export type FooterSection = (typeof FOOTER_SECTIONS)[number];

/** The part of the footer stored in D1 and edited from /admin/customize/footer. */
export interface FooterConfig {
    /** Sections left out of the footer, whatever they contain. */
    hidden: Record<FooterSection, boolean>;
    partnerGroups: FooterPartnerGroup[];
    navColumns: FooterNavColumn[];
    legalLinks: FooterLinkItem[];
    social: FooterSocialLink[];
}
