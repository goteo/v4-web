import Facebook from "../components/icons/social/Facebook.svelte";
import Gmail from "../components/icons/social/Gmail.svelte";
import Instagram from "../components/icons/social/Instagram.svelte";
import Linkedin from "../components/icons/social/Linkedin.svelte";
import X from "../components/icons/social/X.svelte";
import { labels, type Locale } from "../i18n/locales";
import { useTranslations } from "../i18n/utils";

import type {
    FooterConfig,
    FooterPartner,
    FooterSocialLink,
    FooterSocialNetwork,
    LocalizedText,
} from "../types/footer";

/** Not editable from the admin: the logo has its own /admin/customize tab. */
export const FOOTER_BRAND = {
    backgroundImage: "/images/brand/path2.svg",
    logo: { src: "/images/brand/goteo-white-logo.svg", alt: "Goteo logo" },
    platoniq: { src: "/images/brand/platoniq.png", alt: "Platoniq Foundation logo" },
};

/** Each network's icon; its accessible name is `common.footer.a11y.social.<network>`. */
export const FOOTER_SOCIAL_ICONS: Record<FooterSocialNetwork, typeof Gmail> = {
    email: Gmail,
    instagram: Instagram,
    facebook: Facebook,
    x: X,
    linkedin: Linkedin,
};

const FUNDING: FooterPartner[] = [
    { src: "/images/partners/NGEU.png", alt: "Funded by the European Union NextGeneration EU" },
    { src: "/images/partners/MTES.png", alt: "Ministerio de Trabajo y Economía Social" },
    {
        src: "/images/partners/PRTR.png",
        alt: "Plan de Recuperación, Transformación y Resiliencia",
    },
];

const PART_OF: FooterPartner[] = [
    {
        src: "/images/partners/xes.png",
        alt: "XES - Xarxa d'Economia Solidària",
        href: "https://xes.cat",
    },
    {
        src: "/images/partners/alda-europe.svg",
        alt: "Alda Europe - European Association for Local Democracy",
        href: "https://www.alda-europe.eu",
    },
    {
        src: "/images/partners/alianza-por-el-clima.webp",
        alt: "Alianza por el Clima",
        href: "https://alianzaporelclima.org",
    },
    {
        src: "/images/partners/ampliando-democracia.jpg",
        alt: "Ampliando Democracia",
        href: "https://ampliandodemocracia.org",
    },
];

const NAV_COLUMNS = [
    {
        titleKey: "common.footer.navigation.collaborate.title",
        links: [
            {
                href: "/create-project",
                labelKey: "common.footer.navigation.collaborate.createProject",
            },
            {
                href: "/matchfunding",
                labelKey: "common.footer.navigation.collaborate.matchfunding",
            },
            { href: "/workshops", labelKey: "common.footer.navigation.collaborate.workshops" },
        ],
    },
    {
        titleKey: "common.footer.navigation.help.title",
        links: [
            { href: "/faqs", labelKey: "common.footer.navigation.help.faqs" },
            { href: "/contact", labelKey: "common.footer.navigation.help.contact" },
            { href: "/tax-calculator", labelKey: "common.footer.navigation.help.taxCalculator" },
        ],
    },
    {
        titleKey: "common.footer.navigation.aboutGoteo.title",
        links: [
            { href: "/about", labelKey: "common.footer.navigation.aboutGoteo.whoWeAre" },
            { href: "/benefits", labelKey: "common.footer.navigation.aboutGoteo.goteoBenefits" },
            { href: "/impact", labelKey: "common.footer.navigation.aboutGoteo.foundationImpact" },
            {
                href: "/platoniq",
                labelKey: "common.footer.navigation.aboutGoteo.platoniqFoundation",
            },
        ],
    },
    {
        titleKey: "common.footer.navigation.forUsers.title",
        links: [
            { href: "/wallet", labelKey: "common.footer.navigation.forUsers.rechargeWallet" },
            // GOTEO-OC-DONATION-CERTIFICATE: "Descarga certificado" link is exclusive to
            // the donation-certificate feature of Goteo under Fundación Platoniq, hidden
            // in the open-core.
            // { href: "/certificate", labelKey: "common.footer.navigation.forUsers.downloadCertificate" },
            {
                href: "/funds",
                labelKey: "common.footer.navigation.forUsers.accessComplementaryFunds",
            },
            {
                href: "/program",
                labelKey: "common.footer.navigation.forUsers.designFundingProgram",
            },
        ],
    },
];

const LEGAL_LINKS = [
    { href: "/terms", labelKey: "common.footer.legal.termsOfUse" },
    { href: "/privacy", labelKey: "common.footer.legal.privacyPolicy" },
    { href: "/licenses", labelKey: "common.footer.legal.licenses" },
    { href: "/stats", labelKey: "common.footer.legal.stats" },
];

const SOCIAL: FooterSocialLink[] = [
    { network: "email", href: "mailto:info@goteo.org" },
    { network: "instagram", href: "https://instagram.com/goteofunding" },
    { network: "facebook", href: "https://facebook.com/goteofunding" },
    { network: "x", href: "https://twitter.com/goteofunding" },
    { network: "linkedin", href: "https://www.linkedin.com/company/platoniqlab" },
];

const translators = Object.keys(labels).map((locale) => [locale, useTranslations(locale)] as const);

/** One i18n key resolved in every UI locale. */
function localize(key: string): LocalizedText {
    return Object.fromEntries(translators.map(([locale, t]) => [locale, t(key)]));
}

/**
 * The footer shown until an admin saves one: the built-in links with their texts taken
 * from the i18n catalogues, so they keep following Crowdin until then.
 */
export function buildDefaultFooter(): FooterConfig {
    return {
        hidden: { partners: false, navigation: false, legal: false, social: false },
        partnerGroups: [
            { title: localize("common.footer.funding.title"), partners: FUNDING },
            { title: localize("common.footer.funding.partOf"), partners: PART_OF },
        ],
        navColumns: NAV_COLUMNS.map((column) => ({
            title: localize(column.titleKey),
            links: column.links.map(({ href, labelKey }) => ({ href, label: localize(labelKey) })),
        })),
        legalLinks: LEGAL_LINKS.map(({ href, labelKey }) => ({ href, label: localize(labelKey) })),
        social: SOCIAL,
    };
}

/**
 * A localized text in `lang`, falling back to the default locale.
 * @param text The stored text
 * @param lang The locale the page is rendered in
 */
export function localized(text: LocalizedText, lang: Locale): string {
    return text[lang] || text[import.meta.env.PUBLIC_DEFAULT_LANGUAGE as Locale] || "";
}
