<!--
    ManagePersonalProfile Component

    Private profile edit form for /me/manage: the data the API only exposes to
    the owner and to platform admins, meaning the names and tax id on the `Person` record, the
    `Territory` on the `User` and the identity row (avatar, bio, social networks) that this section
    shares with the public one. Saves through the `updatePersonalProfile` action.
-->
<script lang="ts">
    import { actions, isInputError } from "astro:actions";

    import FormNotice from "./FormNotice.svelte";
    import ProfileHeader from "./ProfileHeader.svelte";
    import { locale, t } from "../../../i18n/store";
    import { getCountries } from "../../../utils/countries";
    import { type SocialNetwork } from "../../../utils/socialLinks";
    import { getTerritoryDisplayName, UNKNOWN_COUNTRY_CODE } from "../../../utils/territory";
    import {
        zPersonalProfileForm,
        type PersonalProfileForm,
    } from "../../../validation/personalProfileValidation";
    import Button from "../../library/buttons/Button.svelte";
    import Card from "../../library/cards/Card.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import Checkbox from "../../library/inputs/Checkbox.svelte";
    import DateInput from "../../library/inputs/DateInput.svelte";
    import Select from "../../library/inputs/Select.svelte";
    import TerritoryInput from "../../library/inputs/TerritoryInput.svelte";
    import TextInput from "../../library/inputs/TextInput.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { Person, Territory, User } from "../../../openapi/client";
    import type z from "zod";

    type FieldName = keyof PersonalProfileForm;

    interface Props {
        user: User;
        person?: Person;
    }

    let { user, person }: Props = $props();

    const country =
        user.territory?.country === UNKNOWN_COUNTRY_CODE ? "" : (user.territory?.country ?? "");

    // Changing the profile kind belongs to the public section, here it only routes the tax id
    const isOrganization = user.type === "organization";

    let form: PersonalProfileForm = $state({
        firstName: person?.firstName ?? "",
        lastName: person?.lastName ?? "",
        taxId: isOrganization ? "" : (person?.taxId ?? ""),
        country,
        subLvl1: user.territory?.subLvl1 ?? "",
        subLvl2: user.territory?.subLvl2 ?? "",
        address: user.territory?.address ?? "",
        type: isOrganization ? "organization" : "individual",
    });

    // Not persisted: the API has no visibility or anonymity flag
    let shareLocation = $state(false);
    let anonymousDonation = $state(false);

    // Subdivisions are ISO codes, show them as "Subdivision, Country" in the search box
    let locality = $state(country ? getTerritoryDisplayName(user.territory!, $locale) : "");

    let countries = $derived(getCountries($locale));

    // The API has no birth year, the DateInput needs a date to render the placeholder
    const emptyDate = new Date("");

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
        // taxId depends on the country, so it goes through the refinement
        const result = zPersonalProfileForm.safeParse(form);

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

        const result = zPersonalProfileForm.safeParse(form);

        if (!result.success) {
            for (const issue of result.error.issues) {
                const field = issue.path[0] as FieldName;

                validation[field] = [...(validation[field] ?? []), issue];
            }
            return;
        }

        isSubmitting = true;

        const { data, error } = await actions.updatePersonalProfile(result.data);

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

        // The API trims and normalises, show what was actually stored
        if (data.person) {
            form.firstName = data.person.firstName ?? "";
            form.lastName = data.person.lastName ?? "";
            form.taxId = data.person.taxId ?? "";
        }

        showSuccess = true;
    }
</script>

{#snippet cardHeader(title: string, subtitle: string)}
    <div class="flex flex-col gap-2">
        <Title level={2} variant="subsection" color="secondary">{title}</Title>
        <p class="text-content text-base leading-6">{subtitle}</p>
    </div>
{/snippet}

<ProfileHeader
    title={$t("pages.me.manage.personal.title")}
    subtitle={$t("pages.me.manage.personal.subtitle")}
    handle={user.handle}
/>

<form class="flex flex-col gap-6" onsubmit={handleSubmit} novalidate>
    <Card class="items-start gap-6 p-8">
        {@render cardHeader(
            $t("pages.me.manage.personal.info.title"),
            $t("pages.me.manage.personal.info.subtitle"),
        )}

        <div class="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            {#if isOrganization}
                <h3 class="text-secondary text-lg leading-6 font-bold md:col-span-2">
                    {$t("pages.me.manage.info.representative")}
                </h3>
            {/if}

            <div class="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
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

            <div class="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
                <TextInput
                    labelText={$t("pages.me.manage.personal.info.postalCode")}
                    class="h-14"
                    disabled
                />
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
                    disabled
                />
                <Checkbox
                    bind:checked={anonymousDonation}
                    label={$t("pages.me.manage.personal.info.anonymousDonation")}
                    class="gap-2"
                    disabled
                />
            </div>

            <div class="w-full">
                <Select
                    labelText={$t("pages.me.manage.personal.info.howDidYouMeet")}
                    value=""
                    disabled
                >
                    <option value="">{$t("common.select")}</option>
                </Select>
            </div>

            <div class="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
                <Select
                    labelText={$t("pages.me.manage.personal.info.documentType")}
                    value=""
                    disabled
                >
                    <option value="">{$t("common.select")}</option>
                </Select>
                <TextInput
                    bind:value={form.taxId}
                    labelText={$t("pages.me.manage.info.taxId")}
                    error={getValidationMessage("taxId")}
                    class="h-14"
                    onInput={() => validate("taxId")}
                    disabled={isSubmitting}
                />
            </div>

            <div class="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
                <DateInput
                    value={emptyDate}
                    labelText={$t("pages.me.manage.personal.info.birthYear")}
                    placeholder={$t("pages.me.manage.personal.info.birthYear")}
                    disabled
                />
                <Select labelText={$t("pages.me.manage.personal.info.gender")} value="" disabled>
                    <option value="">{$t("common.select")}</option>
                </Select>
            </div>
        </div>

        <FormNotice text={$t("pages.me.manage.location.disclaimer")} />
    </Card>

    {#if showSuccess}
        <Toast variant="success" bind:showToast={showSuccess}>
            {$t("pages.me.manage.personal.success")}
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
