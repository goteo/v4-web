<script lang="ts">
    import { t } from "../../i18n/store";
    import { getAppName } from "../../utils/consts";
    import Title from "../library/typography/Title.svelte";
</script>

<section class="wrapper py-16">
    <div class="flex flex-col gap-0 overflow-hidden rounded-3xl bg-white shadow-sm lg:flex-row">
        <!-- Content Section -->
        <div
            class="border-purple-soft flex flex-col justify-between gap-6 rounded-l-3xl border border-r-0 bg-white p-6 md:gap-8 md:py-6 md:pr-10 md:pl-6 lg:min-h-121 lg:w-173"
        >
            <!-- Text Content -->
            <div class="flex min-h-87 max-w-132.25 flex-col gap-4">
                <!-- Main Headline -->
                <Title level={2} variant="section" color="secondary" class="leading-tight">
                    {$t("pages.home.stories.title")}
                </Title>

                <!-- Subtitle -->
                <Title level={3} variant="subsection" color="secondary">
                    {$t("pages.home.stories.subtitle")}
                </Title>

                <!-- Description -->
                <div class="text-content flex-1 text-sm leading-6 md:text-base md:leading-6">
                    {#each $t("pages.home.stories.description").split("\n") as paragraph, index}
                        <p class:mt-4={index > 0}>
                            {paragraph}
                        </p>
                    {/each}
                </div>
            </div>

            <!-- Call to Action Button -->
            <a
                href="/donate"
                class="bg-variant1 text-secondary hover:bg-secondary flex w-fit items-center justify-center gap-2 rounded-3xl px-6 py-4 text-sm leading-6 font-bold transition-all duration-200 hover:text-white md:text-base"
            >
                {$t("pages.home.stories.button")}
            </a>
        </div>

        <!-- Images Section -->
        <div class="bg-variant1 relative min-h-75 flex-1 rounded-r-3xl lg:min-h-121 lg:w-167">
            <!-- Main central image -->
            <div
                class="absolute top-1/2 left-1/2 h-50 w-70 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-cover bg-center bg-no-repeat shadow-lg md:h-75 md:w-100 lg:h-109 lg:w-109"
                style="background-image: url('/images/home/stories-main.png')"
                aria-label={`${getAppName()} community members`}
            ></div>

            <!-- Top right smaller image -->
            <div
                class="absolute top-4 right-4 h-20 w-30 rounded-2xl bg-cover bg-center bg-no-repeat shadow-md md:h-30 md:w-45 lg:top-[calc(50%-115px)] lg:right-8 lg:h-51.5 lg:w-74.75"
                style="background-image: url('/images/home/stories-team-rebranding.png')"
                aria-label="Team collaboration on rebranding"
            ></div>

            <!-- Bottom right smaller image -->
            <div
                class="absolute right-4 bottom-4 h-20 w-30 rounded-2xl bg-cover bg-center bg-no-repeat shadow-md md:h-30 md:w-45 lg:top-[calc(50%+115px)] lg:right-8 lg:h-51.5 lg:w-74.75"
                style="background-image: url('/images/home/stories-office-workspace.png')"
                aria-label="Creative workspace"
            ></div>
        </div>
    </div>
</section>
