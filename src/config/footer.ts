import Facebook from "../components/icons/social/Facebook.svelte";
import Gmail from "../components/icons/social/Gmail.svelte";
import Instagram from "../components/icons/social/Instagram.svelte";
import Linkedin from "../components/icons/social/Linkedin.svelte";
import X from "../components/icons/social/X.svelte";

import type { FooterConfig } from "../types/footer";

export const FOOTER_CONFIG: FooterConfig = {
    funding: [
        { src: "/images/partners/NGEU.png", alt: "Funded by the European Union NextGeneration EU" },
        { src: "/images/partners/MTES.png", alt: "Ministerio de Trabajo y Economía Social" },
        {
            src: "/images/partners/PRTR.png",
            alt: "Plan de Recuperación, Transformación y Resiliencia",
        },
    ],
    partOf: [
        {
            src: "/images/partners/xes.png",
            alt: "XES - Xarxa d'Economia Solidària",
            href: "https://xes.cat",
            size: "medium",
            class: "rounded-lg",
        },
        {
            src: "/images/partners/alda-europe.svg",
            alt: "Alda Europe - European Association for Local Democracy",
            href: "https://www.alda-europe.eu",
            size: "medium",
            class: "rounded-lg",
        },
        {
            src: "/images/partners/alianza-por-el-clima.webp",
            alt: "Alianza por el Clima",
            href: "https://alianzaporelclima.org",
            size: "medium",
            class: "rounded-lg",
        },
        {
            src: "/images/partners/ampliando-democracia.jpg",
            alt: "Ampliando Democracia",
            href: "https://ampliandodemocracia.org",
            size: "medium",
            class: "rounded-lg",
        },
    ],
    navColumns: [
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
                {
                    href: "/tax-calculator",
                    labelKey: "common.footer.navigation.help.taxCalculator",
                },
            ],
        },
        {
            titleKey: "common.footer.navigation.aboutGoteo.title",
            links: [
                { href: "/about", labelKey: "common.footer.navigation.aboutGoteo.whoWeAre" },
                {
                    href: "/benefits",
                    labelKey: "common.footer.navigation.aboutGoteo.goteoBenefits",
                },
                {
                    href: "/impact",
                    labelKey: "common.footer.navigation.aboutGoteo.foundationImpact",
                },
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
    ],
    legalLinks: [
        { href: "/terms", labelKey: "common.footer.legal.termsOfUse" },
        { href: "/privacy", labelKey: "common.footer.legal.privacyPolicy" },
        { href: "/licenses", labelKey: "common.footer.legal.licenses" },
        { href: "/stats", labelKey: "common.footer.legal.stats" },
    ],
    social: [
        {
            icon: Gmail,
            href: "mailto:info@goteo.org",
            ariaLabelKey: "common.footer.a11y.social.email",
        },
        {
            icon: Instagram,
            href: "https://instagram.com/goteofunding",
            ariaLabelKey: "common.footer.a11y.social.instagram",
        },
        {
            icon: Facebook,
            href: "https://facebook.com/goteofunding",
            ariaLabelKey: "common.footer.a11y.social.facebook",
        },
        {
            icon: X,
            href: "https://twitter.com/goteofunding",
            ariaLabelKey: "common.footer.a11y.social.x",
        },
        {
            icon: Linkedin,
            href: "https://www.linkedin.com/company/platoniqlab",
            ariaLabelKey: "common.footer.a11y.social.linkedin",
        },
    ],
    brand: {
        backgroundImage: "/images/brand/path2.svg",
        logo: { src: "/images/brand/goteo-white-logo.svg", alt: "Goteo logo" },
        platoniq: { src: "/images/brand/platoniq.png", alt: "Platoniq Foundation logo" },
    },
};
