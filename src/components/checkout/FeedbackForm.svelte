<script lang="ts">
    import CommentCard from "./CommentCard.svelte";
    import { t } from "../../i18n/store";
    import { type Project, type ProjectSupport } from "../../openapi/client";
    import { client } from "../../openapi/client/client.gen";
    import { apiProjectsIdOrSlugGetUrl } from "../../openapi/client/operation-paths.gen";
    import RadioButton from "../library/inputs/RadioButton.svelte";
    import Title from "../library/typography/Title.svelte";

    interface Props {
        paymentMethod?: string;
        projects: Project[];
        projectSupports: ProjectSupport[];
    }

    let { paymentMethod = undefined, projects, projectSupports }: Props = $props();

    let type = $state<"organization" | "individual">("organization");

    let feedbackItems = $derived(() =>
        projects.map((project) => {
            const iri = client.buildUrl({
                url: apiProjectsIdOrSlugGetUrl,
                path: { idOrSlug: project.id },
            });

            const support = projectSupports.find((ps) => iri.endsWith(ps.project!))!;

            return { project, support };
        }),
    );
</script>

<div class="md:w-full md:max-w-167">
    <form id="feedback" method="POST" class="flex flex-col gap-4">
        <div class="flex w-full max-w-md flex-col gap-4">
            <div class="flex flex-row items-center gap-2">
                <Title level={2} variant="subsection">
                    {$t("pages.checkout.verify.approved.formGoal.title")}
                </Title>
            </div>
        </div>
        <fieldset class="flex w-full max-w-md flex-col gap-6">
            <RadioButton name="type" value="organization" bind:group={type}>
                <div class="text-content text-base/6 font-normal">
                    {$t("pages.checkout.verify.approved.formGoal.options.2")}
                    <span class="capitalize">{paymentMethod}</span>
                </div>
            </RadioButton>

            <RadioButton name="type" value="individual" bind:group={type}>
                <div class="text-content flex flex-col text-base/6 font-normal">
                    {$t("pages.checkout.verify.approved.formGoal.options.1")}
                    <a href="/wallet" class="text-secondary font-bold underline"
                        >{$t("common.learnMore")}</a
                    >
                </div>
            </RadioButton>
        </fieldset>

        <div class="mt-6 flex w-full max-w-167 flex-col gap-6">
            <div class="flex w-full max-w-md flex-col gap-4">
                <Title level={2} variant="subsection">
                    {$t("pages.checkout.verify.approved.formReview.title")}
                </Title>
                <p class="text-content">
                    {$t("pages.checkout.verify.approved.formReview.description")}
                </p>
            </div>

            <div class="mb-10 flex flex-col gap-7">
                {#each feedbackItems() as { project, support }, index}
                    <div class="flex flex-col gap-3">
                        <h1 class="text-lg font-bold text-black">
                            {$t("pages.checkout.verify.approved.formReview.crowdfundingProject")}
                            <a
                                href={`/project/${project.slug}`}
                                class="text-secondary underline underline-offset-1"
                                >{project.title}</a
                            >
                        </h1>
                        <CommentCard
                            {project}
                            {support}
                            onUpdate={(updatedSupport) => {
                                projectSupports = projectSupports.map((s) =>
                                    s.id === updatedSupport.id ? updatedSupport : s,
                                );
                            }}
                        />
                    </div>
                {/each}
            </div>
        </div>
    </form>
    <div id="feedback-error-content" class="mt-4 text-center text-red-500"></div>
</div>
