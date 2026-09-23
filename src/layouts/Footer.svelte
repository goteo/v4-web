<script lang="ts">
    import FooterLink from "../components/footer/FooterLink.svelte";
    import FooterPartnerImage from "../components/footer/FooterPartnerImage.svelte";
    import Title from "../components/library/typography/Title.svelte";
    import { FOOTER_CONFIG as config } from "../config/footer";
    import { t } from "../i18n/store";
</script>

<footer class="text-variant1" aria-labelledby="footer-heading">
    <h2 id="footer-heading" class="sr-only">{$t("common.footer.a11y.footerHeading")}</h2>

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
                        aria-label={$t("common.footer.a11y.fundingPartners")}
                    >
                        <div class="flex items-center gap-3 sm:gap-4">
                            {#each config.funding as partner (partner.src)}
                                <FooterPartnerImage src={partner.src} alt={partner.alt} />
                            {/each}
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
                        aria-label={$t("common.footer.a11y.partnerOrganizations")}
                    >
                        {#each config.partOf as partner (partner.src)}
                            <FooterPartnerImage
                                src={partner.src}
                                alt={partner.alt}
                                href={partner.href}
                                size={partner.size}
                                class={partner.class}
                            />
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </section>

    <div
        class="bg-secondary relative rounded-t-3xl bg-size-[116%_114%] bg-position-[-127%_42%] bg-no-repeat min-[700px]:bg-size-[64%_108%] min-[700px]:bg-position-[114%]"
        style="background-image: url('{config.brand.backgroundImage}');"
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
                        aria-label={$t("common.footer.a11y.footerNavigation")}
                    >
                        <h2 id="footer-navigation-heading" class="sr-only">
                            {$t("common.footer.a11y.footerNavigation")}
                        </h2>

                        {#each config.navColumns as column (column.titleKey)}
                            <div class="space-y-2">
                                <Title
                                    level={4}
                                    variant="field"
                                    color="purple-soft"
                                    class="leading-6"
                                >
                                    {$t(column.titleKey)}
                                </Title>
                                <ul class="space-y-1 text-xs leading-5 sm:text-sm sm:leading-6">
                                    {#each column.links as link (link.href)}
                                        <li>
                                            <FooterLink href={link.href}>
                                                {$t(link.labelKey)}
                                            </FooterLink>
                                        </li>
                                    {/each}
                                </ul>
                            </div>
                        {/each}
                    </nav>

                    <!-- Logo -->
                    <div class="flex justify-center lg:justify-end">
                        <div class="h-8 w-28 sm:h-10 sm:w-36">
                            <img
                                src={config.brand.logo.src}
                                alt={config.brand.logo.alt}
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
                        aria-label={$t("common.footer.a11y.legalNavigation")}
                    >
                        <h3 id="footer-bottom-heading" class="sr-only">
                            {$t("common.footer.a11y.legalAndSocial")}
                        </h3>
                        {#each config.legalLinks as link (link.href)}
                            <FooterLink href={link.href} class="text-xs leading-4 font-medium">
                                {$t(link.labelKey)}
                            </FooterLink>
                        {/each}
                    </nav>

                    <!-- Social Media and Platoniq -->
                    <div class="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center">
                        <!-- Social Media Icons -->
                        <div
                            class="flex items-center justify-center gap-2 lg:justify-start"
                            role="list"
                            aria-label={$t("common.footer.a11y.socialLinks")}
                        >
                            {#each config.social as link (link.href)}
                                <a
                                    href={link.href}
                                    class="focus:ring-purple-soft focus:ring-offset-secondary rounded-sm transition-all duration-200 hover:opacity-80 focus:ring-2 focus:ring-offset-2 focus:outline-none"
                                    aria-label={$t(link.ariaLabelKey)}
                                >
                                    <link.icon width="24" height="24" />
                                </a>
                            {/each}
                        </div>

                        <!-- Platoniq Foundation -->
                        <div class="text-variant1 flex flex-col items-center lg:items-start">
                            <img
                                src={config.brand.platoniq.src}
                                alt={config.brand.platoniq.alt}
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
