<!--
    ProfileImageCard Component

    Profile summary card for /me/manage: teal banner with brand decoration,
    avatar, display name and an upload action that swaps the avatar image.
-->
<script lang="ts">
    import { t } from "../../../i18n/store";
    import DefaultAvatar from "../../icons/DefaultAvatar.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import Card from "../../library/cards/Card.svelte";
    import ImageUploadModal from "../../library/inputs/ImageUploadModal.svelte";

    import type { User } from "../../../openapi/client";
    import type { UploadedObject } from "../../../utils/media/objectStorage.types";

    interface Props {
        avatar?: string;
        displayName: string;
        type: NonNullable<User["type"]>;
        disabled?: boolean;
    }

    let { avatar = $bindable(), displayName, type, disabled = false }: Props = $props();

    let openUpload = $state(false);

    function handleUpload(files: UploadedObject[]) {
        const file = files[0];

        if (file) {
            avatar = file.url;
        }
    }
</script>

<Card class="relative w-full items-start gap-10 overflow-hidden p-8 lg:w-138">
    <!-- Banner -->
    <div class="bg-primary absolute inset-x-0 top-0 h-40 overflow-hidden rounded-t-4xl">
        <img
            src="/images/brand/goteo-drop.svg"
            alt=""
            aria-hidden="true"
            class="absolute top-[-253px] left-[179px] h-142 w-100 max-w-none"
        />
    </div>

    <div class="relative flex w-full flex-col gap-6">
        {#if avatar}
            <img
                src={avatar}
                alt={$t("pages.me.manage.profile.avatarAlt")}
                class="size-40 rounded-2xl object-cover"
            />
        {:else}
            <DefaultAvatar width="160" height="160" class="size-40 rounded-2xl" />
        {/if}
        <div class="flex flex-col">
            <p class="text-secondary text-2xl leading-8 font-bold">{displayName}</p>
            <p class="text-content text-base leading-6">
                {$t(`pages.me.manage.profile.type.${type}`)}
            </p>
        </div>
    </div>

    <Button kind="ghost" class="w-full" onclick={() => (openUpload = true)} {disabled}>
        {$t("pages.me.manage.profile.uploadImage")}
    </Button>
</Card>

<ImageUploadModal
    bind:open={openUpload}
    accept={["image/png", "image/jpeg", "image/webp"]}
    recommendedSize="400x400px"
    onConfirm={handleUpload}
/>
