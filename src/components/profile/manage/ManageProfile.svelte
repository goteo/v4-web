<!--
    ManageProfile Component

    Public profile edit form for /me/manage: header, profile image card, bio and
    promoter info. Saves through the `updateProfile` action (User + Person + Organization).

    Location sharing and social links are laid out but not persisted yet: the API has no
    visibility flag and `User.links` is read-only (see the Asana ticket for both). Other
    Figma fields without an API equivalent (postal code, document type, "how did you meet
    us", public entity, categories) are left out.
-->
<script lang="ts">
    import { actions, isInputError } from "astro:actions";
    import iso3166 from "iso-3166-2";

    import ProfileImageCard from "./ProfileImageCard.svelte";
    import { locale, t } from "../../../i18n/store";
    import { getTerritoryDisplayName } from "../../../utils/territory";
    import { zProfileForm, type ProfileForm } from "../../../validation/profileValidation";
    import Facebook from "../../icons/social/Facebook.svelte";
    import Instagram from "../../icons/social/Instagram.svelte";
    import Linkedin from "../../icons/social/Linkedin.svelte";
    import X from "../../icons/social/X.svelte";
    import Warning from "../../icons/status/Warning.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import Card from "../../library/cards/Card.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import Checkbox from "../../library/inputs/Checkbox.svelte";
    import Select from "../../library/inputs/Select.svelte";
    import TerritoryInput from "../../library/inputs/TerritoryInput.svelte";
    import TextArea from "../../library/inputs/TextArea.svelte";
    import TextInput from "../../library/inputs/TextInput.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { Organization, Person, Territory, User } from "../../../openapi/client";
    import type { Component } from "svelte";
    import type z from "zod";

    type FieldName = keyof ProfileForm;

    interface Props {
        user: User;
        person?: Person;
        organization?: Organization;
    }

    let { user, person, organization }: Props = $props();

    // The API stores an unknown territory as the ISO "user-assigned" code, treat it as empty
    const UNKNOWN_COUNTRY = "ZZ";
    const country =
        user.territory?.country === UNKNOWN_COUNTRY ? "" : (user.territory?.country ?? "");

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
    });

    let displayName = $state(user.displayName ?? user.handle);

    // Not persisted: the API has no visibility flag and `User.links` is read-only
    let shareLocation = $state(false);
    let socialLinks = $state({ instagram: "", facebook: "", x: "", linkedin: "" });

    const socialNetworks: { key: keyof typeof socialLinks; icon: Component }[] = [
        { key: "instagram", icon: Instagram },
        { key: "facebook", icon: Facebook },
        { key: "x", icon: X },
        { key: "linkedin", icon: Linkedin },
    ];

    // Subdivisions are ISO codes, show them as "Subdivision, Country" in the search box
    let locality = $state(country ? getTerritoryDisplayName(user.territory!, $locale) : "");

    let countries = $derived.by(() => {
        const names = new Intl.DisplayNames([$locale], { type: "region" });

        return Object.keys(iso3166.data)
            .map((code) => ({ code, name: names.of(code) ?? code }))
            .sort((a, b) => a.name.localeCompare(b.name, $locale));
    });

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

    function getValidationMessage(field: FieldName) {
        const issue = validation[field]?.[0];

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

        const { data, error } = await actions.updateProfile(result.data);

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
        showSuccess = true;
    }
</script>

{#snippet cardHeader(title: string, subtitle: string)}
    <div class="flex flex-col gap-2">
        <Title level={2} variant="subsection" color="secondary">{title}</Title>
        <p class="text-content text-base leading-6">{subtitle}</p>
    </div>
{/snippet}

<div class="flex flex-col gap-4">
    <Title level={1} variant="headline" weight="bold">{$t("pages.me.manage.title")}</Title>
    <p class="text-content max-w-167 text-base leading-6">{$t("pages.me.manage.subtitle")}</p>
</div>

<form class="flex flex-col gap-6" onsubmit={handleSubmit} novalidate>
    <div class="flex flex-col items-stretch gap-6 lg:flex-row">
        <ProfileImageCard
            bind:avatar={form.avatar}
            {displayName}
            type={form.type}
            disabled={isSubmitting}
        />

        <Card class="flex-1 items-start gap-6 p-8">
            {@render cardHeader(
                $t("pages.me.manage.bio.title"),
                $t("pages.me.manage.bio.subtitle"),
            )}
            <!-- The TextArea wrapper is a plain div, stretch it so the field reaches the card bottom -->
            <div class="flex w-full flex-1 flex-col [&>div]:flex-1">
                <TextArea
                    bind:value={form.description}
                    placeholder={$t("pages.me.manage.bio.placeholder")}
                    class="h-full min-h-30"
                    rows={6}
                    disabled={isSubmitting}
                />
            </div>
        </Card>
    </div>

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

        <div class="flex items-start gap-2">
            <Warning width="16" height="16" class="text-content mt-1 shrink-0" />
            <p class="text-content flex-1 text-sm leading-4 font-medium">
                {$t("pages.me.manage.location.disclaimer")}
            </p>
        </div>
    </Card>

    <Card class="items-start gap-6 p-8">
        {@render cardHeader(
            $t("pages.me.manage.social.title"),
            $t("pages.me.manage.social.subtitle"),
        )}

        <div class="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
            {#each socialNetworks as { key, icon: Icon } (key)}
                <div class="flex items-start gap-4">
                    <Icon width="56" height="56" class="shrink-0" />
                    <div class="min-w-0 flex-1">
                        <TextInput
                            bind:value={socialLinks[key]}
                            labelText={$t(`pages.me.manage.social.${key}`)}
                            class="h-14"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
            {/each}
        </div>
    </Card>

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
