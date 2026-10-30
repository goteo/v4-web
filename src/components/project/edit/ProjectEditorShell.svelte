<script lang="ts">
    import ProjectEditor from "./ProjectEditor.svelte";
    import { getNextStepId, getStepComponent } from "./steps";
    import { locale, t } from "../../../i18n/store";
    import { withoutCache } from "../../../openapi/cacheInterceptor";
    import { apiProjectsIdOrSlugGet, type Project, type User } from "../../../openapi/client";
    import { draftsRepository } from "../../../repositories/drafts";
    import { createProjectDraftStore } from "../../../stores/drafts/draftsStore";
    import BrokenRobot from "../../errorpage/BrokenRobot.svelte";
    import ErrorPage from "../../errorpage/ErrorPage.svelte";
    import Spinner from "../../icons/status/Spinner.svelte";

    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";

    interface Props {
        /**
         * Project's idOrSlug or Draft's key
         */
        key: string;

        /**
         * User operating the edition
         */
        actor: User;

        /**
         * Project being edited
         */
        project?: Project;
    }

    let { key, actor, project }: Props = $props();

    let language: string = $derived.by(() => {
        if (project && project.locales && project.locales.length > 0) {
            return project.locales[0];
        }

        return $locale;
    });

    let editor = $derived.by(async (): Promise<ProjectDraftStore | undefined> => {
        if (project) {
            const { data } = await withoutCache(() =>
                apiProjectsIdOrSlugGet({
                    path: { idOrSlug: String(project.id) },
                    headers: { "Accept-Language": language },
                }),
            );

            const actual = data ?? $state.snapshot(project);

            const draft = await draftsRepository.getOrCreateFor(actor, actual, language);

            return createProjectDraftStore(draft);
        }

        const draft = await draftsRepository.get(key);

        if (!draft) {
            return undefined;
        }

        return createProjectDraftStore(draft);
    });

    let step = $derived.by(() => {
        let currentStep = "1";

        if (typeof window === "undefined") {
            return currentStep;
        }

        const url = new URL(window.location.href);
        const stepParam = url.searchParams.get("step");

        if (stepParam) {
            const parsedStep = parseInt(stepParam, 10);

            if (!isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= 6) {
                currentStep = String(parsedStep);
            }
        }

        return currentStep;
    });

    /**
     * Advance to the next implemented step. Steps without a component (e.g. the
     * "about you" step) are skipped, and the last step keeps the user in place.
     */
    function handleContinue() {
        const nextStep = getNextStepId(step);

        if (nextStep !== undefined) {
            handleStepChange(nextStep);
        }
    }

    function handleStepChange(newStep: string) {
        step = newStep;

        if (typeof window === "undefined") {
            return;
        }

        const url = new URL(window.location.href);
        url.searchParams.set("step", newStep);

        window.history.replaceState(
            window.history.state,
            "",
            `${url.pathname}?${url.searchParams}`,
        );
    }
</script>

{#await editor}
    <div class="wrapper">
        <span class="absolute inset-0 flex items-center justify-center">
            <Spinner />
        </span>
    </div>
{:then draft}
    {#if draft}
        {@const StepComponent = getStepComponent(step)}
        <ProjectEditor
            {draft}
            {step}
            onStepChange={handleStepChange}
            onLangChange={(lang) => (language = lang)}
        >
            <StepComponent {draft} onContinue={handleContinue} />
        </ProjectEditor>
    {:else}
        <ErrorPage
            code={404}
            title={$t("pages.404.title")}
            subtitle={$t("pages.404.subtitle")}
            ctaText={$t("common.goHome")}
        >
            <BrokenRobot />
        </ErrorPage>
    {/if}
{/await}
