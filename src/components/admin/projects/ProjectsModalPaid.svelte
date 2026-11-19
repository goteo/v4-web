<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import Close from "../../icons/navigation/Close.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import TextInput from "../../library/inputs/TextInput.svelte";

    let {
        open = $bindable(false),
        paidValue = $bindable(""),
        maxAchieved = "",
        onsave,
    }: {
        open: boolean;
        paidValue: string;
        maxAchieved?: string;
        onsave?: (paidValue: string) => void;
    } = $props();

    let mode = $state<"total" | "partial">("total");

    $effect(() => {
        if (open && mode === "total") {
            paidValue = maxAchieved;
        }
    });

    function setTotal() {
        mode = "total";
        paidValue = maxAchieved;
    }

    function setPartial() {
        mode = "partial";
        paidValue = "";
    }
</script>

<Modal
    bind:open
    title={$t("pages.admin.projects.modals.paid.title")}
    dismissable={false}
    class="backdrop:bg-overlay relative max-w-lg backdrop:backdrop-blur-[5px]"
>
    <button
        type="button"
        class="text-secondary absolute inset-e-4 top-4 cursor-pointer bg-transparent p-1 shadow-none hover:opacity-80 focus:ring-0"
        onclick={() => (open = false)}
        aria-label={$t("common.close")}
    >
        <Close width="24" height="24" />
    </button>

    <div class="flex flex-col gap-6">
        <p class="text-content text-sm">
            {$t("pages.admin.projects.modals.paid.description")}
        </p>

        <div class="flex gap-2">
            <Button kind={mode === "total" ? "primary" : "secondary"} size="sm" onclick={setTotal}>
                {$t("pages.admin.projects.modals.paid.total")}
            </Button>
            <Button
                kind={mode === "partial" ? "primary" : "secondary"}
                size="sm"
                onclick={setPartial}
            >
                {$t("pages.admin.projects.modals.paid.partial")}
            </Button>
        </div>

        <TextInput
            bind:value={paidValue}
            labelText={$t("pages.admin.projects.modals.paid.inputLabel")}
            disabled={mode === "total"}
        />

        <div class="flex justify-end">
            <Button kind="primary" onclick={() => onsave?.(paidValue)}>
                {$t("pages.admin.projects.modals.paid.save")}
            </Button>
        </div>
    </div>
</Modal>
