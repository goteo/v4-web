<script lang="ts">
    import { actions, isInputError } from "astro:actions";

    import { t } from "../../../../i18n/store";
    import ActionableButton from "../../../library/buttons/ActionableButton.svelte";
    import Button from "../../../library/buttons/Button.svelte";
    import Toast from "../../../library/feedback/Toast.svelte";
    import ImageUploadModal from "../../../library/inputs/ImageUploadModal.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { UploadedObject } from "../../../../utils/media/objectStorage.types";

    interface Props {
        onSaved?: () => void;
    }

    let { onSaved }: Props = $props();

    type FieldErrors = Partial<Record<"altText", string>>;

    let formElement: HTMLFormElement;

    let media = $state<UploadedObject>();
    let altText = $state("Goteo");
    let isUploadOpen = $state(false);

    let fieldErrors: FieldErrors = $state({});
    let mediaError = $state("");
    let errorMessage = $state("");
    let showError = $state(false);

    function handleUpload(files: UploadedObject[]) {
        media = files[0];
        mediaError = "";
    }

    async function submit() {
        fieldErrors = {};
        mediaError = "";

        if (!media) {
            mediaError = $t("pages.admin.customize.logo.errors.mediaRequired");
            return;
        }

        const data = new FormData(formElement);

        // The uploaded object is not a form field: hand the asset over explicitly.
        data.set("mediaUrl", media.url);
        data.set("mediaType", media.type);
        data.set("altText", altText.trim());

        try {
            const { error } = await actions.createHeaderLogo(data);

            if (error) {
                if (!isInputError(error)) {
                    errorMessage = error.message;
                    showError = true;

                    return;
                }

                fieldErrors = Object.fromEntries(
                    Object.entries(error.fields).map(([field, issues]) => [field, issues?.[0]]),
                ) as FieldErrors;

                return;
            }
        } catch (e) {
            // The action call itself threw (e.g. a network failure); do not
            // let ActionableButton swallow it silently.
            errorMessage = e instanceof Error ? e.message : String(e);
            showError = true;

            return;
        }

        media = undefined;
        altText = "Goteo";

        onSaved?.();
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        await submit();
    }
</script>

<form bind:this={formElement} onsubmit={handleSubmit} class="flex max-w-167 flex-col gap-10">
    <div class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.customize.logo.fields.mediaTitle")}
        </Title>

        <div
            class="border-grey flex w-full flex-col gap-6 rounded-2xl border bg-white p-6 shadow-sm sm:max-w-138"
        >
            <div class="flex flex-col">
                <p class="text-secondary text-base font-bold">
                    {$t("pages.admin.customize.logo.fields.mediaLabel")}
                </p>

                {#if media}
                    <p class="text-content truncate text-base font-normal">{media.name}</p>
                {:else}
                    <p class="text-content text-base font-normal">
                        {$t("pages.admin.customize.logo.fields.mediaHint")}
                    </p>
                {/if}
            </div>

            {#if media}
                <div class="flex items-center justify-center rounded-lg bg-gray-50 p-6">
                    <img
                        src={media.url}
                        alt={altText || media.name}
                        class="max-h-24 w-auto max-w-full object-contain"
                    />
                </div>
            {/if}

            {#if mediaError}
                <p class="text-tertiary text-sm">{mediaError}</p>
            {/if}

            <div class="flex flex-wrap gap-4">
                <Button
                    kind="secondary"
                    size="sm"
                    class="w-fit"
                    onclick={() => (isUploadOpen = true)}
                >
                    {$t("pages.admin.customize.logo.fields.mediaAdd")}
                </Button>

                {#if media}
                    <Button
                        kind="ghost"
                        size="sm"
                        class="w-fit"
                        onclick={() => (media = undefined)}
                    >
                        {$t("common.remove")}
                    </Button>
                {/if}
            </div>
        </div>
    </div>

    <TextInput
        bind:value={altText}
        required
        labelText={$t("pages.admin.customize.logo.fields.altTextLabel")}
        placeholder={$t("pages.admin.customize.logo.fields.altTextPlaceholder")}
        error={fieldErrors.altText && $t(fieldErrors.altText)}
        class="sm:max-w-138"
    />

    <ActionableButton action={submit} autoreset={2000} class="w-fit px-6">
        {$t("common.save")}
    </ActionableButton>
</form>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>

<ImageUploadModal
    bind:open={isUploadOpen}
    accept={["image/png", "image/jpeg", "image/webp"]}
    multiple={false}
    recommendedSize="480x120px"
    onConfirm={handleUpload}
/>
