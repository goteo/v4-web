<script lang="ts">
    import { t } from "../../i18n/store";
    import CollapsibleBox from "../library/layout/CollapsibleBox.svelte";
    import Title from "../library/typography/Title.svelte";
</script>

<div class="flex items-start justify-between px-0 pt-0 pb-0 lg:hidden">
    <CollapsibleBox
        detailsId="auth-details"
        isInitiallyCollapsed={true}
        buttonTextShow={$t("pages.checkout.summary.showMore")}
        buttonTextHide={$t("pages.checkout.summary.hide")}
    >
        {#snippet header()}
            <Title level={2} variant="subsection" color="secondary" class="flex items-center gap-2">
                {$t("pages.checkout.login.welcome.title")}
            </Title>
        {/snippet}
    </CollapsibleBox>
</div>

<div class="hidden flex-col gap-6 pt-6 pb-0 lg:flex">
    <div>
        <Title level={2} variant="display" color="secondary" weight="bold" class="leading-tight">
            {$t("pages.checkout.login.welcome.title")}
        </Title>
        <p class="text-content font-light">
            {$t("pages.checkout.login.welcome.subtitle")}
        </p>
    </div>
    <hr class="bg-secondary" />
</div>
