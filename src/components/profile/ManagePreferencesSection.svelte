<script lang="ts">
    import { session } from "../../auth/store.ts";
    import { languagesList } from "../../i18n/locales";
    import { t } from "../../i18n/store";
    import { apiUsersIdPatch } from "../../openapi/client/sdk.gen.ts";
    import Button from "../library/buttons/Button.svelte";
    import Toast from "../library/feedback/Toast.svelte";
    import Checkbox from "../library/inputs/Checkbox.svelte";
    import Select from "../library/inputs/Select.svelte";
    import Title from "../library/typography/Title.svelte";

    interface Props {
        userId: number | undefined;
        class?: string;
    }

    let { userId, class: classes = "" }: Props = $props();

    let language: string = $state("es");
    let translations: string = $state("es");
    let saving = $state(false);
    let toast = $state(false);

    const notifications: { key: string; labelKey: string; checked: boolean }[] = $state([
        {
            key: "projectNews",
            labelKey: "pages.me.manage.notifications.options.projectNews",
            checked: false,
        },
        {
            key: "messageReplies",
            labelKey: "pages.me.manage.notifications.options.messageReplies",
            checked: false,
        },
        {
            key: "projectProgress",
            labelKey: "pages.me.manage.notifications.options.projectProgress",
            checked: false,
        },
        {
            key: "newsletter",
            labelKey: "pages.me.manage.notifications.options.newsletter",
            checked: false,
        },
        {
            key: "hideEmail",
            labelKey: "pages.me.manage.notifications.options.hideEmail",
            checked: false,
        },
        {
            key: "campaignTips",
            labelKey: "pages.me.manage.notifications.options.campaignTips",
            checked: false,
        },
    ]);

    async function save() {
        const user = $session?.user;
        if (!user) {
            return;
        }

        saving = true;
        await apiUsersIdPatch({
            baseUrl: "/api/relay",
            path: { id: String(userId) },
            body: { ...user, handle: user.handle ?? "", email: user.email ?? "" },
        });
        saving = false;
        toast = true;
    }
</script>

<div class={`flex flex-col gap-8 ${classes}`}>
    <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-2">
            <h1 class="font-body text-[2.5rem] leading-12 font-bold text-black">
                {$t("pages.me.manage.title")}
            </h1>
            <p class="text-content font-body text-base leading-6">
                {$t("pages.me.manage.subtitle")}
            </p>
        </div>

        <Button type="submit" onclick={save} disabled={saving}>
            {saving ? "…" : $t("pages.me.manage.save")}
        </Button>
    </div>

    <section class="flex flex-col gap-3">
        <Title level={2} variant="subsection">
            {$t("pages.me.manage.languages.title")}
        </Title>

        <div class="mt-2 flex max-w-2xl flex-col gap-4 sm:flex-row">
            <div class="w-full sm:w-1/2">
                <Select
                    name="language"
                    labelText={$t("pages.me.manage.languages.preferred")}
                    bind:value={language}
                >
                    {#each Object.entries(languagesList) as [code, name] (code)}
                        <option value={code}>{name}</option>
                    {/each}
                </Select>
            </div>

            <div class="w-full sm:w-1/2">
                <Select
                    name="translations"
                    labelText={$t("pages.me.manage.languages.translations")}
                    bind:value={translations}
                >
                    {#each Object.entries(languagesList) as [code, name] (code)}
                        <option value={code}>{name}</option>
                    {/each}
                </Select>
            </div>
        </div>
    </section>

    <section class="mt-8 flex flex-col gap-3">
        <Title level={2} variant="subsection">
            {$t("pages.me.manage.notifications.title")}
        </Title>

        <div
            class="mt-2 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-4 whitespace-nowrap md:grid-cols-2"
        >
            {#each notifications as item (item.key)}
                <Checkbox label={$t(item.labelKey)} bind:checked={item.checked} />
            {/each}
        </div>
    </section>

    <Toast bind:showToast={toast} variant="success">
        {$t("pages.me.manage.toast.saved")}
    </Toast>
</div>
