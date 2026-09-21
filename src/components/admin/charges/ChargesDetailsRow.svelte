<script lang="ts">
    import {
        Modal,
        Table,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell,
    } from "flowbite-svelte";

    import { t } from "../../../i18n/store.ts";
    import Copy from "../../icons/actions/Copy.svelte";
    import DetailsRow, { type DetailsField } from "../DetailsRow.svelte";
    import Tooltip from "../Tooltip.svelte";
    import { chargeStatusStyles } from "./ChargesTable.svelte";
    import { formatCurrency } from "../../../utils/currencies.ts";
    import { extractId } from "../../../utils/extractId.ts";

    import type { ExtendedCharge } from "./ChargesTable.svelte";
    import type { Link, Tracking } from "../../../openapi/client/index.ts";

    let { charge }: { charge: ExtendedCharge } = $props();

    let trackingModal = $state(false);
    let linksModal = $state(false);

    function getDate(chargeDate: string | null | undefined): {
        date: string;
        time: string;
        fulltime: string;
    } {
        if (!chargeDate) {
            return { date: "—", time: "—", fulltime: "—" };
        }

        const d = new Date(chargeDate);
        if (isNaN(d.getTime())) {
            return { date: "—", time: "—", fulltime: "—" };
        }

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hour = String(d.getHours()).padStart(2, "0");
        const minute = String(d.getMinutes()).padStart(2, "0");
        const second = String(d.getSeconds()).padStart(2, "0");

        return {
            date: `${year}-${month}-${day}`,
            time: `${hour}:${minute}:${second}`,
            fulltime: d.toISOString(),
        };
    }

    const dataTimeCreated = $derived(getDate(charge.dateCreated));
    const dataTimeUpdated = $derived(getDate(charge.dateUpdated));
    const trackingCodes = $derived(charge.trackingCodes ?? []);
    const platformLinks = $derived(charge.platformLinks ?? []);
    const statusBadgeClasses = $derived(
        chargeStatusStyles[charge.status ?? ""] ?? chargeStatusStyles.default,
    );

    const fields: DetailsField[] = $derived([
        {
            label: $t("pages.admin.charges.details.operationTime"),
            value: dataTimeCreated.time,
        },
        {
            label: $t("pages.admin.charges.details.trackingCodes.title"),
            value: trackingCodes[0]?.value ?? "—",
        },
        {
            label: $t("pages.admin.charges.details.platformLinks.title"),
            value: platformLinks[0]?.url ?? "—",
        },
        {
            label: $t("pages.admin.charges.details.estimatedFee"),
            value: "—",
        },
        {
            label: $t("pages.admin.charges.details.concept"),
            value: charge.title ?? "—",
        },
    ]);

    function cleanCloseButton() {
        const closeBtn = document.querySelector('button[aria-label="Close"]');
        if (closeBtn) {
            closeBtn.removeAttribute("aria-label");
            closeBtn.querySelectorAll("span").forEach((el) => {
                if (el.textContent?.trim() === "Close") el.remove();
            });
        }
    }

    $effect(() => {
        if (trackingModal || linksModal) {
            document.body.classList.add("no-scroll");
            cleanCloseButton();
        } else {
            document.body.classList.remove("no-scroll");
        }
    });

    function openTrackingModal() {
        trackingModal = true;
    }

    function openLinksModal() {
        linksModal = true;
    }
</script>

<DetailsRow {fields} columns={4}>
    {#snippet children()}
        <div
            class="text-content grid grid-cols-1 gap-x-10 gap-y-8 text-base leading-5 sm:grid-cols-2 xl:grid-cols-4"
        >
            <div class="flex min-w-0 flex-col gap-2">
                <p class="font-bold">{$t("pages.admin.charges.details.status")}</p>
                <span class="w-fit rounded-full px-3 py-1 text-xs font-medium {statusBadgeClasses}">
                    {$t(`domain.charges.status.${charge.status}`)}
                </span>
            </div>
            <div class="flex min-w-0 flex-col gap-2">
                <p class="font-bold">{$t("pages.admin.charges.details.operationTime")}</p>
                <span title={dataTimeCreated.fulltime}>{dataTimeCreated.time}</span>
            </div>
            <div class="flex min-w-0 flex-col gap-2">
                <p class="font-bold">{$t("pages.admin.charges.details.trackingCodes.title")}</p>
                <button
                    class="text-secondary flex cursor-pointer items-start truncate whitespace-nowrap underline"
                    title={trackingCodes.map((tc: Tracking) => tc.value).join(", ")}
                    onclick={openTrackingModal}
                >
                    <span class="truncate">{trackingCodes[0]?.value ?? "—"}</span>
                    <span> ({trackingCodes.length})</span>
                </button>

                <Modal
                    bind:open={trackingModal}
                    closeBtnClass="top-7 end-7 bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
                    class="backdrop:bg-overlay left-1/2! max-w-200 p-4 backdrop:backdrop-blur-[5px]"
                    title={$t("pages.admin.charges.details.trackingCodes.title")}
                    headerClass="py-2"
                >
                    <Table class="w-full table-fixed border-separate border-spacing-y-2">
                        <TableHead>
                            <TableHeadCell
                                class="bg-tertiary rounded-tl-lg rounded-bl-lg py-4 text-base whitespace-nowrap text-white"
                            >
                                {$t("pages.admin.charges.details.trackingCodes.headers.title")}
                            </TableHeadCell>
                            <TableHeadCell
                                class="bg-tertiary rounded-tr-lg rounded-br-lg py-4 text-base whitespace-nowrap text-white"
                            >
                                {$t(
                                    "pages.admin.charges.details.trackingCodes.headers.trackingCode",
                                )}
                            </TableHeadCell>
                        </TableHead>
                        <TableBody class="text-base">
                            {#each trackingCodes as item (item.value)}
                                <TableBodyRow class=" bg-white">
                                    <TableBodyCell
                                        class="border-variant1 rounded-l-md border-t border-b border-l"
                                    >
                                        {item.title}
                                    </TableBodyCell>
                                    <TableBodyCell
                                        class="border-variant1 rounded-r-md border-t border-r border-b align-top"
                                    >
                                        <div class="flex w-full items-center gap-4">
                                            <div
                                                class="w-full leading-snug break-all whitespace-normal"
                                                style="word-break: break-word;"
                                            >
                                                {item.value}
                                            </div>
                                            <Tooltip
                                                text={$t("common.tooltip.copied")}
                                                tooltipClass="bg-secondary -translate-x-[90%]"
                                                className="size-5 cursor-copy shrink-0"
                                            >
                                                <button
                                                    id={`copy-${item.value}`}
                                                    type="button"
                                                    onclick={() =>
                                                        navigator.clipboard.writeText(
                                                            item.value ?? "",
                                                        )}
                                                >
                                                    <Copy />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </TableBodyCell>
                                </TableBodyRow>
                            {/each}
                        </TableBody>
                    </Table>
                </Modal>
            </div>

            <div class="flex min-w-0 flex-col gap-2">
                <p class="font-bold">{$t("pages.admin.charges.details.platformLinks.title")}</p>

                {#if platformLinks.length > 0}
                    <button
                        class="text-secondary flex cursor-pointer items-start truncate whitespace-nowrap underline"
                        title={platformLinks
                            .map((pl: Link) => pl.url ?? "")
                            .filter(Boolean)
                            .join(", ")}
                        onclick={openLinksModal}
                    >
                        <span class="truncate">
                            {platformLinks.find((pl: Link) => pl.rel === "payment")?.url ??
                                platformLinks[0]?.url ??
                                "—"}
                        </span>
                        <span> ({platformLinks.length})</span>
                    </button>
                {:else}
                    <p class="truncate">—</p>
                {/if}

                <Modal
                    bind:open={linksModal}
                    closeBtnClass="top-7 end-7 bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
                    class="backdrop:bg-overlay left-1/2! max-w-200 p-4 backdrop:backdrop-blur-[5px]"
                    title={$t("pages.admin.charges.details.platformLinks.title")}
                    headerClass="py-2"
                >
                    <Table class="w-full table-fixed border-separate border-spacing-y-2">
                        <TableHead>
                            <TableHeadCell
                                class="bg-tertiary rounded-tl-lg rounded-bl-lg py-4 text-base whitespace-nowrap text-white"
                            >
                                {$t("pages.admin.charges.details.platformLinks.headers.type")}
                            </TableHeadCell>
                            <TableHeadCell
                                class="bg-tertiary border-t-lg border-b-lg py-4 text-base whitespace-nowrap text-white"
                            >
                                {$t("pages.admin.charges.details.platformLinks.headers.rel")}
                            </TableHeadCell>
                            <TableHeadCell
                                class="bg-tertiary rounded-tr-lg rounded-br-lg py-4 text-base whitespace-nowrap text-white"
                            >
                                {$t("pages.admin.charges.details.platformLinks.headers.href")}
                            </TableHeadCell>
                        </TableHead>
                        <TableBody class="text-base">
                            {#each platformLinks as item (item.url)}
                                <TableBodyRow class=" bg-white">
                                    <TableBodyCell class="border-variant1 border-t border-b">
                                        {item.type}
                                    </TableBodyCell>
                                    <TableBodyCell class="border-variant1 border-t border-b">
                                        {item.rel}
                                    </TableBodyCell>
                                    <TableBodyCell
                                        class="border-variant1 rounded-r-md border-t border-r border-b align-top"
                                    >
                                        <div class="flex w-full items-center gap-4">
                                            <div
                                                class="w-full cursor-pointer leading-snug break-all whitespace-normal"
                                                style="word-break: break-word; text-decoration-line: underline;"
                                            >
                                                <a
                                                    href={item.url}
                                                    class=" text-secondary"
                                                    target="_blank"
                                                >
                                                    {item.url}
                                                </a>
                                            </div>
                                            <Tooltip
                                                text={$t("common.tooltip.copied")}
                                                tooltipClass="bg-secondary"
                                                className="size-5 cursor-copy shrink-0"
                                            >
                                                <button
                                                    id={`copy-${item.url}`}
                                                    type="button"
                                                    onclick={() =>
                                                        navigator.clipboard.writeText(
                                                            item.url ?? "",
                                                        )}
                                                >
                                                    <Copy />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </TableBodyCell>
                                </TableBodyRow>
                            {/each}
                        </TableBody>
                    </Table>
                </Modal>
            </div>

            <div class="flex min-w-0 flex-col gap-2">
                <p class="font-bold">{$t("pages.admin.charges.details.estimatedFee")}</p>
                <p>{formatCurrency(0)}</p>
            </div>
            <div class="flex min-w-0 flex-col gap-2">
                <p class="font-bold">{$t("pages.admin.charges.details.concept")}</p>
                <p class="truncate" title={charge.title}>
                    {charge.title ? charge.title : "—"}
                </p>
            </div>
            <div class="flex min-w-0 flex-col gap-2">
                <p class="font-bold">{$t("pages.admin.charges.details.selfId")}</p>
                <p class="truncate" title={String(charge.id)}>
                    {charge.id}
                </p>
            </div>
            <div class="flex min-w-0 flex-col gap-2">
                <p class="font-bold">{$t("pages.admin.charges.details.checkout")}</p>
                <p class="truncate" title={charge.checkout}>
                    {extractId(charge.checkout)}
                </p>
            </div>
        </div>
    {/snippet}
</DetailsRow>
