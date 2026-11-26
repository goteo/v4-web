<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { locale, t } from "../../i18n/store";
    import { apiThemesIdOrSlugGet } from "../../openapi/client";
    import { extractId } from "../../utils/extractId";
    import { sdgsForThemes } from "../../utils/sdgs";

    import type { Project, Theme } from "../../openapi/client";

    interface Props {
        project: Project;
        class?: ClassNameValue;
    }

    let { project, class: classes = "" }: Props = $props();

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
</script>

{#if project.themes?.length}
    {#await getThemes(project.themes) then themes}
        {@const goals = sdgsForThemes(themes.map((theme) => theme.slug ?? ""))}

        {#if goals.length}
            <section
                class={twMerge("w-full rounded-lg border border-black/30 bg-white p-6", classes)}
            >
                <h2 class="text-primary text-lg font-bold uppercase">
                    {$t("pages.project.view.tabs.project.sdg.title")}
                </h2>

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
    {/await}
{/if}
