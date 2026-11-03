<!--
    @component
    Address fields with their own saving. Renders no `<form>`, so it can sit inside a parent one:
    the parent submits and calls `save()` through `bind:this`, which creates the Address, or updates
    it when `address` is given.
-->
<script lang="ts">
    import { untrack } from "svelte";

    import { locale, t } from "../../i18n/store";
    import { apiAddressesIdPatch, apiAddressesPost } from "../../openapi/client";
    import { getCountries } from "../../utils/countries";
    import Select from "../library/inputs/Select.svelte";
    import TextInput from "../library/inputs/TextInput.svelte";

    import type { Address } from "../../openapi/client";

    let {
        address,
        userIri,
    }: {
        /** Address to edit. Absent, a new one is created. */
        address?: Address;
        userIri: string;
    } = $props();

    // Seeded once: parents mount a fresh form for every address they edit.
    let form = $state(
        untrack(() => ({
            firstName: address?.firstName ?? "",
            lastName: address?.lastName ?? "",
            line1: address?.line1 ?? "",
            line2: address?.line2 ?? "",
            city: address?.city ?? "",
            postCode: address?.postCode ?? "",
            country: address?.country ?? "",
        })),
    );
    let error = $state<string>();
    /** API validation messages, keyed by field name. */
    let fieldErrors = $state<Record<string, string>>({});

    let countries = $derived(getCountries($locale));

    /** Saves the Address. Resolves to it, or to `undefined` with the errors shown. */
    export async function save(): Promise<Address | undefined> {
        error = undefined;
        fieldErrors = {};

        // Checked here and not with `required`, which makes `Select` add an asterisk that no other
        // field shows: every field is required except `line2`, which says so in its label.
        if (!form.country) {
            fieldErrors = { country: $t("system.validation.requiredField") };
            return;
        }

        const body = { ...form, line2: form.line2 || null };
        const { data, error: apiError } = address?.id
            ? await apiAddressesIdPatch({
                  baseUrl: "/api/relay",
                  path: { id: String(address.id) },
                  body,
              })
            : await apiAddressesPost({ baseUrl: "/api/relay", body: { ...body, user: userIri } });

        if (data) return data;

        const violations = (
            apiError as { violations?: { propertyPath?: string; message?: string }[] }
        )?.violations;

        if (violations?.length) {
            fieldErrors = Object.fromEntries(
                violations.map((v) => [v.propertyPath ?? "", v.message ?? ""]),
            );
        } else {
            error = $t("pages.checkout.shipping.error");
        }
    }
</script>

<!-- Modal bodies scroll, which clips overflow: the padding keeps the floating labels and the
     focus ring inside them -->
<div class="grid gap-6 px-1 pt-2 pb-1 md:grid-cols-2">
    <TextInput
        bind:value={form.firstName}
        error={fieldErrors.firstName}
        labelText={$t("pages.checkout.shipping.fields.firstName")}
        required
    />
    <TextInput
        bind:value={form.lastName}
        error={fieldErrors.lastName}
        labelText={$t("pages.checkout.shipping.fields.lastName")}
        required
    />
    <TextInput
        bind:value={form.line1}
        error={fieldErrors.line1}
        labelText={$t("pages.checkout.shipping.fields.line1")}
        required
    />
    <TextInput
        bind:value={form.line2}
        error={fieldErrors.line2}
        labelText={$t("pages.checkout.shipping.fields.line2")}
    />
    <TextInput
        bind:value={form.postCode}
        error={fieldErrors.postCode}
        labelText={$t("pages.checkout.shipping.fields.postCode")}
        required
    />
    <TextInput
        bind:value={form.city}
        error={fieldErrors.city}
        labelText={$t("pages.checkout.shipping.fields.city")}
        required
    />
    <!-- `Select` puts `class` on the <select>, so the grid span goes on a wrapper -->
    <div class="md:col-span-2">
        <Select
            bind:value={form.country}
            error={fieldErrors.country}
            labelText={$t("pages.checkout.shipping.fields.country")}
        >
            <option value="">{$t("common.select")}</option>
            {#each countries as { code, name } (code)}
                <option value={code}>{name}</option>
            {/each}
        </Select>
    </div>

    {#if error}
        <p class="text-semantic-error text-sm md:col-span-2">{error}</p>
    {/if}
</div>
