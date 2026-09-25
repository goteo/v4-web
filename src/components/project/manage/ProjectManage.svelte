<script lang="ts">
    import { TableBodyCell } from "flowbite-svelte";

    import ClaimStatusModal, { CLAIM_STATUSES, type ClaimStatus } from "./ClaimStatusModal.svelte";
    import { t } from "../../../i18n/store";
    import {
        apiProjectCollaborationCandidaciesGetCollection,
        apiProjectCollaborationCandidaciesIdPatch,
        apiProjectCollaborationsGetCollection,
        apiProjectRewardClaimsGetCollection,
        apiProjectRewardsGetCollection,
        apiUsersIdOrHandleGet,
    } from "../../../openapi/client";
    import { formatCurrency } from "../../../utils/currencies";
    import { extractId } from "../../../utils/extractId";
    import { toCollectionItems } from "../../../utils/hydra";
    import ExportCsv from "../../admin/ExportCsv.svelte";
    import UnitIcon from "../../icons/UnitIcon.svelte";
    import UserIcon from "../../icons/user/User.svelte";
    import BackButton from "../../library/buttons/BackButton.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import Reward from "../../library/cards/Reward.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import Search from "../../library/inputs/Search.svelte";
    import Toggle from "../../library/inputs/Toggle.svelte";
    import Carousel from "../../library/layout/Carousel.svelte";
    import DataTable from "../../library/tables/DataTable.svelte";
    import Tag from "../../library/tags/Tag.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type {
        Project,
        ProjectCollaboration,
        ProjectCollaborationCandidacy,
        ProjectReward,
        ProjectRewardClaim,
    } from "../../../openapi/client";

    let { project }: { project: Project } = $props();

    const ITEMS_PER_PAGE = 5;
    const relay = { baseUrl: "/api/relay", headers: { Accept: "application/ld+json" } };

    let rewards = $state<ProjectReward[]>([]);
    let collaborations = $state<ProjectCollaboration[]>([]);
    let userNames = $state<Record<string, string>>({});

    let claims = $state({ rows: [] as ProjectRewardClaim[], page: 1, total: 0, loading: true });
    let candidacies = $state({
        rows: [] as ProjectCollaborationCandidacy[],
        page: 1,
        total: 0,
        loading: true,
    });
    let search = $state("");
    let showError = $state(false);
    // ponytail: claims have no status field in the API yet; kept in memory until it exists
    let claimStatuses = $state<Record<number, ClaimStatus>>({});
    let editingClaim = $state<ProjectRewardClaim>();
    let statusModalOpen = $state(false);

    const rewardIris = $derived(rewards.map((r) => `/v4/project_rewards/${r.id}`));
    const collaborationIris = $derived(
        collaborations.map((c) => `/v4/project_collaborations/${c.id}`),
    );
    // ponytail: the API has no text filter for claims, so search only narrows the current page
    const visibleClaims = $derived(
        claims.rows.filter((c) =>
            (userNames[c.owner ?? ""] ?? "").toLowerCase().includes(search.trim().toLowerCase()),
        ),
    );

    function totalOf(collection: unknown): number {
        const total = (collection as Record<string, unknown>)?.totalItems;
        return typeof total === "number" ? total : toCollectionItems(collection).length;
    }

    async function loadUserNames(iris: (string | undefined)[]) {
        const missing = [...new Set(iris)].filter((iri): iri is string => !!iri && !userNames[iri]);
        await Promise.all(
            missing.map(async (iri) => {
                const { data } = await apiUsersIdOrHandleGet({
                    path: { idOrHandle: extractId(iri)! },
                });
                userNames[iri] = data?.displayName ?? data?.handle ?? "—";
            }),
        );
    }

    async function loadClaims(page: number) {
        claims.loading = true;
        const { data } = await apiProjectRewardClaimsGetCollection({
            ...relay,
            query: { "reward[]": rewardIris, page, itemsPerPage: ITEMS_PER_PAGE },
        });
        const rows = toCollectionItems<ProjectRewardClaim>(data);
        await loadUserNames(rows.map((r) => r.owner));
        claims = { rows, page, total: totalOf(data), loading: false };
    }

    async function loadCandidacies(page: number) {
        candidacies.loading = true;
        const { data } = await apiProjectCollaborationCandidaciesGetCollection({
            ...relay,
            query: { "collaboration[]": collaborationIris, page, itemsPerPage: ITEMS_PER_PAGE },
        });
        const rows = toCollectionItems<ProjectCollaborationCandidacy>(data);
        await loadUserNames(rows.map((r) => r.user));
        candidacies = { rows, page, total: totalOf(data), loading: false };
    }

    async function setApproved(candidacy: ProjectCollaborationCandidacy, approved: boolean) {
        const previous = candidacy.status;
        candidacy.status = approved ? "approved" : "in_review";

        const { error } = await apiProjectCollaborationCandidaciesIdPatch({
            baseUrl: "/api/relay",
            path: { id: String(candidacy.id) },
            body: { ...candidacy },
        });

        if (error) {
            candidacy.status = previous;
            showError = true;
        }
    }

    $effect(() => {
        const query = { project: String(project.id), "order[money.amount]": "asc" as const };

        apiProjectRewardsGetCollection({ query }).then(({ data }) => {
            rewards = data ?? [];
            if (rewards.length) loadClaims(1);
            else claims.loading = false;
        });

        apiProjectCollaborationsGetCollection({ query: { project: String(project.id) } }).then(
            ({ data }) => {
                collaborations = data ?? [];
                if (collaborations.length) loadCandidacies(1);
                else candidacies.loading = false;
            },
        );
    });

    const rewardByIri = $derived(
        Object.fromEntries(rewards.map((r) => [`/v4/project_rewards/${r.id}`, r])),
    );
    const collaborationByIri = $derived(
        Object.fromEntries(collaborations.map((c) => [`/v4/project_collaborations/${c.id}`, c])),
    );

    const claimHeaders = [
        { key: "pages.project.manage.claims.headers.user" },
        { key: "pages.project.manage.claims.headers.address", class: "w-1/3" },
        { key: "pages.project.manage.claims.headers.reward" },
        { key: "pages.project.manage.claims.headers.status", class: "w-36" },
        { key: "pages.project.manage.claims.headers.action", class: "w-52" },
    ];

    const candidacyHeaders = [
        { key: "pages.project.manage.collaborations.headers.user" },
        { key: "pages.project.manage.collaborations.headers.type" },
        { key: "pages.project.manage.collaborations.headers.assign", class: "w-36" },
    ];

    const firstCell = "border-variant1 rounded-l-md border-t border-b border-l p-4";
    const cell = "border-variant1 border-t border-b p-4";
    const lastCell = "border-variant1 rounded-r-md border-t border-r border-b p-4";
</script>

<div class="wrapper flex flex-col gap-16 pb-20">
    <section class="flex flex-col gap-10">
        <BackButton />
        <div class="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <div class="flex max-w-2xl flex-col gap-4">
                <Title level={1} variant="headline" weight="bold">{project.title}</Title>
                <p class="text-content">{$t("pages.project.manage.subtitle")}</p>
            </div>
            <Button kind="secondary" href={`/project/${project.slug ?? project.id}/edit`}>
                {$t("pages.project.manage.editProject")}
            </Button>
        </div>
    </section>

    {#if rewards.length}
        <section class="flex flex-col gap-6">
            <Title level={2} variant="subsection" weight="bold">
                {$t("pages.project.manage.rewards.title")}
            </Title>
            <Carousel itemsPerGroup={1} gap={24} showDots={false}>
                {#each rewards as reward (reward.id)}
                    <Reward
                        {reward}
                        disabled={reward.isFinite && reward.unitsAvailable === 0}
                        class="shrink-0"
                    >
                        <div
                            class="text-secondary flex items-center justify-between gap-2 text-sm font-bold"
                        >
                            <span class="flex items-center gap-2">
                                <UserIcon />
                                {$t("domain.project.reward.donators", {
                                    donators: reward.unitsClaimed ?? 0,
                                })}
                            </span>
                            <span class="flex items-center gap-2">
                                <UnitIcon />
                                {#if !reward.isFinite}
                                    {$t("domain.project.reward.isInfinite")}
                                {:else if reward.unitsAvailable}
                                    {$t("domain.project.reward.unitsAvailable", {
                                        units: reward.unitsAvailable,
                                    })}
                                {:else}
                                    {$t("domain.project.reward.noUnits")}
                                {/if}
                            </span>
                        </div>
                    </Reward>
                {/each}
            </Carousel>
        </section>
    {/if}

    <section class="flex flex-col gap-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Title level={2} variant="subsection" weight="bold">
                {$t("pages.project.manage.claims.title")}
            </Title>
            <div class="flex flex-col gap-6 md:flex-row md:items-center">
                <Search
                    bind:value={search}
                    placeholder={$t("pages.project.manage.claims.search")}
                    class="bg-white md:w-94"
                />
                {#if rewardIris.length}
                    <ExportCsv
                        endpoint="/v4/project_reward_claims"
                        queryParams={{ "reward[]": rewardIris }}
                        filenamePrefix="reward_claims"
                        size="md"
                        totalItems={claims.total}
                    />
                {/if}
            </div>
        </div>
        <DataTable
            headers={claimHeaders}
            rows={visibleClaims}
            isLoading={claims.loading}
            emptyMessage="pages.project.manage.claims.noData"
            currentPage={claims.page}
            totalItems={claims.total}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={loadClaims}
        >
            {#snippet children(claim: ProjectRewardClaim)}
                {@const reward = rewardByIri[claim.reward]}
                <TableBodyCell class={firstCell}>
                    <span class="block truncate">{userNames[claim.owner ?? ""] ?? "—"}</span>
                </TableBodyCell>
                <!-- ponytail: API has no shipping address on claims yet -->
                <TableBodyCell class={cell}>—</TableBodyCell>
                <TableBodyCell class={cell}>
                    {#if reward}
                        <p>{formatCurrency(reward.money.amount, reward.money.currency)}</p>
                        <p class="truncate text-xs font-medium opacity-64">{reward.title}</p>
                    {/if}
                </TableBodyCell>
                <TableBodyCell class="{cell} text-center">
                    {@const status = claimStatuses[claim.id!]}
                    {#if status}
                        <Tag variant={CLAIM_STATUSES[status]} class="mx-auto">
                            {$t(`pages.project.manage.claims.statuses.${status}`)}
                        </Tag>
                    {:else}
                        —
                    {/if}
                </TableBodyCell>
                <TableBodyCell class="{lastCell} text-center">
                    <Button
                        size="sm"
                        kind="ghost"
                        onclick={() => {
                            editingClaim = claim;
                            statusModalOpen = true;
                        }}
                    >
                        {$t("pages.project.manage.claims.changeStatus")}
                    </Button>
                </TableBodyCell>
            {/snippet}
        </DataTable>
    </section>

    <section class="flex flex-col gap-6">
        <Title level={2} variant="subsection" weight="bold">
            {$t("pages.project.manage.collaborations.title")}
        </Title>
        <DataTable
            headers={candidacyHeaders}
            rows={candidacies.rows}
            isLoading={candidacies.loading}
            emptyMessage="pages.project.manage.collaborations.noData"
            currentPage={candidacies.page}
            totalItems={candidacies.total}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={loadCandidacies}
        >
            {#snippet children(candidacy: ProjectCollaborationCandidacy)}
                <TableBodyCell class={firstCell}>
                    <span class="block truncate">{userNames[candidacy.user] ?? "—"}</span>
                </TableBodyCell>
                <TableBodyCell class={cell}>
                    <span class="block truncate">
                        {collaborationByIri[candidacy.collaboration]?.title ?? "—"}
                    </span>
                </TableBodyCell>
                <TableBodyCell class={lastCell}>
                    <Toggle
                        value={candidacy.status === "approved"}
                        onChange={(approved) => setApproved(candidacy, approved)}
                        aria-label={$t("pages.project.manage.collaborations.headers.assign")}
                        btnClass="mx-auto"
                    />
                </TableBodyCell>
            {/snippet}
        </DataTable>
    </section>

    <ClaimStatusModal
        bind:open={statusModalOpen}
        status={editingClaim && claimStatuses[editingClaim.id!]}
        onSave={(status) => (claimStatuses[editingClaim!.id!] = status)}
    />

    <Toast bind:showToast={showError} variant="error">
        {$t("pages.project.manage.collaborations.error")}
    </Toast>
</div>
