<script lang="ts">
    import Facebook from "../icons/social/Facebook.svelte";
    import Gmail from "../icons/social/Gmail.svelte";
    import Instagram from "../icons/social/Instagram.svelte";
    import Linkedin from "../icons/social/Linkedin.svelte";
    import MediumIcon from "../icons/social/MediumIcon.svelte";
    import X from "../icons/social/X.svelte";
    import Title from "../library/typography/Title.svelte";
    import TerritoryTag from "../project/TerritoryTag.svelte";

    import type { Link, Territory } from "../../openapi/client/types.gen";

    interface Props {
        displayName: string;
        territory?: Territory;
        links?: Link[];
        email?: string;
    }

    let { displayName, territory, links = [], email }: Props = $props();

    type SocialLinkKey = "email" | "facebook" | "instagram" | "linkedin" | "medium" | "twitter";

    interface SocialLink {
        url: string;
        label: string;
        icon: any;
    }

    function detectSocialPlatform(link: Link): SocialLinkKey | null {
        const url = (link.url ?? "").toLowerCase();
        const rel = (link.rel ?? "").toLowerCase();
        if (rel === "twitter" || url.includes("twitter.com") || url.includes("x.com"))
            return "twitter";
        if (rel === "instagram" || url.includes("instagram.com")) return "instagram";
        if (rel === "facebook" || url.includes("facebook.com")) return "facebook";
        if (rel === "linkedin" || url.includes("linkedin.com")) return "linkedin";
        if (rel === "medium" || url.includes("medium.com")) return "medium";
        return null;
    }

    const resolvedLinks = $derived(
        links.reduce<Record<string, string>>(
            (acc, link) => {
                const platform = detectSocialPlatform(link);
                if (platform && link.url && !acc[platform]) acc[platform] = link.url;
                return acc;
            },
            email ? { email: `mailto:${email}` } : {},
        ),
    );

    // Same order as the design
    const allSocialLinks: Record<SocialLinkKey, SocialLink> = $derived({
        twitter: { url: resolvedLinks.twitter || "", label: "X/Twitter", icon: X },
        instagram: { url: resolvedLinks.instagram || "", label: "Instagram", icon: Instagram },
        facebook: { url: resolvedLinks.facebook || "", label: "Facebook", icon: Facebook },
        linkedin: { url: resolvedLinks.linkedin || "", label: "LinkedIn", icon: Linkedin },
        email: { url: resolvedLinks.email || "", label: "Email", icon: Gmail },
        medium: { url: resolvedLinks.medium || "", label: "Medium", icon: MediumIcon },
    });

    const socialMediaLinks = $derived(
        (Object.entries(allSocialLinks) as [SocialLinkKey, SocialLink][]).filter(
            ([, link]) => link.url,
        ),
    );
</script>

<div class="mt-28 flex w-full flex-col items-center gap-4">
    <!-- Name -->
    <Title level={1} variant="subsection" color="secondary" class="leading-tight">
        {displayName}
    </Title>

    <!-- Location -->
    {#if territory}
        <TerritoryTag {territory} class="border-0 bg-transparent" />
    {/if}

    <!-- Social Media Links -->
    {#if socialMediaLinks.length > 0}
        <div class="flex items-center gap-2">
            {#each socialMediaLinks as [key, link]}
                <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-secondary focus:ring-secondary flex size-6 items-center justify-center overflow-hidden rounded-[4.8px] transition-opacity hover:opacity-90 focus:ring-2 focus:outline-none"
                    aria-label={link.label}
                >
                    {#if key === "medium"}
                        <span class="bg-variant1 flex size-full p-1">
                            <link.icon class="size-full" />
                        </span>
                    {:else}
                        <link.icon width="24" height="24" />
                    {/if}
                </a>
            {/each}
        </div>
    {/if}
</div>
