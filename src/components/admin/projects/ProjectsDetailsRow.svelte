<script lang="ts">
    // Re-enable with the annotations button below.
    // import Comments from "../../../components/icons/Comments.svelte";
    import { t, locale } from "../../../i18n/store";
    import { formatDate } from "../../../utils/dates";
    import {
        PROJECT_STATUSES,
        isPublicStatus,
        projectStatusLabelKey,
    } from "../../../utils/projectStatus";
    import Select from "../../library/inputs/Select.svelte";
    import DetailsRow, { type DetailsField } from "../DetailsRow.svelte";

    import type { ProjectRow } from "./ProjectsTable.svelte";
    import type { ProjectStatus } from "../../../utils/projectStatus";

    interface Props {
        project: ProjectRow;
        onOpenAnnotationsModal: () => void;
        onStatusChange: (projectId: number, status: ProjectStatus) => Promise<boolean>;
        userEmail?: string;
    }

    let { project, onOpenAnnotationsModal, onStatusChange, userEmail }: Props = $props();

    // Bound to the select; reset to the project's status when the API rejects the change.
    let selectedStatus = $derived<string>(project.status);
    let isSavingStatus = $state(false);

    async function handleStatusSelect(status: string) {
        if (status === project.status) return;
        isSavingStatus = true;
        const ok = await onStatusChange(project.id, status as ProjectStatus);
        isSavingStatus = false;
        if (!ok) selectedStatus = project.status;
    }

    const fields: DetailsField[] = $derived([
        {
            label: $t("pages.admin.projects.table.rows.details.datePublished"),
            value:
                project.datePublished !== "—"
                    ? formatDate(new Date(project.datePublished), $locale)
                    : "—",
        },
        {
            label: $t("pages.admin.projects.table.rows.details.dateEnd1"),
            value: project.dateEnd1 !== "—" ? formatDate(new Date(project.dateEnd1), $locale) : "—",
        },
        {
            label: $t("pages.admin.projects.table.rows.details.dateEnd2"),
            value: project.dateEnd2 !== "—" ? formatDate(new Date(project.dateEnd2), $locale) : "—",
        },
        {
            label: $t("pages.admin.projects.table.rows.details.minOptim"),
            value: project.minOptim,
        },
        {
            label: $t("pages.admin.projects.table.rows.details.email"),
            value: userEmail ?? "—",
        },
        {
            label: $t("pages.admin.projects.table.rows.details.phone"),
            value: "—",
        },
        {
            label: $t("pages.admin.projects.table.rows.details.remaining"),
            value: project.remaining,
        },
    ]);

    const actionClass =
        "border-secondary text-secondary cursor-pointer rounded-full border bg-white px-5 py-2 text-sm";
</script>

<DetailsRow {fields} columns={4}>
    {#snippet actions()}
        <div class="flex flex-row flex-wrap items-center gap-3">
            <Select
                class="py-2 text-sm"
                labelText={$t("pages.admin.projects.table.rows.details.status")}
                bind:value={selectedStatus}
                disabled={isSavingStatus}
                onChange={handleStatusSelect}
            >
                {#each PROJECT_STATUSES as status (status)}
                    <option value={status}>{$t(projectStatusLabelKey(status))}</option>
                {/each}
            </Select>
            {#if project.promoterHandle}
                <a
                    class={actionClass}
                    href={`/${$locale}/admin/users?handle=${encodeURIComponent(project.promoterHandle)}`}
                >
                    {$t("pages.admin.projects.table.rows.details.btns.promoter")}
                </a>
            {/if}
            {#if project.accounting}
                <a
                    class={actionClass}
                    href={`/${$locale}/admin/charges?target=${encodeURIComponent(project.accounting)}`}
                >
                    {$t("pages.admin.projects.table.rows.details.btns.contributions")}
                </a>
            {/if}
            <a class={actionClass} href={`/${$locale}/project/${project.slug}/edit`}>
                {$t("pages.admin.projects.table.rows.details.btns.edit")}
            </a>
            {#if isPublicStatus(project.status)}
                <a class={actionClass} href={`/${$locale}/project/${project.slug}`}>
                    {$t("pages.admin.projects.table.rows.details.btns.publicPage")}
                </a>
            {/if}
        </div>
    {/snippet}
    {#snippet footer()}
        <div
            class="flex flex-col gap-6 text-base leading-5 md:flex-row md:items-center md:justify-between"
        >
            <div class="text-content min-h-5 text-sm"></div>
            <div class="flex flex-row flex-wrap items-center justify-start gap-8 md:justify-end">
                <!-- GOTEO-OC-DONATION-CERTIFICATE: "Certificados" button is exclusive to the
                     donation-certificate feature of Goteo under Fundación Platoniq, hidden in
                     the open-core. Re-enable when a feature toggle exists. Do not delete.
                <button
                    class="text-secondary cursor-pointer border-0 bg-transparent font-bold outline-none"
                >
                    {$t("pages.admin.projects.table.rows.details.btns.certificates")}
                </button>
                -->
                <!-- Hidden until the API persists annotations: the modal only keeps them in memory.
                <button
                    onclick={onOpenAnnotationsModal}
                    class="text-secondary bg-variant1 flex min-h-10 cursor-pointer flex-row items-center gap-2 rounded-2xl px-4 py-2 font-bold"
                >
                    <Comments size={20} class="shrink-0" />
                    {$t("pages.admin.projects.table.rows.details.btns.annotations")}
                    {#if project.annotationsCount > 0}
                        ({project.annotationsCount})
                    {/if}
                </button>
                -->
            </div>
        </div>
    {/snippet}
</DetailsRow>
