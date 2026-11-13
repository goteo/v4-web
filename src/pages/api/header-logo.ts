import { headerLogoRepository } from "../../repositories/headerLogo";

import type { APIRoute } from "astro";

/**
 * Exposes the active header logo to client-side code.
 *
 * The header is mounted by every page, so fetching the logo from here keeps the
 * pages from having to pass it down as a prop (and from serialising the asset
 * into each document). A `null` body means the built-in logo is used.
 */
export const GET: APIRoute = async () => {
    const logo = await headerLogoRepository.getActive();

    return new Response(JSON.stringify(logo ? { src: logo.mediaUrl, alt: logo.altText } : null), {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60",
        },
    });
};
