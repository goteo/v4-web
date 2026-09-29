<script lang="ts">
    import { session } from "../../auth/store.ts";
    import { languagesList } from "../../i18n/locales";
    import { locale, t } from "../../i18n/store";
    import { apiUsersIdPatch } from "../../openapi/client/sdk.gen.ts";
    import { setCookie } from "../../utils/cookies";
    import ActionableButton from "../library/buttons/ActionableButton.svelte";
    import Toast from "../library/feedback/Toast.svelte";
    import Select from "../library/inputs/Select.svelte";
    import Title from "../library/typography/Title.svelte";

    interface Props {
        userId: number | undefined;
        class?: string;
    }

    let { userId, class: classes = "" }: Props = $props();

    let language: string = $state($locale ?? "es");
    let toast = $state(false);

    async function save() {
        const user = $session?.user;
        if (!user) {
            return;
        }

        setCookie("preferred-lang", language);

        await apiUsersIdPatch({
            baseUrl: "/api/relay",
            path: { id: String(userId) },
            // The user is known to be authenticated in this screen, so handle and
            // email are guaranteed to exist — no need for the null-safe `?? ""`.
            body: { handle: user.handle!, email: user.email! },
        });

        toast = true;
    }

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        save();
    }
</script>

<form onsubmit={handleSubmit} class={`flex flex-col gap-8 ${classes}`}>
    <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-2">
            <h1 class="font-body text-[2.5rem] leading-12 font-bold text-black">
                {$t("pages.me.manage.preferences.title")}
            </h1>
            <p class="text-content font-body text-base leading-6">
                {$t("pages.me.manage.preferences.subtitle")}
            </p>
        </div>

        <ActionableButton action={save} autoreset={3000} class="w-fit">
            {$t("pages.me.manage.preferences.save")}
        </ActionableButton>
    </div>

    <section class="flex flex-col gap-3">
        <Title level={2} variant="subsection">
            {$t("pages.me.manage.preferences.languages.title")}
        </Title>

        <div class="mt-2 flex max-w-2xl flex-col gap-4">
            <div class="w-full">
                <Select
                    name="language"
                    labelText={$t("pages.me.manage.preferences.languages.preferred")}
                    bind:value={language}
                >
                    {#each Object.entries(languagesList) as [code, name] (code)}
                        <option value={code}>{name}</option>
                    {/each}
                </Select>
            </div>
        </div>
    </section>
</form>

<Toast bind:showToast={toast} variant="success">
    {$t("pages.me.manage.preferences.toast.saved")}
</Toast>
