<script lang="ts">
    import { untrack } from "svelte";

    import Banner from "./Banner.svelte";
    import Card from "./Card.svelte";
    import Countdown from "./Countdown.svelte";
    import ProjectTags from "./ProjectTags.svelte";
    import Tabs from "./Tabs.svelte";
    import TopRewards from "./TopRewards.svelte";
    import { languagesList } from "../../i18n/locales";
    import { locale, setLocale, t } from "../../i18n/store";
    import { escapeHTML } from "../../i18n/utils";
    import {
        type Project,
        type Accounting,
        apiProjectsIdOrSlugGet,
        type User,
        type ProjectCalendar,
        type AccountingBalancePoint,
    } from "../../openapi/client/index";
    import { getLanguageDisplayName } from "../../utils/lang";
    import LanguagesDropdown from "../header/LanguagesDropdown.svelte";
    import RememberIcon from "../icons/actions/RememberIcon.svelte";
    import Arrow from "../icons/navigation/Arrow.svelte";
    import Button from "../library/buttons/Button.svelte";
    import Toast from "../library/feedback/Toast.svelte";
    import Sharebutton from "../library/share/ShareButton.svelte";
    import Thtml from "../library/typography/Thtml.svelte";
    import Title from "../library/typography/Title.svelte";
    import Player from "../player/Player.svelte";

    let {
        project,
        accounting,
        owner,
        totalSupports,
        balancePoints,
    }: {
        project: Project;
        accounting: Accounting;
        owner: User;
        totalSupports: number;
        balancePoints: AccountingBalancePoint[];
    } = $props();

    const projectDeadline = $derived(getCurrentDeadline(project.calendar!));

    function getCurrentDeadline(calendar: ProjectCalendar) {
        const now = new Date();

        const minimum = new Date(calendar.minimum!);
        if (now < minimum) {
            return minimum;
        }

        if (!calendar.optimum) {
            return undefined;
        }

        const optimum = new Date(calendar.optimum);
        if (now < optimum) {
            return optimum;
        }

        return undefined;
    }

    // Seeds the initial pick; the language selector owns it from then on.
    let projectLanguage = $state(untrack(() => guessProjectLanguage(project.locales!)));

    function guessProjectLanguage(pLangs: string[]): string {
        if (typeof navigator === "undefined" || !navigator.languages) {
            return pLangs[0];
        }

        for (const navLang of navigator.languages) {
            const uLang = navLang.split("-")[0].toLowerCase();

            if (pLangs.includes(uLang)) {
                return uLang;
            }
        }

        return pLangs[0];
    }

    async function changeProjectLanguage(lang: string) {
        projectLanguage = lang;

        if (Object.keys(languagesList).includes(projectLanguage)) {
            setLocale(projectLanguage);
        }

        const { data, error } = await apiProjectsIdOrSlugGet({
            path: { idOrSlug: project?.id!.toString() },
            headers: { "Accept-Language": lang },
        });

        if (error || !data) {
            console.error(error);
        }

        project = data!;
    }

    let outOfCampaign = $state(false);
    $effect(() => {
        outOfCampaign = project.status !== "in_campaign";
    });

    let langMismatch = $state(false);
    let attemptedLang = $state("");

    locale.subscribe((locale) => {
        if (!project.locales?.includes(locale)) {
            langMismatch = true;
            attemptedLang = locale;
        } else {
            projectLanguage = locale;
        }
    });

    let tabsComponent: any;

    function scrollToRewards() {
        if (tabsComponent?.activateRewardsTab) {
            tabsComponent.activateRewardsTab();
        }
        setTimeout(() => {
            const rewardsElement = document.getElementById("tab-rewards");
            if (rewardsElement) {
                rewardsElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }
        }, 100);
    }
</script>

<section class="wrapper">
    <Toast variant="warning" bind:showToast={langMismatch} class="mb-3 w-full">
        {$t("pages.project.view.langNotAvailable", {
            lang: getLanguageDisplayName(attemptedLang)!,
        })}
    </Toast>

    <Toast variant="notification" bind:showToast={outOfCampaign} class="w-full">
        {$t("pages.project.view.outOfCampaign")}
    </Toast>

    <div class="my-10 flex w-full flex-col-reverse gap-5 lg:flex-row lg:justify-between">
        <div class="flex w-full flex-col gap-2.5 lg:w-[70%]">
            <div class="flex flex-col gap-2">
                <p class="text-content text-xl font-bold lg:text-2xl">
                    <Thtml
                        key="pages.project.view.owner"
                        vars={{
                            owner: `<a href="/user/${escapeHTML(owner.handle)}" class="font-bold text-black underline">${escapeHTML(owner.displayName ?? "")}</a>`,
                        }}
                    />
                </p>
                <Title level={1} variant="section" class="text-content">
                    {project.title}
                </Title>
            </div>

            <div>
                <p class="text-content transition-all duration-300 ease-in-out">
                    {project.subtitle}
                </p>
            </div>
        </div>

        <div class="flex w-full flex-col gap-4 lg:w-[30%] lg:justify-between">
            <div class="flex justify-end">
                <LanguagesDropdown
                    languages={project.locales!}
                    selected={projectLanguage}
                    onSelect={changeProjectLanguage}
                />
            </div>

            <div class="hidden lg:block">
                <Countdown deadline={projectDeadline} />
            </div>
        </div>
    </div>

    <div class="mb-6 flex h-auto flex-col items-stretch justify-between gap-6 lg:h-132 lg:flex-row">
        <div class="h-64 w-full lg:h-full lg:w-[70%]">
            <Player
                src={project.video?.src || ""}
                title={project.title || ""}
                thumbnails={project.video?.thumbnail || ""}
                poster={{
                    src: project.cover || project.video?.cover || "",
                    alt: project.title || "",
                }}
            />
        </div>
        <div class="flex h-auto w-full flex-col gap-4 lg:h-full lg:w-[30%]">
            <div class="lg:hidden">
                <Countdown deadline={projectDeadline} />
            </div>
            <Card
                {project}
                {accounting}
                {balancePoints}
                {totalSupports}
                onScrollToRewards={scrollToRewards}
            />
        </div>
    </div>

    <div class="mb-12 flex w-full flex-col justify-between gap-4 lg:flex-row">
        <ProjectTags {project} />
        <div class="flex flex-row justify-between gap-6">
            <Sharebutton shareText={project.title ?? ""} projectSlug={project.slug ?? ""} />
            <Button kind="invert" size="sm" class="px-0">
                <RememberIcon />
                {$t("common.remember")}
            </Button>
        </div>
    </div>
    <div class="flex flex-col gap-8">
        <div class="flex items-center justify-between">
            <Title level={2} variant="subsection">
                {$t("pages.project.view.rewards.trending")}
            </Title>
            <Button kind="secondary" class="hidden lg:flex" onclick={scrollToRewards}>
                <Arrow />{$t("pages.project.view.rewards.showAll")}
            </Button>
        </div>
        <TopRewards bind:lang={projectLanguage} {project} />
        <Button kind="secondary" class="lg:hidden" onclick={scrollToRewards}>
            <Arrow />{$t("pages.project.view.rewards.showAll")}
        </Button>
    </div>
    <Banner ownerName={owner.displayName || ""} />
</section>
<Tabs bind:this={tabsComponent} bind:lang={projectLanguage} bind:project {accounting} />
