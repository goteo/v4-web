<!--
    The footer markup, shared by the site footer (`layouts/Footer.astro`, server-rendered
    without hydration) and the live preview of the footer editor.

    Every editable element carries `data-edit` with its path in `FooterConfig`
    (e.g. "navColumns.0.links.1"), which the editor uses to jump to its field.
-->
<script lang="ts">
    import FooterLink from "./FooterLink.svelte";
    import FooterPartnerImage from "./FooterPartnerImage.svelte";
    import {
        FOOTER_BRAND as brand,
        FOOTER_SOCIAL_ICONS,
        localized,
    } from "../../layouts/footer-data";
    import Title from "../library/typography/Title.svelte";

    import type { Locale } from "../../i18n/locales";
    import type { FooterConfig } from "../../types/footer";

    interface Props {
        config: FooterConfig;
        lang: Locale;
        /** Passed in rather than `$t`, which only renders the default locale on the server. */
        t: (key: string) => string;
        /** Keeps heading ids unique when the preview and the site footer share a page. */
        idPrefix?: string;
    }

    let { config, lang, t, idPrefix = "footer" }: Props = $props();

    // Groups without logos are not shown; the index is kept for the editor's `data-edit` paths.
    const partnerGroups = $derived(
        config.partnerGroups
            .map((group, index) => ({ group, index }))
            .filter(({ group }) => group.partners.length > 0),
    );
</script>

<footer class="text-variant1" aria-labelledby="{idPrefix}-heading">
    <h2 id="{idPrefix}-heading" class="sr-only">{t("common.footer.a11y.footerHeading")}</h2>

    {#if !config.hidden.partners && partnerGroups.length > 0}
        <section
            class="bg-purple-soft text-tertiary border-variant1 border-t-2 py-6 sm:py-8 md:py-10"
            aria-label={t("common.footer.a11y.partnerOrganizations")}
        >
            <div class="wrapper">
                <div
                    class="flex flex-col gap-6 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-8"
                >
                    {#each partnerGroups as { group, index } (group)}
                        <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                            <div data-edit="partnerGroups.{index}">
                                <Title level={3} variant="field" color="secondary">
                                    {localized(group.title, lang)}
                                </Title>
                            </div>
                            <div
                                class="flex flex-wrap items-center gap-2 sm:gap-3"
                                role="list"
                                aria-label={localized(group.title, lang)}
                            >
                                {#each group.partners as partner, partnerIndex (partner)}
                                    <div data-edit="partnerGroups.{index}.partners.{partnerIndex}">
                                        <FooterPartnerImage
                                            src={partner.src}
                                            alt={partner.alt}
                                            href={partner.href || undefined}
                                            size="medium"
                                            class="rounded-lg"
                                        />
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </section>
    {/if}

    <div
        class="bg-secondary relative rounded-t-3xl bg-size-[116%_114%] bg-position-[-127%_42%] bg-no-repeat min-[700px]:bg-size-[64%_108%] min-[700px]:bg-position-[114%]"
        style="background-image: url('{brand.backgroundImage}');"
    >
        <section
            class="relative z-10 py-6 sm:py-8 md:py-10"
            aria-labelledby="{idPrefix}-navigation-heading"
        >
            <div class="wrapper">
                <div class="flex flex-col gap-8 lg:flex-row lg:justify-between lg:gap-8">
                    {#if !config.hidden.navigation}
                        <nav
                            class="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:flex lg:flex-row lg:gap-8 xl:gap-10"
                            aria-label={t("common.footer.a11y.footerNavigation")}
                        >
                            <h2 id="{idPrefix}-navigation-heading" class="sr-only">
                                {t("common.footer.a11y.footerNavigation")}
                            </h2>

                            {#each config.navColumns as column, columnIndex (column)}
                                <div class="space-y-2">
                                    <div data-edit="navColumns.{columnIndex}">
                                        <Title
                                            level={4}
                                            variant="field"
                                            color="purple-soft"
                                            class="leading-6"
                                        >
                                            {localized(column.title, lang)}
                                        </Title>
                                    </div>
                                    <ul class="space-y-1 text-xs leading-5 sm:text-sm sm:leading-6">
                                        {#each column.links as link, index (link)}
                                            <li data-edit="navColumns.{columnIndex}.links.{index}">
                                                <FooterLink href={link.href}>
                                                    {localized(link.label, lang)}
                                                </FooterLink>
                                            </li>
                                        {/each}
                                    </ul>
                                </div>
                            {/each}
                        </nav>
                    {/if}

                    <div class="flex justify-center lg:ml-auto lg:justify-end">
                        <div class="h-8 w-28 sm:h-10 sm:w-36">
                            <img
                                src={brand.logo.src}
                                alt={brand.logo.alt}
                                class="h-full w-full object-contain"
                                loading="lazy"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section
            class="relative z-10 pb-6 sm:pb-8 md:pb-10"
            aria-labelledby="{idPrefix}-bottom-heading"
        >
            <div class="wrapper">
                <div
                    class="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between"
                >
                    {#if !config.hidden.legal}
                        <nav
                            class="flex flex-wrap gap-4 sm:gap-6 lg:gap-8"
                            aria-label={t("common.footer.a11y.legalNavigation")}
                        >
                            <h3 id="{idPrefix}-bottom-heading" class="sr-only">
                                {t("common.footer.a11y.legalAndSocial")}
                            </h3>
                            {#each config.legalLinks as link, index (link)}
                                <span data-edit="legalLinks.{index}">
                                    <FooterLink
                                        href={link.href}
                                        class="text-xs leading-4 font-medium"
                                    >
                                        {localized(link.label, lang)}
                                    </FooterLink>
                                </span>
                            {/each}
                        </nav>
                    {/if}

                    <div
                        class="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center lg:ml-auto"
                    >
                        {#if !config.hidden.social}
                            <div
                                class="flex items-center justify-center gap-2 lg:justify-start"
                                role="list"
                                aria-label={t("common.footer.a11y.socialLinks")}
                            >
                                {#each config.social as link, index (link)}
                                    {@const Icon = FOOTER_SOCIAL_ICONS[link.network]}
                                    <a
                                        href={link.href}
                                        data-edit="social.{index}"
                                        class="focus:ring-purple-soft focus:ring-offset-secondary rounded-sm transition-all duration-200 hover:opacity-80 focus:ring-2 focus:ring-offset-2 focus:outline-none"
                                        aria-label={t(`common.footer.a11y.social.${link.network}`)}
                                    >
                                        <Icon width="24" height="24" />
                                    </a>
                                {/each}
                            </div>
                        {/if}

                        <div class="text-variant1 flex flex-col items-center lg:items-start">
                            <img
                                src={brand.platoniq.src}
                                alt={brand.platoniq.alt}
                                class="h-4 sm:h-5"
                                loading="lazy"
                            />
                            <div class="text-xs leading-normal font-light sm:text-sm">
                                {t("common.footer.platoniq.foundation")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</footer>
