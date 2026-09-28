export const SOCIAL_NETWORKS = ["instagram", "facebook", "x", "linkedin"] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export type SocialLinks = Record<SocialNetwork, string>;

// The API only tags known orgs (no X), so the network is resolved from the host here
const NETWORK_DOMAINS: Record<SocialNetwork, string[]> = {
    instagram: ["instagram.com"],
    facebook: ["facebook.com", "fb.com"],
    x: ["x.com", "twitter.com"],
    linkedin: ["linkedin.com"],
};

/**
 * Adds `https://` when the scheme is missing, like the API does before storing a link.
 */
export function normalizeLinkUrl(value: string): string {
    const url = value.trim();

    return /^[a-z][a-z\d+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

export function getSocialNetwork(url: string): SocialNetwork | undefined {
    let host: string;

    try {
        host = new URL(normalizeLinkUrl(url)).hostname.toLowerCase();
    } catch {
        return undefined;
    }

    return SOCIAL_NETWORKS.find((network) =>
        NETWORK_DOMAINS[network].some((domain) => host === domain || host.endsWith(`.${domain}`)),
    );
}

/**
 * Picks the first link of each network from a User's links.
 */
export function toSocialLinks(urls: string[]): SocialLinks {
    const links: SocialLinks = { instagram: "", facebook: "", x: "", linkedin: "" };

    for (const url of urls) {
        const network = getSocialNetwork(url);

        if (network && !links[network]) {
            links[network] = url;
        }
    }

    return links;
}
