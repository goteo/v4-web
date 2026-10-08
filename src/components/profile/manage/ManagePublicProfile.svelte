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

    import ProfileHeader from "./ProfileHeader.svelte";
    import ProfileIdentityRow from "./ProfileIdentityRow.svelte";
    import ProfileSocialsCard from "./ProfileSocialsCard.svelte";
    import { t } from "../../../i18n/store";
    import { toSocialLinks, type SocialNetwork } from "../../../utils/socialLinks";
    import { zProfileForm, type ProfileForm } from "../../../validation/publicProfileValidation";
    import Button from "../../library/buttons/Button.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { User } from "../../../openapi/client";
    import type z from "zod";

    type FieldName = keyof ProfileForm;

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    let form: ProfileForm = $state({
        avatar: user.avatar || undefined,
        description: user.description ?? "",
        links: toSocialLinks((user.links ?? []).flatMap((link) => link.url ?? [])),
    });

    let displayName = $state(user.displayName ?? user.handle);
    let profileHandle = $state(user.handle);

    let validation = $state<Partial<Record<FieldName, z.core.$ZodIssue[]>>>({});
    let isSubmitting = $state(false);
    let showSuccess = $state(false);
    let showError = $state(false);
    let formError = $state("");

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
        type={user.type!}
        disabled={isSubmitting}
    />

    <ProfileSocialsCard
        bind:links={form.links}
        getError={getSocialError}
        onInput={() => validate("links")}
        disabled={isSubmitting}
    />

    <Toast floating variant="success" bind:showToast={showSuccess}>
        {$t("pages.me.manage.success")}
    </Toast>
    <Toast floating variant="error" bind:showToast={showError}>
        {formError}
    </Toast>

    <div class="flex justify-end">
        <Button type="submit" kind="primary" disabled={isSubmitting}>
            {$t("pages.me.manage.save")}
        </Button>
    </div>
</form>
