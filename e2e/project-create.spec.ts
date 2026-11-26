import { expect, test, waitForHydration } from "./fixtures";
import { messages } from "./locales";

const t = messages.es.pages.project.create;

test.use({ storageState: "e2e/.auth/user.json" });

/** A single Nominatim place, so the address search does not depend on openstreetmap.org */
const barcelona = {
    place_id: 1,
    licence: "",
    osm_type: "relation",
    osm_id: 1,
    boundingbox: [],
    lat: 41.38,
    lon: 2.17,
    display_name: "Barcelona, Cataluña, España",
    class: "boundary",
    type: "administrative",
    importance: 1,
    address: {
        city: "Barcelona",
        state: "Cataluña",
        "ISO3166-2-lvl4": "ES-CT",
        country: "España",
        country_code: "es",
    },
};

test.beforeEach(async ({ page }) => {
    await page.route("https://nominatim.openstreetmap.org/**", (route) =>
        route.fulfill({ json: [barcelona] }),
    );
    await page.goto("/create/project");
    await waitForHydration(page);
});

test("an empty project form shows what is missing", async ({ page }) => {
    await page.getByRole("button", { name: t.submit }).click();

    await expect(page.getByText(t.validation.subtitleMissing)).toBeVisible();
    await expect(page.getByText(t.validation.territoryMissing)).toBeVisible();
    await expect(page).toHaveURL(/\/create\/project$/);
});

test("creating a project opens its editor", async ({ page }) => {
    const title = `E2E proyecto creado ${Date.now()}`;

    await page.getByRole("textbox", { name: t.description.titlePlaceholder }).fill(title);
    await page
        .getByRole("textbox", { name: t.description.subtitlePlaceholder })
        .fill("Creado por los tests E2E");
    await page.getByRole("group").getByRole("button").first().click();
    await page.getByRole("textbox", { name: t.address.placeholder }).fill("Barcelona");
    await page.getByRole("option", { name: "Cataluña" }).click();
    await page.getByRole("button", { name: t.submit }).click();

    await expect(page).toHaveURL(/\/project\/\d+\/edit$/);
    const id = page.url().match(/\/project\/(\d+)\/edit/)![1];

    try {
        await expect(
            page.getByRole("textbox", {
                name: messages.es.pages.project.edit.header.titlePlaceholder,
            }),
        ).toHaveValue(title);
    } finally {
        // The test user owns the draft, so it can remove it
        await page.request.delete(`/api/relay/v4/projects/${id}`);
    }
});
