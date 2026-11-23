import { expect, test } from "./fixtures";

/** Pages that need a session send anonymous visitors to the login, keeping where they were going. */
const privatePaths = [
    "/me",
    "/me/manage/profile",
    "/checkout/payment",
    "/checkout/verify?checkoutId=1",
    "/admin/charges",
];

for (const path of privatePaths) {
    test(`${path} redirects to login without a session`, async ({ request }) => {
        const response = await request.get(path, { maxRedirects: 0 });

        expect(response.status()).toBe(302);

        const location = new URL(response.headers().location, "http://localhost");
        expect(location.pathname).toBe("/login");
        expect(location.searchParams.get("callback")).toBe(path);
    });
}
