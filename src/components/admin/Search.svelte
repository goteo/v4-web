<script lang="ts">
    import SearchCategoryLabel from "./SearchCategoryLabel.svelte";
    import { t } from "../../i18n/store";
    import {
        apiProjectsGetCollection,
        apiTipjarsGetCollection,
        apiUsersGetCollection,
    } from "../../openapi/client";
    import { highlightMatch } from "../../utils/highlights";
    import SearchIcon from "../icons/actions/Search.svelte";
    import CloseIcon from "../icons/navigation/Close.svelte";
    import Spinner from "../icons/status/Spinner.svelte";

    import type { ProjectJsonld, TipjarJsonld, UserJsonld } from "../../openapi/client/index";

    type ResultItem =
        | { type: "project"; data: ProjectJsonld }
        | { type: "tipjar"; data: TipjarJsonld }
        | { type: "user"; data: UserJsonld };

    type CollectionResponse<T> = {
        totalItems: number;
        member: T[];
    };

    let {
        onSelectTarget,
        searchPlaceholder,
        onSelectProject,
        onSelectUser,
        resource,
    }: {
        onSelectTarget?: (accounting: string) => void;
        searchPlaceholder?: string;
        onSelectProject?: (project: ProjectJsonld) => void;
        onSelectUser?: (user: UserJsonld) => void;
        resource?: "projects" | "gateway_charges" | "users" | "project_reviews";
    } = $props();

    let query = $state("");
    let results = $state<ResultItem[]>([]);
    let totalItems = $state(0);
    let searched = $state(false);
    let isLoading = $state(false);

    let debounceTimeout: ReturnType<typeof setTimeout>;

    const showProjects = $derived(
        !resource ||
            resource === "gateway_charges" ||
            resource === "projects" ||
            resource === "project_reviews",
    );
    const showTipjars = $derived(!resource || resource === "gateway_charges");
    const showUsers = $derived(
        !resource ||
            resource === "gateway_charges" ||
            resource === "users" ||
            resource === "project_reviews",
    );

    async function fetchResults(text: string) {
        const trimmed = text.trim();
        if (trimmed.length < 4) {
            results = [];
            totalItems = 0;
            searched = false;
            return;
        }

        searched = true;
        isLoading = true;

        const fetches: Promise<any>[] = [];
        if (showProjects) {
            fetches.push(
                apiProjectsGetCollection({
                    query: { title: trimmed },
                    headers: { Accept: "application/ld+json" },
                }),
            );
        }
        if (showTipjars) {
            fetches.push(
                apiTipjarsGetCollection({
                    query: { name: trimmed },
                    headers: { Accept: "application/ld+json" },
                }),
            );
        }
        if (showUsers) {
            fetches.push(
                apiUsersGetCollection({
                    query: { q: trimmed },
                    headers: { Accept: "application/ld+json" },
                }),
            );
        }

        const responses = await Promise.all(fetches);

        let idx = 0;
        let projectItems: ProjectJsonld[] = [];
        let tipjarItems: TipjarJsonld[] = [];
        let userItems: UserJsonld[] = [];
        let total = 0;

        if (showProjects) {
            const raw = responses[idx++] as any;
            const data = raw.data as unknown as CollectionResponse<ProjectJsonld>;
            projectItems = data.member;
            total += data.totalItems;
        }
        if (showTipjars) {
            const raw = responses[idx++] as any;
            const data = raw.data as unknown as CollectionResponse<TipjarJsonld>;
            tipjarItems = data.member;
            total += data.totalItems;
        }
        if (showUsers) {
            const raw = responses[idx++] as any;
            const data = raw.data as unknown as CollectionResponse<UserJsonld>;
            userItems = data.member;
            total += data.totalItems;
        }

        totalItems = total;
        isLoading = false;

        results = [
            ...projectItems.map((p): ResultItem => ({ type: "project", data: p })),
            ...tipjarItems.map((t): ResultItem => ({ type: "tipjar", data: t })),
            ...userItems.map((u): ResultItem => ({ type: "user", data: u })),
        ];
    }

    function handleInput(text: string) {
        clearTimeout(debounceTimeout);

        if (!text.trim()) {
            results = [];
            totalItems = 0;
            searched = false;
            isLoading = false;
            return;
        }

        debounceTimeout = setTimeout(() => {
            fetchResults(text);
        }, 300);
    }
</script>

<section class="relative w-full">
    <div class="search-form flex flex-row items-center gap-4">
        <div class="relative flex w-full">
            <input
                type="text"
                id="search"
                bind:value={query}
                oninput={(e) =>
                    handleInput(e.target instanceof HTMLInputElement ? e.target.value : "")}
                placeholder={searchPlaceholder ??
                    $t("pages.admin.charges.filters.search.placeholder")}
                class="border-secondary w-full rounded-3xl border p-4 focus:ring-0"
                minlength="4"
            />
            {#if query}
                <button
                    type="button"
                    class="absolute top-1/2 right-3 h-6 w-6 -translate-y-1/2 rounded-full hover:bg-gray-300"
                    onclick={() => {
                        query = "";
                        results = [];
                        totalItems = 0;
                        searched = false;
                        isLoading = false;
                    }}
                >
                    <CloseIcon />
                </button>
            {:else}
                <div class="absolute top-1/2 right-3 h-8 w-8 -translate-y-1/2">
                    <SearchIcon width="32" height="32" />
                </div>
            {/if}
        </div>
    </div>

    {#if searched}
        <div
            class="absolute top-full z-10 my-8 max-h-96 w-full space-y-4 overflow-y-auto rounded-lg bg-gray-200 p-4"
        >
            {#if isLoading}
                <div class="flex justify-center py-6">
                    <Spinner />
                </div>
            {:else if results.length > 0}
                <p class="text-sm text-gray-500">
                    {@html $t(
                        "pages.admin.charges.filters.search.resultsFound",
                        {
                            totalItems: totalItems,
                            query: `<span class="font-bold">${query}</span>`,
                        },
                        { allowHTML: true },
                    )}
                </p>

                {#if results.some((r) => r.type === "project")}
                    <div>
                        <SearchCategoryLabel class="mb-2">
                            {$t("domain.charges.entityLabels.projects")}
                        </SearchCategoryLabel>
                        <div class="flex flex-col gap-2">
                            {#each results.filter((r) => r.type === "project") as item}
                                <button
                                    type="button"
                                    class="w-full cursor-pointer rounded-lg border bg-white p-4 text-left shadow transition hover:shadow-md"
                                    onclick={() => {
                                        onSelectProject?.(item.data);
                                        onSelectTarget?.(item.data.accounting ?? "");
                                        query = "";
                                        results = [];
                                        totalItems = 0;
                                        searched = false;
                                    }}
                                >
                                    <div class="text-lg font-semibold text-gray-800">
                                        {@html highlightMatch(item.data.title, query)}
                                    </div>
                                    {#if item.data.subtitle}
                                        <div class="mt-1 line-clamp-2 text-sm text-gray-600">
                                            {item.data.subtitle}
                                        </div>
                                    {:else if "description" in item.data && item.data.description}
                                        <div class="mt-1 line-clamp-2 text-sm text-gray-600">
                                            {item.data.description}
                                        </div>
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if results.some((r) => r.type === "tipjar")}
                    <div>
                        <SearchCategoryLabel class="mt-6 mb-2">
                            {$t("domain.charges.entityLabels.tipjars")}
                        </SearchCategoryLabel>
                        <div class="flex flex-col gap-2">
                            {#each results.filter((r) => r.type === "tipjar") as item}
                                <button
                                    type="button"
                                    class="w-full cursor-pointer rounded-lg border bg-white p-4 text-left shadow transition hover:shadow-md"
                                    onclick={() => {
                                        onSelectTarget?.(item.data.accounting ?? "");
                                        query = "";
                                        results = [];
                                        totalItems = 0;
                                        searched = false;
                                    }}
                                >
                                    <div class="text-lg font-semibold text-gray-800">
                                        {@html highlightMatch(
                                            item.data.name ?? "Sin nombre",
                                            query,
                                        )}
                                    </div>
                                    <div class="mt-1 text-sm text-gray-500 italic">
                                        {$t("domain.charges.entityLabels.tipjarId")}: {item.data.id}
                                    </div>
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if results.some((r) => r.type === "user")}
                    <div>
                        <SearchCategoryLabel class="mt-6 mb-2">
                            {$t("domain.charges.entityLabels.users")}
                        </SearchCategoryLabel>
                        <div class="flex flex-col gap-2">
                            {#each results.filter((r) => r.type === "user") as item}
                                <button
                                    type="button"
                                    class="w-full cursor-pointer rounded-lg border bg-white p-4 text-left shadow transition hover:shadow-md"
                                    onclick={() => {
                                        onSelectUser?.(item.data);
                                        onSelectTarget?.(item.data.accounting ?? "");
                                        query = "";
                                        results = [];
                                        totalItems = 0;
                                        searched = false;
                                    }}
                                >
                                    <div class="text-lg font-semibold text-gray-800">
                                        {@html highlightMatch(
                                            item.data.displayName ?? item.data.handle ?? "-",
                                            query,
                                        )}
                                    </div>
                                    <div class="mt-1 line-clamp-2 text-sm text-gray-500 italic">
                                        @{item.data.handle}
                                    </div>
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            {:else}
                <p class="text-sm text-gray-400">
                    {$t("pages.admin.charges.filters.search.noResults")}
                </p>
            {/if}
        </div>
    {/if}
</section>
