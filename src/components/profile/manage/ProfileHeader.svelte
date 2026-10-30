<!--
    ProfileHeader Component

    Heading shared by every section of the promoter profile: title and subtitle on the left, the
    link to the public profile on the right.
-->
<script lang="ts">
    import { t } from "../../../i18n/store";
    import Button from "../../library/buttons/Button.svelte";
    import Title from "../../library/typography/Title.svelte";

    interface Props {
        title: string;
        subtitle: string;
        /** Handle the "view profile" button points at */
        handle: string;
    }

    let { title, subtitle, handle }: Props = $props();
</script>

<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
    <div class="flex flex-col gap-4">
        <Title level={1} variant="headline" weight="bold">{title}</Title>
        <p class="text-content max-w-167 text-base leading-6">{subtitle}</p>
    </div>
    <Button kind="secondary" href="/user/{handle}" class="shrink-0">
        {$t("pages.me.manage.viewProfile")}
    </Button>
</div>
