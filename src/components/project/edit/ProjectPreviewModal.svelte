<!--
    Renders the public project view (`SingleProject`) with the current draft data,
    so the owner can review the project before publishing it.

    The draft only carries the project itself; the extra datasets the public view
    needs (accounting, owner, supports and balance points) are fetched here, the
    same way `pages/[...locale]/project/[idOrSlug]/index.astro` does server-side.
-->
<script lang="ts">
    import { Modal } from "flowbite-svelte";
    import { untrack } from "svelte";

    import { t } from "../../../i18n/store";
    import {
        apiAccountingBalancePointsGetCollection,
        apiAccountingsIdGet,
        apiProjectSupportsGetCollection,
        apiUsersIdOrHandleGet,
    } from "../../../openapi/client";
    import { extractId } from "../../../utils/extractId";
    import Loader from "../../library/feedback/Loader.svelte";
    import SingleProject from "../SingleProject.svelte";

    import type {
        Accounting,
        AccountingBalancePoint,
        Project,
        User,
    } from "../../../openapi/client";

    interface Props {
        open?: boolean;
        project: Project;
    }

    let { open = $bindable(false), project }: Props = $props();

    interface PreviewData {
        owner: User;
        accounting: Accounting;
        totalSupports: number;
        balancePoints: AccountingBalancePoint[];
    }

    let preview = $state<PreviewData | null>(null);
    let loading = $state(false);
    let failed = $state(false);

    // Re-fetch every time the modal is opened: `project` changes on every keystroke,
    // so it is read untracked to keep the effect subscribed to `open` only.
    $effect(() => {
        if (!open) {
            return;
        }

        void loadPreview(untrack(() => project));
    });

    async function loadPreview(snapshot: Project) {
        loading = true;
        preview = null;
        failed = false;

        try {
            const ownerId = extractId(snapshot.owner);
            const accountingId = extractId(snapshot.accounting);

            const [ownerResult, accountingResult] = await Promise.all([
                ownerId ? apiUsersIdOrHandleGet({ path: { idOrHandle: ownerId } }) : undefined,
                accountingId ? apiAccountingsIdGet({ path: { id: accountingId } }) : undefined,
            ]);

            const owner = ownerResult?.data;
            const accounting = accountingResult?.data;

            if (!owner || !accounting) {
                failed = true;
                return;
            }

            const [supportsResult, balancePoints] = await Promise.all([
                snapshot.id
                    ? apiProjectSupportsGetCollection({
                          query: { project: String(snapshot.id) },
                          headers: { Accept: "application/ld+json" },
                      })
                    : undefined,
                loadBalancePoints(snapshot),
            ]);

            const totalSupports =
                (supportsResult?.data as unknown as { totalItems?: number } | undefined)
                    ?.totalItems ?? 0;

            preview = { owner, accounting, totalSupports, balancePoints: balancePoints ?? [] };
        } catch (error) {
            console.error(error);
            failed = true;
        } finally {
            loading = false;
        }
    }

    async function loadBalancePoints(
        snapshot: Project,
    ): Promise<AccountingBalancePoint[] | undefined> {
        const release = snapshot.calendar?.release;
        const deadlineKey = snapshot.deadline as keyof Project["calendar"] | undefined;
        const deadlineValue = deadlineKey ? snapshot.calendar?.[deadlineKey] : undefined;

        if (!snapshot.accounting || !release || !deadlineValue) {
            return undefined;
        }

        const deadline = new Date(deadlineValue);
        deadline.setDate(deadline.getDate() + 1);

        const { data } = await apiAccountingBalancePointsGetCollection({
            query: {
                accounting: snapshot.accounting,
                start: release,
                end: deadline.toISOString(),
                aggregate: true,
            },
        });

        return data;
    }
</script>

<Modal
    bind:open
    closeBtnClass="top-7 end-7 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent z-[110]"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-6xl -translate-x-1/2 -translate-y-1/2 divide-y-0 rounded-3xl bg-white shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-auto z-[105]"
    backdropClass="fixed inset-0 z-[100] bg-black/50"
    bodyClass="p-0"
>
    {#if open}
        <div class="flex max-h-[85vh] flex-col">
            <div class="border-b border-gray-100 px-6 py-4 pe-16">
                <span class="text-content text-base font-bold">{$t("common.preview")}</span>
            </div>

            <div class="overflow-y-auto">
                {#if loading}
                    <div class="flex justify-center p-20">
                        <Loader />
                    </div>
                {:else if preview}
                    <SingleProject
                        {project}
                        owner={preview.owner}
                        accounting={preview.accounting}
                        totalSupports={preview.totalSupports}
                        balancePoints={preview.balancePoints}
                    />
                {:else if failed}
                    <div class="text-content p-20 text-center">
                        {$t("system.error.unknown")}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</Modal>
