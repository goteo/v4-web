<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import {
        apiUsersGetCollection,
        apiUsersGetCollectionUrl,
        type User,
    } from "../../../openapi/client/index.ts";
    import { debounce } from "../../../utils/debounce.ts";
    import { toCollectionItems } from "../../../utils/hydra";
    import Button from "../../library/buttons/Button.svelte";
    import DropdownMenu from "../../library/dropdown/DropdownMenu.svelte";
    import UserResultRow from "../../library/dropdown/UserResultRow.svelte";
    import Loader from "../../library/feedback/Loader.svelte";
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
        onAssign: (iri: string, name: string) => Promise<void> | void;
    } = $props();

    let candidates = $state<DropdownOption[]>([]);
    let searchValue = $state("");
    let selected = $state<DropdownOption[]>([]);
    let searching = $state(false);
    let assigning = $state(false);
    /** Discards the response of a search that a newer one has already replaced. */
    let searchSeq = 0;

    function toOption(user: User): DropdownOption {
        return {
            id: apiUsersGetCollectionUrl + "/" + user.id,
            label: user.displayName || user.email || user.handle || String(user.id),
            selected: false,
            raw: user,
        };
    }

    async function fetchCandidates(term: string): Promise<void> {
        const seq = ++searchSeq;
        searching = true;

        try {
            const { data, error } = await apiUsersGetCollection({
                baseUrl: "/api/relay",
                // Only admins can carry a review out, so the search never offers
                // users who could not be assigned (see `isConsultant`).
                query: { q: term, roles: "ROLE_ADMIN", itemsPerPage: 30 },
            });

            if (seq !== searchSeq) return;

            candidates = error ? [] : toCollectionItems<User>(data).map(toOption);
        } catch (searchError) {
            if (seq === searchSeq) candidates = [];
            console.error(searchError);
        } finally {
            if (seq === searchSeq) searching = false;
        }
    }

    const searchUsers = debounce((term: string) => {
        void fetchCandidates(term);
    }, 250);

    function clearSearch(): void {
        searchUsers.cancel();
        searchSeq++;
        searching = false;
        candidates = [];
    }

    function handleSearch(value: string): void {
        const trimmed = value.trim();
        if (trimmed.length < 2) {
            clearSearch();
            return;
        }

        searchUsers(trimmed);
    }

    /** Runs the search immediately, when the advisor presses the magnifier or Enter. */
    function submitSearch(): void {
        const trimmed = searchValue.trim();
        searchUsers.cancel();

        if (trimmed.length < 2) {
            clearSearch();
            return;
        }

        void fetchCandidates(trimmed);
    }

    let wasOpen = false;

    $effect(() => {
        // Only reset on the transition into open, so changing `assignState` while
        // the assignment is in flight does not cut the loading state short.
        if (open && !wasOpen) {
            searchValue = "";
            assigning = false;
            clearSearch();
            selected = currentReviewer
                ? [
                      {
                          id: currentReviewer,
                          label: currentReviewerName || currentReviewer,
                          selected: true,
                      },
                  ]
                : [];
        }

        wasOpen = open;
    });

    async function confirm(): Promise<void> {
        const option = selected[0];
        if (!option || assigning) return;

        assigning = true;

        try {
            await onAssign(option.id, option.label);
            open = false;
            // Keep the loader through the outro; the effect resets it on reopen.
        } catch (assignError) {
            console.error(assignError);
            assigning = false;
        }
    }
</script>

<Modal
    bind:open
    dismissable={!assigning}
    outsideclose={!assigning}
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

    <div
        class="flex flex-col gap-4"
        class:pointer-events-none={assigning}
        class:opacity-50={assigning}
        aria-busy={assigning}
    >
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
            searchPlaceholder={$t(
                "pages.admin.reviews.projects.table.rows.details.modals.assignAdvisor.searchPlaceholder",
            )}
            onSearch={handleSearch}
            onSearchSubmit={submitSearch}
            searchLoading={searching}
            label={title}
            selectedFirst
        >
            {#snippet row(option)}
                {#if option.raw}
                    <UserResultRow user={option.raw as User} />
                {/if}
            {/snippet}
        </DropdownMenu>
    </div>

    {#snippet footer()}
        {#if assigning}
            <div class="flex w-full justify-center py-2">
                <Loader />
            </div>
        {:else}
            <Button kind="secondary" disabled={!selected.length} onclick={confirm} class="w-fit">
                {$t("common.continue")}
            </Button>
        {/if}
    {/snippet}
</Modal>
