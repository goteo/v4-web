<script lang="ts">
    import { t } from "../../i18n/store";
    import Flash from "../icons/media/Flash.svelte";
    import Tabs from "../library/layout/Tabs.svelte";

    interface Props {
        activeTab?: string;
        onTabChange?: (tabId: string) => void;
    }

    let { activeTab = "most-successful", onTabChange }: Props = $props();
</script>

{#snippet flashIconSnippet()}
    <Flash class="size-4" />
{/snippet}

<!-- The "ending soon" and "matchfunding" tabs below are disabled; re-add their
     icon snippets (Clock / Flames) together with the tab entries. -->

<Tabs
    tabs={[
        {
            id: "most-successful",
            label: $t("pages.home.campaigns.tabs.mostSuccessful"),
            icon: flashIconSnippet,
        },
        // Uncomment when ready to enable
        // {
        //     id: "ending-soon",
        //     label: $t("pages.home.campaigns.tabs.endingSoon"),
        //     icon: clockIconSnippet,
        // },
        // {
        //     id: "matchfunding",
        //     label: $t("pages.home.campaigns.tabs.withMatchfunding"),
        //     icon: matchFundingIconSnippet,
        // },
    ]}
    {activeTab}
    alignment="left"
    useDataAttributes={false}
    {onTabChange}
/>
