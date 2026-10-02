<!--
    ProfileSocialsCard Component

    The social networks card, one input per network. Shared by the public and the personal
    sections, which both edit the same `User.links`.

    `getError` lets the owning form surface its own validation, since the schema lives there.
-->
<script lang="ts">
    import { t } from "../../../i18n/store";
    import { SOCIAL_NETWORKS, type SocialLinks, type SocialNetwork } from "../../../utils/socialLinks";
    import Facebook from "../../icons/social/Facebook.svelte";
    import Instagram from "../../icons/social/Instagram.svelte";
    import Linkedin from "../../icons/social/Linkedin.svelte";
    import X from "../../icons/social/X.svelte";
    import Card from "../../library/cards/Card.svelte";
    import TextInput from "../../library/inputs/TextInput.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { Component } from "svelte";

    interface Props {
        links?: SocialLinks;
        disabled?: boolean;
        /** Validation message for a network, empty when the value is fine */
        getError?: (network: SocialNetwork) => string;
        onInput?: () => void;
    }

    let {
        links = $bindable({ instagram: "", facebook: "", x: "", linkedin: "" }),
        disabled = false,
        getError,
        onInput,
    }: Props = $props();

    const networkIcons: Record<SocialNetwork, Component> = {
        instagram: Instagram,
        facebook: Facebook,
        x: X,
        linkedin: Linkedin,
    };
</script>

<Card class="items-start gap-6 p-8">
    <div class="flex flex-col gap-2">
        <Title level={2} variant="subsection" color="secondary">
            {$t("pages.me.manage.social.title")}
        </Title>
        <p class="text-content text-base leading-6">{$t("pages.me.manage.social.subtitle")}</p>
    </div>

    <div class="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
        {#each SOCIAL_NETWORKS as network (network)}
            {@const Icon = networkIcons[network]}
            <div class="flex items-start gap-4">
                <Icon width="56" height="56" class="shrink-0" />
                <div class="min-w-0 flex-1">
                    <TextInput
                        bind:value={links[network]}
                        labelText={$t(`pages.me.manage.social.${network}`)}
                        placeholder={$t("pages.me.manage.social.placeholder")}
                        error={getError?.(network)}
                        class="h-14"
                        {onInput}
                        {disabled}
                    />
                </div>
            </div>
        {/each}
    </div>
</Card>
