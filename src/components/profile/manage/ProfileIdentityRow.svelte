<!--
    ProfileIdentityRow Component

    The first row of a profile form: the image card next to the bio card. Both write to the same
    `User` record, so the row is shared by the public and the personal sections.
-->
<script lang="ts">
    import ProfileImageCard from "./ProfileImageCard.svelte";
    import { t } from "../../../i18n/store";
    import Card from "../../library/cards/Card.svelte";
    import TextArea from "../../library/inputs/TextArea.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { User } from "../../../openapi/client";

    interface Props {
        avatar?: string;
        description?: string;
        displayName: string;
        type: NonNullable<User["type"]>;
        disabled?: boolean;
    }

    let {
        avatar = $bindable(),
        description = $bindable(),
        displayName,
        type,
        disabled = false,
    }: Props = $props();
</script>

<div class="flex flex-col items-stretch gap-6 lg:flex-row">
    <ProfileImageCard bind:avatar {displayName} {type} {disabled} />

    <Card class="flex-1 items-start gap-6 p-8">
        <div class="flex flex-col gap-2">
            <Title level={2} variant="subsection" color="secondary">
                {$t("pages.me.manage.bio.title")}
            </Title>
            <p class="text-content text-base leading-6">{$t("pages.me.manage.bio.subtitle")}</p>
        </div>
        <!-- The TextArea wrapper is a plain div, stretch it so the field reaches the card bottom -->
        <div class="flex w-full flex-1 flex-col [&>div]:flex-1">
            <TextArea
                bind:value={description}
                placeholder={$t("pages.me.manage.bio.placeholder")}
                class="h-full min-h-30"
                rows={6}
                {disabled}
            />
        </div>
    </Card>
</div>
