<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { locale, t } from "../../i18n/store";
    import { formatAddress } from "../../utils/formatAddress";
    import AddressForm from "../address/AddressForm.svelte";
    import Button from "../library/buttons/Button.svelte";
    import RadioButton from "../library/inputs/RadioButton.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Address } from "../../openapi/client";

    const NEW = "new";

    let {
        open = $bindable(false),
        addresses,
        selected,
        userIri,
        onSelect,
    }: {
        open: boolean;
        /** Addresses to choose from, besides creating a new one. */
        addresses: Address[];
        /** Preselected when it is one of `addresses`. */
        selected?: Address;
        userIri: string;
        onSelect: (address: Address) => void;
    } = $props();

    const formId = $props.id();

    let choice = $state("");
    let isSubmitting = $state(false);
    let addressForm = $state<AddressForm>();

    $effect(() => {
        if (!open) return;

        choice = addresses.some((a) => a.id === selected?.id)
            ? String(selected!.id)
            : addresses.length
              ? ""
              : NEW;
    });

    async function save(event: SubmitEvent) {
        event.preventDefault();

        if (choice !== NEW) {
            const address = addresses.find((a) => String(a.id) === choice);
            if (address) onSelect(address);
            open = false;
            return;
        }

        isSubmitting = true;
        const created = await addressForm?.save();
        isSubmitting = false;

        if (!created) return;

        onSelect(created);
        open = false;
    }
</script>

<Modal
    bind:open
    closeBtnClass="top-6 end-6 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex max-h-[90vh] w-full max-w-167 -translate-x-1/2 -translate-y-1/2 flex-col gap-8 overflow-y-auto rounded-3xl border-b-0 bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    headerClass="border-b-0 md:p-0 p-0 pr-8"
    bodyClass="md:p-0 p-0 border-b-0"
    footerClass="md:p-0 p-0 flex items-center justify-end gap-4 border-b-0"
>
    {#snippet header()}
        <Title level={2} variant="subsection" weight="bold">
            {$t("pages.checkout.shipping.modal.title")}
        </Title>
    {/snippet}
    <form id={formId} class="flex flex-col gap-6" onsubmit={save}>
        {#each addresses as address (address.id)}
            <RadioButton
                bind:group={choice}
                value={String(address.id)}
                name="address"
                label={formatAddress(address, $locale)}
            />
        {/each}
        <RadioButton
            bind:group={choice}
            value={NEW}
            name="address"
            label={$t("pages.checkout.shipping.modal.newAddress")}
        />

        {#if choice === NEW}
            <AddressForm bind:this={addressForm} {userIri} />
        {/if}
    </form>
    {#snippet footer()}
        <Button kind="ghost" onclick={() => (open = false)} class="w-fit">
            {$t("common.cancel")}
        </Button>
        <Button type="submit" form={formId} disabled={!choice || isSubmitting} class="w-fit">
            {$t("common.save")}
        </Button>
    {/snippet}
</Modal>
