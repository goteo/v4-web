import type { Component } from "svelte";
import type { ClassNameValue } from "tailwind-merge";

export interface FooterLinkItem {
    /** i18n key, resolved via t() at render time */
    labelKey: string;
    /** path without locale prefix (e.g. "/faqs") or absolute URL */
    href: string;
}

export interface FooterNavColumn {
    /** i18n key for the column heading */
    titleKey: string;
    links: FooterLinkItem[];
}

export interface FooterPartner {
    src: string;
    /** organization name — plain text, deliberately not an i18n key */
    alt: string;
    href?: string;
    size?: "small" | "medium";
    class?: ClassNameValue;
}

export interface FooterSocialLink {
    icon: Component<{ width?: string | number; height?: string | number }>;
    href: string;
    /** i18n key for the link's aria-label */
    ariaLabelKey: string;
}

export interface FooterConfig {
    /** first band — non-linked funding logos */
    funding: FooterPartner[];
    /** second band — linked "somos parte de" logos */
    partOf: FooterPartner[];
    navColumns: FooterNavColumn[];
    legalLinks: FooterLinkItem[];
    social: FooterSocialLink[];
    brand: {
        backgroundImage: string;
        logo: { src: string; alt: string };
        platoniq: { src: string; alt: string };
    };
}
