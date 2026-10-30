<!--
    @component
    Shipping addresses of the current User for /me/manage/addresses: list, create, edit and delete.
-->
<script lang="ts">
    import { Modal } from "flowbite-svelte";
    import { untrack } from "svelte";

    import { locale, t } from "../../../i18n/store";
    import { apiAddressesIdDelete, apiAddressesIdPatch } from "../../../openapi/client";
    import { getDefaultAddress } from "../../../utils/defaultAddress";
    import { formatAddress } from "../../../utils/formatAddress";
    import AddressForm from "../../address/AddressForm.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import DeleteModal from "../../library/feedback/DeleteModal.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import Tag from "../../library/tags/Tag.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { AddressAddressUpdationDto } from "../../../openapi/client";
    import type { DefaultableAddress } from "../../../utils/defaultAddress";

    let {
        addresses: initial,
        userIri,
    }: {
        addresses: DefaultableAddress[];
        userIri: string;
    } = $props();

    const formId = $props.id();

    // Local copy: saves and deletes update the list without reloading the page.
    let addresses = $state(untrack(() => [...initial]));

    let editing = $state<DefaultableAddress>();
    let formOpen = $state(false);
    let isSubmitting = $state(false);
    let addressForm = $state<AddressForm>();

    let deleting = $state<DefaultableAddress>();
    let deleteOpen = $state(false);
    let showDeleteError = $state(false);
    let showDefaultError = $state(false);

    let defaultAddress = $derived(getDefaultAddress(addresses));

    function openForm(address?: DefaultableAddress) {
        editing = address;
        formOpen = true;
    }

    async function save(event: SubmitEvent) {
        event.preventDefault();

        isSubmitting = true;
        const saved = await addressForm?.save();
        isSubmitting = false;

        if (!saved) return;

        addresses = editing
            ? addresses.map((a) => (a.id === saved.id ? saved : a))
            : [...addresses, saved];
        formOpen = false;
    }

    async function makeDefault(address: DefaultableAddress) {
        const { error } = await apiAddressesIdPatch({
            baseUrl: "/api/relay",
            path: { id: String(address.id) },
            // Pending in the API, see `DefaultableAddress`
            body: { isDefault: true } as AddressAddressUpdationDto,
        });

        if (error) {
            showDefaultError = true;
            return;
        }

        // The API keeps a single default per User
        addresses = addresses.map((a) => ({ ...a, isDefault: a.id === address.id }));
    }

    function confirmDelete(address: DefaultableAddress) {
        deleting = address;
        deleteOpen = true;
    }

    async function remove() {
        deleteOpen = false;
        if (!deleting?.id) return;

        const { error } = await apiAddressesIdDelete({
            baseUrl: "/api/relay",
            path: { id: String(deleting.id) },
        });

        // An Address already used by a claim cannot be deleted
        if (error) {
            showDeleteError = true;
            return;
        }

        addresses = addresses.filter((a) => a.id !== deleting!.id);
    }
</script>

<div class="flex flex-col gap-8">
    <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-2">
            <h1 class="font-body text-[2.5rem] leading-12 font-bold text-black">
                {$t("pages.me.manage.addresses.title")}
            </h1>
            <p class="text-content font-body text-base leading-6">
                {$t("pages.me.manage.addresses.subtitle")}
            </p>
        </div>

        <Button class="w-fit shrink-0" onclick={() => openForm()}>
            {$t("pages.me.manage.addresses.add")}
        </Button>
    </div>

    {#if addresses.length === 0}
        <p class="text-content">{$t("pages.me.manage.addresses.empty")}</p>
    {/if}

    <div class="flex flex-col gap-4">
        {#each addresses as address (address.id)}
            <div
                class="border-grey flex flex-col gap-4 rounded-3xl border bg-white p-4 md:flex-row md:items-center md:justify-between md:p-5"
            >
                <p class="text-content">{formatAddress(address, $locale)}</p>
                <div class="flex shrink-0 items-center gap-3">
                    {#if address.id === defaultAddress?.id}
                        <Tag variant="bold">{$t("pages.me.manage.addresses.default")}</Tag>
                    {:else}
                        <Button kind="ghost" size="sm" onclick={() => makeDefault(address)}>
                            {$t("pages.me.manage.addresses.makeDefault")}
                        </Button>
                    {/if}
                    <Button kind="ghost" size="sm" onclick={() => openForm(address)}>
                        {$t("common.edit")}
                    </Button>
                    <Button kind="secondary" size="sm" onclick={() => confirmDelete(address)}>
                        {$t("common.delete")}
                    </Button>
                </div>
            </div>
        {/each}
    </div>
</div>

<Modal
    bind:open={formOpen}
    closeBtnClass="top-6 end-6 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex max-h-[90vh] w-full max-w-167 -translate-x-1/2 -translate-y-1/2 flex-col gap-8 overflow-y-auto rounded-3xl border-b-0 bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    headerClass="border-b-0 md:p-0 p-0 pr-8"
    bodyClass="md:p-0 p-0 border-b-0"
    footerClass="md:p-0 p-0 flex items-center justify-end gap-4 border-b-0"
>
    {#snippet header()}
        <Title level={2} variant="subsection" weight="bold">
            {$t(editing ? "pages.me.manage.addresses.edit" : "pages.me.manage.addresses.add")}
        </Title>
    {/snippet}
    <form id={formId} onsubmit={save}>
        <!-- A fresh form per opening, seeded with the address being edited -->
        {#if formOpen}
            {#key editing}
                <AddressForm bind:this={addressForm} address={editing} {userIri} />
            {/key}
        {/if}
    </form>
    {#snippet footer()}
        <Button kind="ghost" onclick={() => (formOpen = false)} class="w-fit">
            {$t("common.cancel")}
        </Button>
        <Button type="submit" form={formId} disabled={isSubmitting} class="w-fit">
            {$t("common.save")}
        </Button>
    {/snippet}
</Modal>

<DeleteModal
    bind:open={deleteOpen}
    title={$t("pages.me.manage.addresses.deleteTitle")}
    description={deleting ? formatAddress(deleting, $locale) : ""}
    onclick={remove}
/>

<Toast bind:showToast={showDefaultError} variant="error">
    {$t("pages.me.manage.addresses.defaultError")}
</Toast>

<Toast bind:showToast={showDeleteError} variant="error">
    {$t("pages.me.manage.addresses.deleteError")}
</Toast>
