<!--
    ManagePublicProfile Component

    Public profile edit form for /me/manage/profile: header, profile image card, bio and
    promoter info. Saves through the `updatePublicProfile` action (User + Person + Organization).

    Location sharing is laid out but not persisted yet: the API has no visibility flag
    (see the Asana ticket). Other Figma fields without an API equivalent (postal code, document type, "how did you meet
    us", public entity, categories) are left out.
-->
<script lang="ts">
    import { actions, isInputError } from "astro:actions";

    import FormNotice from "./FormNotice.svelte";
    import ProfileHeader from "./ProfileHeader.svelte";
    import ProfileIdentityRow from "./ProfileIdentityRow.svelte";
    import ProfileSocialsCard from "./ProfileSocialsCard.svelte";
    import { locale, t } from "../../../i18n/store";
    import { getCountries } from "../../../utils/countries";
    import { toSocialLinks, type SocialNetwork } from "../../../utils/socialLinks";
    import { getTerritoryDisplayName, UNKNOWN_COUNTRY_CODE } from "../../../utils/territory";
    import { zProfileForm, type ProfileForm } from "../../../validation/publicProfileValidation";
    import Button from "../../library/buttons/Button.svelte";
    import Card from "../../library/cards/Card.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import Checkbox from "../../library/inputs/Checkbox.svelte";
    import Select from "../../library/inputs/Select.svelte";
    import TerritoryInput from "../../library/inputs/TerritoryInput.svelte";
    import TextInput from "../../library/inputs/TextInput.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { Organization, Person, Territory, User } from "../../../openapi/client";
    import type z from "zod";

    type FieldName = keyof ProfileForm;

    interface Props {
        user: User;
        person?: Person;
        organization?: Organization;
    }

    let { user, person, organization }: Props = $props();

    const country =
        user.territory?.country === UNKNOWN_COUNTRY_CODE ? "" : (user.territory?.country ?? "");

    let form: ProfileForm = $state({
        handle: user.handle,
        avatar: user.avatar || undefined,
        description: user.description ?? "",
        type: user.type ?? "individual",
        country,
        subLvl1: user.territory?.subLvl1 ?? "",
        subLvl2: user.territory?.subLvl2 ?? "",
        address: user.territory?.address ?? "",
        firstName: person?.firstName ?? "",
        lastName: person?.lastName ?? "",
        legalName: organization?.legalName ?? "",
        businessName: organization?.businessName ?? "",
        taxId: (user.type === "organization" ? organization?.taxId : person?.taxId) ?? "",
        links: toSocialLinks((user.links ?? []).flatMap((link) => link.url ?? [])),
    });

    let displayName = $state(user.displayName ?? user.handle);
    let profileHandle = $state(user.handle);

    // Not persisted: the API has no visibility flag
    let shareLocation = $state(false);

    // Subdivisions are ISO codes, show them as "Subdivision, Country" in the search box
    let locality = $state(country ? getTerritoryDisplayName(user.territory!, $locale) : "");

    let countries = $derived(getCountries($locale));

    let validation = $state<Partial<Record<FieldName, z.core.$ZodIssue[]>>>({});
    let isSubmitting = $state(false);
    let showSuccess = $state(false);
    let showError = $state(false);
    let formError = $state("");

    function handleLocality(territory: Territory) {
        form.country = territory.country ?? form.country;
        form.subLvl1 = territory.subLvl1 ?? "";
        form.subLvl2 = territory.subLvl2 ?? "";
    }

    function validate(field: FieldName) {
        // taxId and organization fields depend on other values, so they go through the refinement
        const result = zProfileForm.safeParse(form);

        validation[field] = result.error?.issues.filter((issue) => issue.path[0] === field);
    }

    function getValidationMessage(field: FieldName, network?: SocialNetwork) {
        const issue = validation[field]?.find((issue) => !network || issue.path[1] === network);

        if (!issue) {
            return "";
        }

        return $t(issue.message);
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();

        validation = {};
        showSuccess = false;
        showError = false;

        const result = zProfileForm.safeParse(form);

        if (!result.success) {
            for (const issue of result.error.issues) {
                const field = issue.path[0] as FieldName;

                validation[field] = [...(validation[field] ?? []), issue];
            }
            return;
        }

        isSubmitting = true;

        const { data, error } = await actions.updatePublicProfile(result.data);

        isSubmitting = false;

        if (error) {
            if (isInputError(error)) {
                for (const issue of error.issues) {
                    const field = String(issue.path?.[0] ?? "") as FieldName;

                    validation[field] = [...(validation[field] ?? []), issue];
                }
                return;
            }

            formError = error.message;
            showError = true;
            return;
        }

        displayName = data.user.displayName ?? data.user.handle;
        // The API resolves each link (scheme, redirects), show what was stored
        form.links = toSocialLinks((data.user.links ?? []).flatMap((link) => link.url ?? []));
        profileHandle = data.user.handle;
        showSuccess = true;
    }

    function getSocialError(network: SocialNetwork): string {
        return getValidationMessage("links", network);
    }
</script>

{#snippet cardHeader(title: string, subtitle: string)}
    <div class="flex flex-col gap-2">
        <Title level={2} variant="subsection" color="secondary">{title}</Title>
        <p class="text-content text-base leading-6">{subtitle}</p>
    </div>
{/snippet}

<ProfileHeader
    title={$t("pages.me.manage.title")}
    subtitle={$t("pages.me.manage.subtitle")}
    handle={profileHandle}
/>

<form class="flex flex-col gap-6" onsubmit={handleSubmit} novalidate>
    <ProfileIdentityRow
        bind:avatar={form.avatar}
        bind:description={form.description}
        {displayName}
        type={form.type}
        disabled={isSubmitting}
    />

    <Card class="items-start gap-6 p-8">
        {@render cardHeader($t("pages.me.manage.info.title"), $t("pages.me.manage.info.subtitle"))}

        <div class="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <TextInput
                bind:value={form.handle}
                labelText={$t("pages.me.manage.info.handle")}
                error={getValidationMessage("handle")}
                class="h-14"
                onInput={() => validate("handle")}
                disabled={isSubmitting}
                required
            />
            {#if form.type === "individual"}
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <TextInput
                        bind:value={form.firstName}
                        labelText={$t("pages.me.manage.info.firstName")}
                        class="h-14"
                        disabled={isSubmitting}
                    />
                    <TextInput
                        bind:value={form.lastName}
                        labelText={$t("pages.me.manage.info.lastName")}
                        class="h-14"
                        disabled={isSubmitting}
                    />
                </div>
            {:else}
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <TextInput
                        bind:value={form.legalName}
                        labelText={$t("pages.me.manage.info.legalName")}
                        error={getValidationMessage("legalName")}
                        class="h-14"
                        onInput={() => validate("legalName")}
                        disabled={isSubmitting}
                        required
                    />
                    <TextInput
                        bind:value={form.businessName}
                        labelText={$t("pages.me.manage.info.businessName")}
                        class="h-14"
                        disabled={isSubmitting}
                    />
                </div>
            {/if}

            <Select
                bind:value={form.country}
                labelText={$t("pages.me.manage.info.country")}
                onChange={() => validate("taxId")}
                disabled={isSubmitting}
            >
                <option value="">{$t("common.select")}</option>
                {#each countries as { code, name } (code)}
                    <option value={code}>{name}</option>
                {/each}
            </Select>
            <div class="relative">
                <span
                    class="text-secondary absolute top-0 left-4 z-10 -translate-y-1/2 bg-white px-1 text-sm font-medium"
                >
                    {$t("pages.me.manage.info.locality")}
                </span>
                <TerritoryInput
                    bind:value={locality}
                    placeholder={$t("pages.me.manage.info.localityPlaceholder")}
                    searchClasses="border-secondary h-14 shadow-none"
                    onInput={handleLocality}
                />
            </div>
            <div class="md:col-span-2">
                <TextInput
                    bind:value={form.address}
                    labelText={$t("pages.me.manage.info.address")}
                    class="h-14"
                    disabled={isSubmitting}
                />
            </div>

            <div class="md:col-span-2">
                <Checkbox
                    bind:checked={shareLocation}
                    label={$t("pages.me.manage.location.share")}
                    class="gap-2"
                    disabled={isSubmitting}
                />
            </div>

            <Select
                bind:value={form.type}
                labelText={$t("pages.me.manage.info.type")}
                onChange={() => validate("taxId")}
                disabled={isSubmitting}
            >
                <option value="individual">
                    {$t("pages.checkout.register.form.userType.individual")}
                </option>
                <option value="organization">
                    {$t("pages.checkout.register.form.userType.organization")}
                </option>
            </Select>
            <TextInput
                bind:value={form.taxId}
                labelText={$t("pages.me.manage.info.taxId")}
                error={getValidationMessage("taxId")}
                class="h-14"
                onInput={() => validate("taxId")}
                disabled={isSubmitting}
                required={form.type === "organization"}
            />

            {#if form.type === "organization"}
                <h3 class="text-secondary text-lg leading-6 font-bold md:col-span-2">
                    {$t("pages.me.manage.info.representative")}
                </h3>
                <TextInput
                    bind:value={form.firstName}
                    labelText={$t("pages.me.manage.info.firstName")}
                    class="h-14"
                    disabled={isSubmitting}
                />
                <TextInput
                    bind:value={form.lastName}
                    labelText={$t("pages.me.manage.info.lastName")}
                    class="h-14"
                    disabled={isSubmitting}
                />
            {/if}
        </div>

        <FormNotice text={$t("pages.me.manage.location.disclaimer")} />
    </Card>

    <ProfileSocialsCard
        bind:links={form.links}
        getError={getSocialError}
        onInput={() => validate("links")}
        disabled={isSubmitting}
    />

    {#if showSuccess}
        <Toast variant="success" bind:showToast={showSuccess}>
            {$t("pages.me.manage.success")}
        </Toast>
    {/if}
    {#if showError}
        <Toast variant="error" bind:showToast={showError}>
            {formError}
        </Toast>
    {/if}

    <div class="flex justify-end">
        <Button type="submit" kind="primary" disabled={isSubmitting}>
            {$t("pages.me.manage.save")}
        </Button>
    </div>
</form>
