<!--
    Project Slot Card - reusable admin card for a project slot in a grid.

    Variants:
    - "fixed": image on the left + slot content on the right (24px gap). The
      content is a title/subtitle group at the top and the action buttons at
      the bottom, separated by auto space (justify-between). When a project is
      selected the title is the project title and the subtitle is its carousel
      position; the empty state shows the slot label ("Proyecto NN") plus the
      helper text instead.
      - onRemove: clears the project from the slot, rendered as an "X" icon
        button on filled cards (optional).
      - onRemoveSlot: deletes the whole slot card, rendered as a trash icon
        button on empty cards (opt-in; only used by proposed campaigns, other
        consumers keep non-deletable slots).
    - "add": standalone trailing card (title + subtitle + ghost button) used to
      append a new slot to the grid.
-->
<script lang="ts">
    import { twMerge } from "tailwind-merge";

    import { t } from "../../../i18n/store";
    import PlusIcon from "../../icons/actions/PlusIcon.svelte";
    import Trash from "../../icons/actions/Trash.svelte";
    import Close from "../../icons/navigation/Close.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import Title from "../../library/typography/Title.svelte";

    interface Props {
        slotNumber?: number;
        project?: { title: string; image: string | null } | null;
        variant?: "fixed" | "add";
        onAdd?: () => void;
        onReplace?: () => void;
        onRemove?: () => void;
        onRemoveSlot?: () => void;
        class?: string;
    }

    let {
        slotNumber,
        project = null,
        variant = "fixed",
        onAdd,
        onReplace,
        onRemove,
        onRemoveSlot,
        class: className = "",
    }: Props = $props();
</script>

{#if variant === "add"}
    <div
        class={twMerge(
            "border-grey bg-grey flex flex-col gap-6 rounded-3xl border-1 p-6",
            className,
        )}
    >
        <div class="flex flex-col gap-1">
            <Title level={2} variant="field" color="secondary" class="text-base">
                {$t("pages.admin.slotCard.addTitle")}
            </Title>
            <p class="text-content text-base font-normal">
                {$t("pages.admin.slotCard.addSubtitle")}
            </p>
        </div>
        <Button class="w-fit" kind="ghost" size="sm" onclick={() => onAdd?.()}>
            <PlusIcon class="size-4" />
            {$t("pages.admin.slotCard.addMore")}
        </Button>
    </div>
{:else}
    <div class={twMerge("border-grey flex gap-6 rounded-2xl border p-4", className)}>
        {#if project?.image}
            <img
                src={project.image}
                alt={project.title}
                class="aspect-square size-30 shrink-0 self-start rounded-2xl object-cover"
            />
        {/if}
        <div class="flex min-w-0 flex-1 flex-col items-start justify-between gap-4">
            {#if project}
                <div class="flex flex-col gap-1">
                    <p class="text-secondary font-bold">{project.title}</p>
                    {#if slotNumber !== undefined}
                        <p class="text-content text-body-small font-normal">
                            {$t("pages.admin.slotCard.position", {
                                number: String(slotNumber).padStart(2, "0"),
                            })}
                        </p>
                    {/if}
                </div>
                <div class="flex items-center gap-2">
                    <Button kind="secondary" size="sm" onclick={() => onReplace?.()}>
                        {$t("pages.admin.slotCard.replace")}
                    </Button>
                    {#if onRemove}
                        <button
                            type="button"
                            class="text-secondary cursor-pointer transition-transform duration-200 hover:scale-110"
                            aria-label={$t("pages.admin.slotCard.remove")}
                            onclick={() => onRemove?.()}
                        >
                            <Close class="size-5" />
                        </button>
                    {/if}
                </div>
            {:else}
                <div class="flex flex-col gap-1">
                    {#if slotNumber !== undefined}
                        <p class="text-secondary font-bold">
                            {$t("pages.admin.slotCard.slot", {
                                number: String(slotNumber).padStart(2, "0"),
                            })}
                        </p>
                    {/if}
                    <p class="text-content text-body-small">{$t("pages.admin.slotCard.empty")}</p>
                </div>
                <div class="flex items-center gap-2">
                    <Button kind="secondary" size="sm" onclick={() => onAdd?.()}>
                        {$t("pages.admin.slotCard.add")}
                    </Button>
                    {#if onRemoveSlot}
                        <button
                            type="button"
                            class="text-secondary cursor-pointer transition-transform duration-200 hover:scale-110"
                            aria-label={$t("common.delete")}
                            onclick={() => onRemoveSlot?.()}
                        >
                            <Trash class="size-5" />
                        </button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
{/if}
