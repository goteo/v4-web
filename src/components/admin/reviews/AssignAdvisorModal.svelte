<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import {
        apiUsersGetCollection,
        apiUsersGetCollectionUrl,
        type User,
    } from "../../../openapi/client/index.ts";
    import { toCollectionItems } from "../../../utils/hydra";
    import Button from "../../library/buttons/Button.svelte";
    import DropdownMenu from "../../library/dropdown/DropdownMenu.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { DropdownOption } from "../../library/dropdown/dropdown.types";

    let {
        open = $bindable(false),
        title,
        currentReviewer,
        currentReviewerName,
        onAssign,
    }: {
        open: boolean;
        /** Heading of the modal, also the choice being made. */
        title: string;
        /** Reviewer IRI currently assigned, preselected in the dropdown. */
        currentReviewer?: string;
        /** Display name of the reviewer currently assigned. */
        currentReviewerName?: string;
        /** Called with the chosen advisor IRI and its display name. */
        onAssign: (iri: string, name: string) => void;
    } = $props();

    let candidates = $state<DropdownOption[]>([]);
    let searchValue = $state("");
    let selected = $state<DropdownOption[]>([]);

    let searchTimer: ReturnType<typeof setTimeout> | undefined;

    function toOption(user: User): DropdownOption {
        return {
            id: apiUsersGetCollectionUrl + "/" + user.id,
            label: user.displayName || user.email || user.handle || String(user.id),
            selected: false,
        };
    }

    async function searchUsers(term: string): Promise<void> {
        const { data } = await apiUsersGetCollection({
            baseUrl: "/api/relay",
            query: { q: term.trim(), itemsPerPage: 30 },
        });
        candidates = toCollectionItems<User>(data).map(toOption);
    }

    function handleSearch(value: string): void {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => searchUsers(value), 250);
    }

    $effect(() => {
        if (open) {
            searchValue = "";
            selected = currentReviewer
                ? [{ id: currentReviewer, label: currentReviewerName || currentReviewer, selected: true }]
                : [];
            searchUsers("");
        }
    });

    function confirm() {
        const option = selected[0];
        if (!option) return;

        open = false;
        onAssign(option.id, option.label);
    }
</script>

<Modal
    bind:open
    closeBtnClass="top-3 end-3 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-120 -translate-x-1/2 -translate-y-1/2 flex-col gap-6 overflow-visible rounded-3xl border-b-0 bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    headerClass="border-b-0 md:p-0 p-0"
    bodyClass="md:p-0 p-0 border-b-0 overflow-y-visible"
    footerClass="md:p-0 p-0 flex items-center justify-end gap-4 border-b-0"
>
    {#snippet header()}
        <Title level={2} variant="subsection" color="secondary">
            {title}
        </Title>
    {/snippet}

    <p class="text-content text-sm">
        {$t("pages.admin.reviews.projects.table.rows.details.modals.assignAdvisor.description")}
    </p>

    <DropdownMenu
        options={candidates}
        bind:selected
        bind:searchValue
        variant="basic"
        singleSelect
        hasSearch
        searchPlaceholder={$t("pages.admin.reviews.projects.table.rows.details.modals.assignAdvisor.searchPlaceholder")}
        onSearch={handleSearch}
        label={title}
        selectedFirst
    />

    {#snippet footer()}
        <Button kind="secondary" disabled={!selected.length} onclick={confirm} class="w-fit">
            {$t("common.continue")}
        </Button>
    {/snippet}
</Modal>