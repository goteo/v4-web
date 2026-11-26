<script lang="ts">
    import { actions } from "astro:actions";
    import { tick, untrack } from "svelte";
    import { SvelteSet } from "svelte/reactivity";
    import { slide } from "svelte/transition";
    import { twJoin } from "tailwind-merge";

    import { languagesList, type Locale } from "../../../../i18n/locales";
    import { locale, t } from "../../../../i18n/store";
    import { getDefaultLanguage } from "../../../../utils/consts";
    import { formatDate } from "../../../../utils/dates";
    import Trash from "../../../icons/actions/Trash.svelte";
    import Chevron from "../../../icons/navigation/Chevron.svelte";
    import ActionableButton from "../../../library/buttons/ActionableButton.svelte";
    import Button from "../../../library/buttons/Button.svelte";
    import Toast from "../../../library/feedback/Toast.svelte";
    import TabNavigation from "../../../library/layout/TabNavigation.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { Faq, FaqInput } from "../../../../repositories/faqs";
    import type { LocalizedText } from "../../../../types/footer";

    type EditableFaq = FaqInput & { dateUpdated?: Date };

    interface Props {
        faqs: Faq[];
    }

    let { faqs: initial }: Props = $props();

    const defaultLanguage = getDefaultLanguage() as Locale;

    // Own copy, sent whole on save. `$state.snapshot` because Astro hydrates props as a
    // `$state` proxy, which `structuredClone` cannot copy.
    let faqs = $state<EditableFaq[]>($state.snapshot(untrack(() => initial)));
    const languageTabs = Object.entries(languagesList).map(([id, label]) => ({ id, label }));
    let language = $state<Locale>(defaultLanguage);

    // The FAQs whose answer is unfolded.
    const open = new SvelteSet<EditableFaq>();

    let errorMessage = $state("");
    let showError = $state(false);
    let showSaved = $state(false);

    let list: HTMLOListElement;

    function move(index: number, delta: number) {
        const target = index + delta;

        if (target < 0 || target >= faqs.length) return;

        [faqs[index], faqs[target]] = [faqs[target], faqs[index]];
    }

    function toggle(faq: EditableFaq) {
        if (!open.delete(faq)) {
            open.add(faq);
        }
    }

    async function add() {
        faqs.push({ question: {}, answer: {} });
        // The pushed object comes back as its `$state` proxy, the one the list renders.
        open.add(faqs[faqs.length - 1]);
        await tick();

        const input = list.querySelector<HTMLInputElement>("li:last-child input");

        input?.scrollIntoView({ behavior: "smooth", block: "center" });
        input?.focus({ preventScroll: true });
    }

    /**
     * Placeholder of a field: in a translation, the text it translates.
     * @param text The field's texts
     * @param key The i18n key of the generic placeholder
     */
    function placeholder(text: LocalizedText, key: string): string {
        return (language !== defaultLanguage && text[defaultLanguage]) || $t(key);
    }

    async function save() {
        const { data, error } = await actions.saveFaqs({ faqs: JSON.stringify(faqs) });

        if (error) {
            errorMessage =
                error.code === "INTERNAL_SERVER_ERROR" ? $t("system.error.unknown") : error.message;
            showError = true;

            throw error;
        }

        // New FAQs come back with their ids and dates.
        faqs = data;
        open.clear();
        showSaved = true;
    }
</script>

<div class="flex flex-col gap-4">
    <Title level={2} variant="headline">{$t("pages.admin.comm.faqs.title")}</Title>
    <p class="text-content text-base font-normal">{$t("pages.admin.comm.faqs.description")}</p>
</div>

<div class="space-y-2">
    <TabNavigation
        tabs={languageTabs}
        currentTab={language}
        onTabClick={(id) => (language = id as Locale)}
    />
    <p class="text-content text-sm">
        {$t("domain.language.defaultRequiredHelp", {
            language: languagesList[defaultLanguage],
        })}
    </p>
</div>

<section class="space-y-4">
    <p class="text-content text-sm">{$t("pages.admin.comm.faqs.editHelp")}</p>

    <!-- Laid out as the public accordion, with its texts editable in place. -->
    <ol bind:this={list} class="bg-grey space-y-4 rounded-3xl p-6">
        {#each faqs as faq, index (faq)}
            {@const isOpen = open.has(faq)}
            <li
                class={twJoin(
                    "focus-within:ring-primary overflow-hidden rounded-2xl border transition-all duration-300 focus-within:ring-2",
                    isOpen
                        ? "border-grey bg-purple-soft shadow-md"
                        : "border-grey bg-white shadow-sm",
                )}
            >
                <div class="flex items-center gap-3 px-6 py-4">
                    <input
                        class="text-body placeholder:text-content/60 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-bold focus:ring-0 lg:text-base"
                        aria-label={$t("pages.admin.comm.faqs.fields.question")}
                        placeholder={placeholder(
                            faq.question,
                            "pages.admin.comm.faqs.fields.questionPlaceholder",
                        )}
                        bind:value={
                            () => faq.question[language] ?? "",
                            (value) => (faq.question[language] = value)
                        }
                    />
                    <div class="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            class="text-secondary cursor-pointer p-1 disabled:opacity-30"
                            aria-label={$t("pages.admin.customize.footer.actions.moveUp")}
                            disabled={index === 0}
                            onclick={() => move(index, -1)}
                        >
                            <Chevron direction="up" width="20" height="20" />
                        </button>
                        <button
                            type="button"
                            class="text-secondary cursor-pointer p-1 disabled:opacity-30"
                            aria-label={$t("pages.admin.customize.footer.actions.moveDown")}
                            disabled={index === faqs.length - 1}
                            onclick={() => move(index, 1)}
                        >
                            <Chevron direction="down" width="20" height="20" />
                        </button>
                        <button
                            type="button"
                            class="text-tertiary cursor-pointer p-1"
                            aria-label={$t("common.remove")}
                            onclick={() => faqs.splice(index, 1)}
                        >
                            <Trash width="18" height="20" />
                        </button>
                        <button
                            type="button"
                            class="text-secondary ml-2 cursor-pointer p-1"
                            aria-label={$t("pages.admin.comm.faqs.fields.answer")}
                            aria-expanded={isOpen}
                            onclick={() => toggle(faq)}
                        >
                            <Chevron direction={isOpen ? "up" : "down"} width="16" height="16" />
                        </button>
                    </div>
                </div>
                {#if isOpen}
                    <div class="space-y-3 px-6 pb-6" transition:slide|local={{ duration: 300 }}>
                        <textarea
                            class="text-content placeholder:text-content/60 block field-sizing-content min-h-20 w-full resize-none border-0 bg-transparent p-0 text-xs leading-relaxed focus:ring-0 lg:text-sm"
                            aria-label={$t("pages.admin.comm.faqs.fields.answer")}
                            placeholder={placeholder(
                                faq.answer,
                                "pages.admin.comm.faqs.fields.answerPlaceholder",
                            )}
                            bind:value={
                                () => faq.answer[language] ?? "",
                                (value) => (faq.answer[language] = value)
                            }></textarea>
                        <p class="text-content text-xs">
                            {faq.dateUpdated
                                ? $t("pages.admin.comm.faqs.lastUpdated", {
                                      date: formatDate(faq.dateUpdated, $locale),
                                  })
                                : $t("pages.admin.comm.faqs.unsaved")}
                        </p>
                    </div>
                {/if}
            </li>
        {:else}
            <li class="text-content text-sm">{$t("pages.admin.comm.faqs.empty")}</li>
        {/each}
    </ol>

    <Button kind="secondary" size="sm" class="w-fit" onclick={add}>
        {$t("pages.admin.comm.faqs.add")}
    </Button>
</section>

<ActionableButton action={save} autoreset={2000} class="block w-fit">
    {$t("common.save")}
</ActionableButton>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>
<Toast floating variant="success" bind:showToast={showSaved}>
    {$t("pages.admin.comm.faqs.saved")}
</Toast>
