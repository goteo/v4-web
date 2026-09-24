<script lang="ts">
    import FooterLink from "../components/footer/FooterLink.svelte";
    import FooterPartnerImage from "../components/footer/FooterPartnerImage.svelte";
    import Facebook from "../components/icons/social/Facebook.svelte";
    import Gmail from "../components/icons/social/Gmail.svelte";
    import Instagram from "../components/icons/social/Instagram.svelte";
    import Linkedin from "../components/icons/social/Linkedin.svelte";
    import X from "../components/icons/social/X.svelte";
    import Title from "../components/library/typography/Title.svelte";
    import { t } from "../i18n/store";
</script>

<footer class="text-variant1" aria-labelledby="footer-heading">
    <!-- Funding Partners Section -->
    <section
        class="bg-purple-soft text-tertiary border-variant1 border-2 border-b-0 py-6 sm:py-8 md:py-10"
        aria-labelledby="funding-partners-heading"
    >
        <div class="wrapper">
            <div
                class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8"
            >
                <!-- Funding Partners -->
                <div class="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                    <Title
                        level={3}
                        variant="field"
                        color="secondary"
                        id="funding-partners-heading"
                    >
                        {$t("common.footer.funding.title")}
                    </Title>
                    <div
                        class="flex items-center gap-4"
                        role="list"
                        aria-label="Funding partner organizations"
                    >
                        <div class="flex items-center gap-3 sm:gap-4">
                            <FooterPartnerImage
                                src="/images/partners/NGEU.png"
                                alt="Funded by the European Union NextGeneration EU"
                            />
                            <FooterPartnerImage
                                src="/images/partners/MTES.png"
                                alt="Ministerio de Trabajo y Economía Social"
                            />
                            <FooterPartnerImage
                                src="/images/partners/PRTR.png"
                                alt="Plan de Recuperación, Transformación y Resiliencia"
                            />
                        </div>
                    </div>
                </div>

                <!-- Part Of Section -->
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                    <Title level={3} variant="field" color="secondary" weight="medium">
                        {$t("common.footer.funding.partOf")}
                    </Title>
                    <div
                        class="flex items-center gap-2 sm:gap-3"
                        role="list"
                        aria-label="Partner organizations"
                    >
                        <FooterPartnerImage
                            src="/images/partners/xes.png"
                            alt="XES - Xarxa d'Economia Solidària"
                            href="https://xes.cat"
                            class="rounded-lg"
                            size="medium"
                        />
                        <FooterPartnerImage
                            src="/images/partners/alda-europe.svg"
                            alt="Alda Europe - European Association for Local Democracy"
                            href="https://www.alda-europe.eu"
                            class="rounded-lg"
                            size="medium"
                        />
                        <FooterPartnerImage
                            src="/images/partners/alianza-por-el-clima.webp"
                            alt="Alianza por el Clima"
                            href="https://alianzaporelclima.org"
                            class="rounded-lg"
                            size="medium"
                        />
                        <FooterPartnerImage
                            src="/images/partners/ampliando-democracia.jpg"
                            alt="Ampliando Democracia"
                            href="https://ampliandodemocracia.org"
                            class="rounded-lg"
                            size="medium"
                        />
                    </div>
                </div>
            </div>
        </div>
    </section>

    <div
        class="bg-secondary relative rounded-t-3xl bg-size-[116%_114%] bg-position-[-127%_42%] bg-no-repeat min-[700px]:bg-size-[64%_108%] min-[700px]:bg-position-[114%]"
        style="background-image: url('/images/brand/path2.svg');"
    >
        <!-- Main Footer Content -->
        <section
            class="relative z-10 py-6 sm:py-8 md:py-10"
            aria-labelledby="footer-navigation-heading"
        >
            <div class="wrapper">
                <div class="flex flex-col gap-8 lg:flex-row lg:justify-between lg:gap-8">
                    <!-- Navigation Links -->
                    <nav
                        class="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:flex lg:flex-row lg:gap-8 xl:gap-10"
                        aria-label="Footer navigation"
                    >
                        <h2 id="footer-navigation-heading" class="sr-only">Footer Navigation</h2>

                        <!-- Collaborate -->
                        <div class="space-y-2">
                            <Title level={4} variant="field" color="purple-soft" class="leading-6">
                                {$t("common.footer.navigation.collaborate.title")}
                            </Title>
                            <ul class="space-y-1 text-xs leading-5 sm:text-sm sm:leading-6">
                                <li>
                                    <FooterLink href="/create-project">
                                        {$t("common.footer.navigation.collaborate.createProject")}
                                    </FooterLink>
                                </li>
                                <li>
                                    <FooterLink href="/matchfunding">
                                        {$t("common.footer.navigation.collaborate.matchfunding")}
                                    </FooterLink>
                                </li>
                                <li>
                                    <FooterLink href="/workshops">
                                        {$t("common.footer.navigation.collaborate.workshops")}
                                    </FooterLink>
                                </li>
                            </ul>
                        </div>

                        <!-- Help -->
                        <div class="space-y-2">
                            <Title level={4} variant="field" color="purple-soft" class="leading-6">
                                {$t("common.footer.navigation.help.title")}
                            </Title>
                            <ul class="space-y-1 text-xs leading-5 sm:text-sm sm:leading-6">
                                <li>
                                    <FooterLink href="/faqs">
                                        {$t("common.footer.navigation.help.faqs")}
                                    </FooterLink>
                                </li>
                                <li>
                                    <FooterLink href="/contact">
                                        {$t("common.footer.navigation.help.contact")}
                                    </FooterLink>
                                </li>
                                <li>
                                    <FooterLink href="/tax-calculator">
                                        {$t("common.footer.navigation.help.taxCalculator")}
                                    </FooterLink>
                                </li>
                            </ul>
                        </div>

                        <!-- About Goteo -->
                        <div class="space-y-2">
                            <Title level={4} variant="field" color="purple-soft" class="leading-6">
                                {$t("common.footer.navigation.aboutGoteo.title")}
                            </Title>
                            <ul class="space-y-1 text-xs leading-5 sm:text-sm sm:leading-6">
                                <li>
                                    <FooterLink href="/about">
                                        {$t("common.footer.navigation.aboutGoteo.whoWeAre")}
                                    </FooterLink>
                                </li>
                                <li>
                                    <FooterLink href="/benefits">
                                        {$t("common.footer.navigation.aboutGoteo.goteoBenefits")}
                                    </FooterLink>
                                </li>
                                <li>
                                    <FooterLink href="/impact">
                                        {$t("common.footer.navigation.aboutGoteo.foundationImpact")}
                                    </FooterLink>
                                </li>
                                <li>
                                    <FooterLink href="/platoniq">
                                        {$t(
                                            "common.footer.navigation.aboutGoteo.platoniqFoundation",
                                        )}
                                    </FooterLink>
                                </li>
                            </ul>
                        </div>

                        <!-- For Users -->
                        <div class="space-y-2">
                            <Title level={4} variant="field" color="purple-soft" class="leading-6">
                                {$t("common.footer.navigation.forUsers.title")}
                            </Title>
                            <ul class="space-y-1 text-xs leading-5 sm:text-sm sm:leading-6">
                                <li>
                                    <FooterLink href="/wallet">
                                        {$t("common.footer.navigation.forUsers.rechargeWallet")}
                                    </FooterLink>
                                </li>
                                <!-- GOTEO-OC-DONATION-CERTIFICATE: "Descarga certificado" link is exclusive to
                                     the donation-certificate feature of Goteo under Fundación Platoniq, hidden
                                     in the open-core. Re-enable when a feature toggle exists. Do not delete.
                                <li>
                                    <FooterLink href="/certificate">
                                        {$t(
                                            "common.footer.navigation.forUsers.downloadCertificate",
                                        )}
                                    </FooterLink>
                                </li>
                                -->
                                <li>
                                    <FooterLink href="/funds">
                                        {$t(
                                            "common.footer.navigation.forUsers.accessComplementaryFunds",
                                        )}
                                    </FooterLink>
                                </li>
                                <li>
                                    <FooterLink href="/program">
                                        {$t(
                                            "common.footer.navigation.forUsers.designFundingProgram",
                                        )}
                                    </FooterLink>
                                </li>
                            </ul>
                        </div>
                    </nav>

                    <!-- Logo -->
                    <div class="flex justify-center lg:justify-end">
                        <div class="h-8 w-28 sm:h-10 sm:w-36">
                            <img
                                src="/images/brand/goteo-white-logo.svg"
                                alt="Goteo logo"
                                class="h-full w-full object-contain"
                                loading="lazy"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Bottom Footer -->
        <section
            class="relative z-10 pb-6 sm:pb-8 md:pb-10"
            aria-labelledby="footer-bottom-heading"
        >
            <div class="wrapper">
                <div
                    class="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between"
                >
                    <!-- Legal Links -->
                    <nav
                        class="flex flex-wrap gap-4 sm:gap-6 lg:gap-8"
                        aria-label="Legal navigation"
                    >
                        <h3 id="footer-bottom-heading" class="sr-only">Legal and Social Links</h3>
                        <FooterLink href="/terms" class="text-xs leading-4 font-medium">
                            {$t("common.footer.legal.termsOfUse")}
                        </FooterLink>
                        <FooterLink href="/privacy" class="text-xs leading-4 font-medium">
                            {$t("common.footer.legal.privacyPolicy")}
                        </FooterLink>
                        <FooterLink href="/licenses" class="text-xs leading-4 font-medium">
                            {$t("common.footer.legal.licenses")}
                        </FooterLink>
                        <FooterLink href="/stats" class="text-xs leading-4 font-medium">
                            {$t("common.footer.legal.stats")}
                        </FooterLink>
                    </nav>

                    <!-- Social Media and Platoniq -->
                    <div class="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center">
                        <!-- Social Media Icons -->
                        <div
                            class="flex items-center justify-center gap-2 lg:justify-start"
                            role="list"
                            aria-label="Social media links"
                        >
                            <a
                                href="mailto:info@goteo.org"
                                class="focus:ring-purple-soft focus:ring-offset-secondary rounded-sm transition-all duration-200 hover:opacity-80 focus:ring-2 focus:ring-offset-2 focus:outline-none"
                                aria-label="Send email to info@goteo.org"
                            >
                                <Gmail width="24" height="24" />
                            </a>
                            <a
                                href="https://instagram.com/goteofunding"
                                class="focus:ring-purple-soft focus:ring-offset-secondary rounded-sm transition-all duration-200 hover:opacity-80 focus:ring-2 focus:ring-offset-2 focus:outline-none"
                                aria-label="Follow us on Instagram"
                            >
                                <Instagram width="24" height="24" />
                            </a>
                            <a
                                href="https://facebook.com/goteofunding"
                                class="focus:ring-purple-soft focus:ring-offset-secondary rounded-sm transition-all duration-200 hover:opacity-80 focus:ring-2 focus:ring-offset-2 focus:outline-none"
                                aria-label="Follow us on Facebook"
                            >
                                <Facebook width="24" height="24" />
                            </a>
                            <a
                                href="https://twitter.com/goteofunding"
                                class="focus:ring-purple-soft focus:ring-offset-secondary rounded-sm transition-all duration-200 hover:opacity-80 focus:ring-2 focus:ring-offset-2 focus:outline-none"
                                aria-label="Follow us on X (formerly Twitter)"
                            >
                                <X width="24" height="24" />
                            </a>
                            <a
                                href="https://www.linkedin.com/company/platoniqlab"
                                class="focus:ring-purple-soft focus:ring-offset-secondary rounded-sm transition-all duration-200 hover:opacity-80 focus:ring-2 focus:ring-offset-2 focus:outline-none"
                                aria-label="Connect with us on LinkedIn"
                            >
                                <Linkedin width="24" height="24" />
                            </a>
                        </div>

                        <!-- Platoniq Foundation -->
                        <div class="text-variant1 flex flex-col items-center lg:items-start">
                            <img
                                src="/images/brand/platoniq.png"
                                alt="Platoniq Foundation logo"
                                class="h-4 sm:h-5"
                                loading="lazy"
                            />
                            <div class="text-xs leading-normal font-light sm:text-sm">
                                {$t("common.footer.platoniq.foundation")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</footer>
