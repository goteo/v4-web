<script lang="ts">
    import {
        BookmarkOutline,
        BriefcaseOutline,
        FlaskOutline,
        GlobeOutline,
        GraduationCapOutline,
        HeartOutline,
        LandmarkOutline,
        NewspaperOutline,
        PaletteOutline,
        SeedlingOutline,
    } from "flowbite-svelte-icons";
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { locale, t } from "../../i18n/store";
    import { apiThemesIdOrSlugGet } from "../../openapi/client";
    import { extractId } from "../../utils/extractId";
    import { sdgsForThemes } from "../../utils/sdgs";
    import Chevron from "../icons/navigation/Chevron.svelte";

    import type { Project, Theme } from "../../openapi/client";

    interface Props {
        project: Project;
        /** Not in the API yet: v4-api drops v3 `social_commitment_description`. */
        socialCommitmentDescription?: string;
        class?: ClassNameValue;
    }

    let { project, socialCommitmentDescription, class: classes = "" }: Props = $props();

    async function getThemes(iris: string[]): Promise<Theme[]> {
        const responses = await Promise.all(
            iris.map((iri) =>
                apiThemesIdOrSlugGet({
                    headers: { "Accept-Language": $locale },
                    path: { idOrSlug: extractId(iri)! },
                }),
            ),
        );

        return responses.flatMap(({ data }) => (data ? [data] : []));
    }

    // Keyed by theme slug, see src/utils/sdgs.ts.
    const THEME_ICONS: Record<string, typeof BookmarkOutline> = {
        democracy: LandmarkOutline,
        "science-and-tech": FlaskOutline,
        "social-economy": BriefcaseOutline,
        journalism: NewspaperOutline,
        education: GraduationCapOutline,
        culture: PaletteOutline,
        sustainability: GlobeOutline,
        "health-and-cares": HeartOutline,
        "rural-and-ecology": SeedlingOutline,
    };

    const cardClass = "rounded-lg border border-black/30 bg-white p-6";
    const headingClass = "text-primary text-lg font-bold uppercase";
</script>

{#if project.themes?.length}
    {#await getThemes(project.themes) then themes}
        {@const goals = sdgsForThemes(themes.map((theme) => theme.slug ?? ""))}

        <div class={twMerge("flex w-full flex-col gap-6", classes)}>
            <details open class={twMerge("group", cardClass)}>
                <summary class="flex cursor-pointer list-none items-center justify-between">
                    <h2 class={headingClass}>
                        {$t("pages.project.view.tabs.project.socialCommitment")}
                    </h2>
                    <Chevron
                        direction="down"
                        class="text-primary -rotate-90 transition-transform group-open:rotate-0"
                    />
                </summary>

                <div class="mt-6 flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
                    <div class="flex shrink-0 flex-wrap gap-6">
                        {#each themes as theme (theme.id)}
                            {@const Icon = THEME_ICONS[theme.slug ?? ""] ?? BookmarkOutline}

                            <div class="flex w-28 flex-col items-center gap-3 text-center">
                                <Icon class="text-secondary size-14" strokeWidth={1.5} />
                                <span class="text-sm font-bold text-black">{theme.name}</span>
                            </div>
                        {/each}
                    </div>
                    {#if socialCommitmentDescription}
                        <p class="text-content text-sm leading-6">{socialCommitmentDescription}</p>
                    {/if}
                </div>
            </details>

            {#if goals.length}
                <section class={cardClass}>
                    <h2 class={headingClass}>{$t("pages.project.view.tabs.project.sdg.title")}</h2>

                    <div class="mt-6 flex flex-col gap-6">
                        {#each goals as goal (goal)}
                            {@const title = $t(
                                `pages.project.view.tabs.project.sdg.goals.${goal}.title`,
                            )}

                            <div class="flex items-start gap-6">
                                <img
                                    src={`/images/sdg/sdg-${goal}.png`}
                                    alt={title}
                                    width="96"
                                    height="96"
                                    loading="lazy"
                                    class="size-24 shrink-0"
                                />
                                <div class="flex flex-col gap-2">
                                    <h3 class="text-2xl font-medium text-black">{title}</h3>
                                    <p class="text-content">
                                        {$t(
                                            `pages.project.view.tabs.project.sdg.goals.${goal}.description`,
                                        )}
                                    </p>
                                </div>
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}
        </div>
    {/await}
{/if}
