import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT ?? 4322);
const PROJECT_ID = 1;
const PROJECT_SLUG = "mock-project";
const SECOND_PROJECT_ID = 2;
const SECOND_PROJECT_SLUG = "mock-project-2";
const OWNER_ID = 10;
const SECOND_OWNER_ID = 11;
const ACCOUNTING_ID = 20;
const SECOND_ACCOUNTING_ID = 21;
const SUPPORTER_ACCOUNTING = "/v4/accountings/100";

const project = {
    id: PROJECT_ID,
    slug: PROJECT_SLUG,
    title: "Proyecto de prueba",
    subtitle: "Proyecto para probar la modal de novedades",
    descBrief: "Descripción breve del proyecto.",
    descAbout: "Descripción completa del proyecto.",
    descGoal: "Objetivo del proyecto.",
    descTeam: "Equipo del proyecto.",
    owner: `/v4/users/${OWNER_ID}`,
    accounting: `/v4/accountings/${ACCOUNTING_ID}`,
    status: "in_campaign",
    deadline: "minimum",
    calendar: {
        release: "2026-01-01T00:00:00+00:00",
        minimum: "2026-12-31T00:00:00+00:00",
        optimum: "2026-12-31T00:00:00+00:00",
    },
    locales: ["es"],
    cover: "",
    video: { src: "", thumbnail: "", cover: "" },
    budget: {
        minimum: { money: { amount: 1000, currency: "EUR" } },
        optimum: { money: { amount: 2000, currency: "EUR" } },
    },
    categories: [],
    themes: [],
    territory: { country: "ES" },
};

const secondProject = {
    ...project,
    id: SECOND_PROJECT_ID,
    slug: SECOND_PROJECT_SLUG,
    title: "Segundo proyecto de prueba",
    owner: `/v4/users/${SECOND_OWNER_ID}`,
    accounting: `/v4/accountings/${SECOND_ACCOUNTING_ID}`,
};

const projects = new Map([
    [String(PROJECT_ID), project],
    [PROJECT_SLUG, project],
    [String(SECOND_PROJECT_ID), secondProject],
    [SECOND_PROJECT_SLUG, secondProject],
]);

const accounting = {
    id: ACCOUNTING_ID,
    balance: { amount: 500, currency: "EUR" },
};

const owner = {
    id: OWNER_ID,
    handle: "mock-owner",
    displayName: "Mock Owner",
    email: "owner@example.com",
    accounting: `/v4/accountings/${ACCOUNTING_ID}`,
};

const support = {
    id: 1,
    project: `/v4/projects/${PROJECT_ID}`,
    origin: SUPPORTER_ACCOUNTING,
    displayName: "Mock Supporter",
    money: { amount: 1000, currency: "EUR" },
    anonymous: false,
    matchfunding: false,
};

const update = {
    id: 9001,
    project: `/v4/projects/${PROJECT_ID}`,
    title: "Novedad de prueba",
    subtitle: "Subtítulo de prueba",
    body: "Contenido de la novedad de prueba.",
    date: "2026-11-13T00:00:00+00:00",
    author: `/v4/users/${OWNER_ID}`,
    locales: ["es"],
};

const corsHeaders = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "*",
    "cache-control": "no-store",
};

function sendJson(res, body, status = 200, contentType = "application/json") {
    res.writeHead(status, { ...corsHeaders, "content-type": contentType });
    res.end(JSON.stringify(body));
}

function sendSupportCollection(res, accept) {
    return sendJson(
        res,
        {
            "@context": "/v4/contexts/ProjectSupport",
            "@id": "/v4/project_supports",
            "@type": "Collection",
            totalItems: 1,
            member: [support],
        },
        200,
        accept.includes("application/ld+json") ? "application/ld+json" : "application/json",
    );
}

const server = createServer((req, res) => {
    if (req.method === "OPTIONS") {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
    }

    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const path = url.pathname;
    const accept = req.headers.accept ?? "";

    console.log(`[mock-api] ${req.method} ${path}${url.search}`);

    if (path === "/health") {
        sendJson(res, { ok: true });
        return;
    }

    if (path === "/v4/project_supports") {
        const origin = url.searchParams.get("origin");

        if (origin && origin !== SUPPORTER_ACCOUNTING) {
            sendJson(
                res,
                {
                    "@context": "/v4/contexts/ProjectSupport",
                    "@id": "/v4/project_supports",
                    "@type": "Collection",
                    totalItems: 0,
                    member: [],
                },
                200,
                accept.includes("application/ld+json") ? "application/ld+json" : "application/json",
            );
            return;
        }

        sendSupportCollection(res, accept);
        return;
    }

    if (path === "/v4/project_updates") {
        sendJson(res, [update]);
        return;
    }

    if (path === "/v4/project_rewards") {
        sendJson(res, []);
        return;
    }

    if (path === "/v4/categories") {
        sendJson(res, []);
        return;
    }

    if (path === "/v4/accounting_balance_points") {
        sendJson(res, []);
        return;
    }

    const projectMatch = path.match(/^\/v4\/projects\/([^/]+)$/);
    if (projectMatch) {
        const projectResource = projects.get(decodeURIComponent(projectMatch[1]));

        if (projectResource) {
            sendJson(res, projectResource);
        } else {
            sendJson(res, { message: "Project not found" }, 404);
        }

        return;
    }

    if (/^\/v4\/accountings\/[^/]+$/.test(path)) {
        sendJson(res, accounting);
        return;
    }

    if (/^\/v4\/users\/[^/]+$/.test(path)) {
        sendJson(res, owner);
        return;
    }

    sendJson(res, []);
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(`[mock-api] Listening on http://127.0.0.1:${PORT}`);
});
