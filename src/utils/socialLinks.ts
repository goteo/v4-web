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

// Where a bare username is appended to build the profile link
const NETWORK_PROFILE_URLS: Record<SocialNetwork, string> = {
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
    x: "https://x.com/",
    linkedin: "https://www.linkedin.com/in/",
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
 * Turns a profile link or a bare username (`@` optional) into a link of the given network.
 * @returns `undefined` when the value is neither
 */
export function toSocialLinkUrl(network: SocialNetwork, value: string): string | undefined {
    const input = value.trim();
    const linkNetwork = getSocialNetwork(input);

    if (linkNetwork) {
        return linkNetwork === network ? normalizeLinkUrl(input) : undefined;
    }

    const username = input.replace(/^@/, "");

    return /^[\w.-]+$/.test(username) ? NETWORK_PROFILE_URLS[network] + username : undefined;
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
