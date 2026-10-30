import { get } from "svelte/store";

import { getDefaultLanguage } from "./consts";
import { currencySymbols } from "./currencyData";
import { CAMPAIGN_REVIEW_STATES, CAMPAIGN_REVIEW_STATE_LABELS } from "./review";
import {
    searchAccountings,
    searchCategories,
    searchGateways,
    searchProjectsByDescription,
    searchProjectsBySlug,
    searchProjectsBySubtitle,
    searchProjectsByTitle,
    searchUsersByEmail,
    searchUsersByHandle,
} from "./searchers";
import TerritoryReferentInput from "../components/library/filters/TerritoryReferentInput.svelte";
import { locale } from "../i18n/store";

import type { ResourceSearcher } from "./resourceSearch";
import type { Component } from "svelte";

export interface FilterRow {
    id: string;
    subject: FilterSubject;
    operator: FilterOperator;
    referent: string | number | Date | string[];
    serialize: () => Record<string, string | string[]>;
}

export type FilterOperator =
    | "equals"
    | "is_any_of"
    | "before"
    | "after"
    | "strictly_before"
    | "strictly_after"
    | "gte"
    | "gt"
    | "lte"
    | "lt";

export type FilterResource = "projects" | "gateway_charges" | "users" | "project_reviews";

export interface FilterOption {
    value: string;
    /** Resolved with `$t` where the option is rendered: an i18n key, or a literal used as-is. */
    label: string;
}

export interface FilterSubject {
    key: string;
    param?: string;
    type: "string" | "date" | "number" | "money";
    compatibleOperators: FilterOperator[];
    resources: FilterResource[];
    options?: FilterOption[];
    suggest?: ResourceSearcher;
    serialize?: (referent: unknown) => Record<string, string | string[]>;
    allowsMultipleEquals?: boolean;
    /** Renders the referent with a dedicated component instead of its raw label. */
    display?: "accountingOwner";
    component?: Component<any>;
}

const gatewayChargeStatuses: FilterOption[] = [
    { value: "to_charge", label: "To charge" },
    { value: "in_charge", label: "In charge" },
    { value: "to_refund", label: "To refund" },
    { value: "refunded", label: "Refunded" },
    { value: "to_wallet", label: "To wallet" },
    { value: "walleted", label: "Wallet" },
];

const chargeTypes: FilterOption[] = [
    { value: "single", label: "Single" },
    { value: "recurring", label: "Recurring" },
];

// Roles are a closed set with no listing endpoint, so the composer offers them as options.
// The labels reuse the already translated admin users table keys to avoid duplicating them.
const userRoleOptions: FilterOption[] = [
    { value: "ROLE_USER", label: "pages.admin.users.table.rows.roles.ROLE_USER" },
    { value: "ROLE_ADMIN", label: "pages.admin.users.table.rows.roles.ROLE_ADMIN" },
    { value: "ROLE_SUPER_ADMIN", label: "pages.admin.users.table.rows.roles.ROLE_SUPER_ADMIN" },
];

const reviewTypes: FilterOption[] = [
    { value: "campaign", label: "domain.filterComposer.subjectOption.reviewType.campaign" },
    { value: "financial", label: "domain.filterComposer.subjectOption.reviewType.financial" },
];

/** The five public states a campaign review is shown as, reused from the review screens. */
const reviewStates: FilterOption[] = CAMPAIGN_REVIEW_STATES.map((state) => ({
    value: state,
    label: CAMPAIGN_REVIEW_STATE_LABELS[state],
}));

const projectStatuses: FilterOption[] = [
    { value: "in_draft", label: "domain.project.status.in_draft" },
    { value: "to_campaign_review", label: "domain.project.status.to_campaign_review" },
    { value: "in_campaign_review", label: "domain.project.status.in_campaign_review" },
    {
        value: "in_campaign_review.to_review",
        label: "domain.project.status.in_campaign_review_to_review",
    },
    {
        value: "in_campaign_review.to_change",
        label: "domain.project.status.in_campaign_review_to_change",
    },
    { value: "campaign_review.rejected", label: "domain.project.status.campaign_review_rejected" },
    { value: "to_campaign", label: "domain.project.status.to_campaign" },
    { value: "in_campaign", label: "domain.project.status.in_campaign" },
    { value: "campaign.failed", label: "domain.project.status.campaign_failed" },
    { value: "campaign.cancelled", label: "domain.project.status.campaign_cancelled" },
    { value: "to_funding_review", label: "domain.project.status.to_funding_review" },
    { value: "in_funding_review", label: "domain.project.status.in_funding_review" },
    {
        value: "in_funding_review.to_review",
        label: "domain.project.status.in_funding_review_to_review",
    },
    {
        value: "in_funding_review.to_change",
        label: "domain.project.status.in_funding_review_to_change",
    },
    { value: "funding_review.rejected", label: "domain.project.status.funding_review_rejected" },
    { value: "to_funding", label: "domain.project.status.to_funding" },
    { value: "in_funding", label: "domain.project.status.in_funding" },
    { value: "funding.paid", label: "domain.project.status.funding_paid" },
];

const currentLocale = get(locale) || getDefaultLanguage();
const currencyName = new Intl.DisplayNames([currentLocale], { type: "currency" });

const currencies: FilterOption[] = Object.keys(currencySymbols).map((code) => ({
    value: code,
    label: `${currencyName.of(code)} (${code})`,
}));

const filterSubjects: Record<string, FilterSubject> = {
    title: {
        key: "title",
        type: "string",
        compatibleOperators: ["equals"],
        resources: ["projects"],
        suggest: searchProjectsByTitle,
    },
    subtitle: {
        key: "subtitle",
        type: "string",
        compatibleOperators: ["equals"],
        resources: ["projects"],
        suggest: searchProjectsBySubtitle,
    },
    description: {
        key: "description",
        // The API names the project description `descBrief`. Without this, the row would send
        // `description`, which the API does not know about and drops silently.
        param: "descBrief",
        type: "string",
        compatibleOperators: ["equals"],
        resources: ["projects"],
        suggest: searchProjectsByDescription,
    },
    projectStatus: {
        key: "projectStatus",
        param: "status",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["projects"],
        options: projectStatuses,
        allowsMultipleEquals: true,
    },
    chargeStatus: {
        key: "chargeStatus",
        param: "status",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["gateway_charges"],
        options: gatewayChargeStatuses,
        allowsMultipleEquals: true,
    },
    categories: {
        key: "categories",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["projects"],
        suggest: searchCategories,
        allowsMultipleEquals: true,
    },
    owner: {
        key: "owner",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["projects"],
        suggest: searchUsersByHandle,
        allowsMultipleEquals: true,
    },
    slug: {
        key: "slug",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["projects"],
        suggest: searchProjectsBySlug,
        allowsMultipleEquals: true,
    },
    gateway: {
        key: "gateway",
        param: "checkout.gateway",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["gateway_charges"],
        suggest: searchGateways,
        allowsMultipleEquals: true,
    },
    type: {
        key: "type",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["gateway_charges"],
        options: chargeTypes,
        allowsMultipleEquals: true,
    },
    target: {
        key: "target",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["gateway_charges"],
        suggest: searchAccountings,
        allowsMultipleEquals: true,
        display: "accountingOwner",
    },
    origin: {
        key: "checkout.origin",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["gateway_charges"],
        suggest: searchAccountings,
        allowsMultipleEquals: true,
        display: "accountingOwner",
    },
    currency: {
        key: "currency",
        param: "money.currency",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["gateway_charges"],
        options: currencies,
        allowsMultipleEquals: true,
    },
    amount: {
        key: "amount",
        param: "money.amount",
        type: "money",
        compatibleOperators: ["gte", "gt", "lte", "lt"],
        resources: ["gateway_charges"],
    },
    reviewType: {
        key: "reviewType",
        param: "type",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["project_reviews"],
        options: reviewTypes,
        allowsMultipleEquals: true,
    },
    project: {
        key: "project",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["project_reviews"],
        suggest: searchProjectsByTitle,
        allowsMultipleEquals: true,
    },
    reviewer: {
        key: "reviewer",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["project_reviews"],
        suggest: searchUsersByEmail,
        allowsMultipleEquals: true,
    },
    reviewState: {
        key: "reviewState",
        // The reviews endpoint cannot filter by project status; the table reads this
        // param and resolves it against the Project collection before querying.
        param: "projectStatus",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["project_reviews"],
        options: reviewStates,
        allowsMultipleEquals: true,
    },
    dateCreated: {
        key: "dateCreated",
        type: "date",
        compatibleOperators: ["before", "after", "strictly_before", "strictly_after"],
        resources: ["projects", "gateway_charges", "users", "project_reviews"],
    },
    dateUpdated: {
        key: "dateUpdated",
        type: "date",
        compatibleOperators: ["before", "after", "strictly_before", "strictly_after"],
        resources: ["projects", "gateway_charges", "users", "project_reviews"],
    },
    handle: {
        key: "handle",
        type: "string",
        compatibleOperators: ["equals"],
        resources: ["users"],
        suggest: searchUsersByHandle,
    },
    email: {
        key: "email",
        type: "string",
        compatibleOperators: ["equals"],
        resources: ["users"],
        suggest: searchUsersByEmail,
    },
    userType: {
        key: "userType",
        param: "type",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["users"],
        options: [
            {
                value: "individual",
                label: "domain.filterComposer.subjectOption.userType.individual",
            },
            {
                value: "organization",
                label: "domain.filterComposer.subjectOption.userType.organization",
            },
        ],
        allowsMultipleEquals: true,
    },
    active: {
        key: "active",
        type: "string",
        compatibleOperators: ["equals"],
        resources: ["users"],
        options: [
            { value: "true", label: "domain.filterComposer.subjectOption.active.true" },
            { value: "false", label: "domain.filterComposer.subjectOption.active.false" },
        ],
    },
    userRoles: {
        key: "userRoles",
        param: "roles",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["users"],
        options: userRoleOptions,
        allowsMultipleEquals: true,
    },
    territory: {
        key: "territory",
        type: "string",
        compatibleOperators: ["is_any_of"],
        resources: ["projects", "users"],
        component: TerritoryReferentInput as Component<any>,
        serialize(referent) {
            const t = JSON.parse(referent as string);
            const result: Record<string, string[]> = {};
            if (t.countries?.length) result["territory.country[]"] = t.countries;
            if (t.subLvl1?.length) result["territory.subLvl1[]"] = t.subLvl1;
            if (t.subLvl2?.length) result["territory.subLvl2[]"] = t.subLvl2;
            return result;
        },
    },
};

export function createFilterRow(
    subject: FilterSubject,
    operator: FilterOperator,
    referent: string | number | Date | string[],
): FilterRow {
    const id = crypto.randomUUID();

    return {
        id,
        subject,
        operator,
        referent,
        serialize: () => {
            if (typeof subject.serialize !== "undefined") {
                return subject.serialize(referent);
            }

            const key = subject.param ?? subject.key;

            switch (operator) {
                case "equals":
                    if (Array.isArray(referent)) {
                        return { [`${key}[]`]: referent as string[] };
                    }
                    return { [key]: String(referent) };
                case "is_any_of":
                    // The API only unions multiple values when they arrive as `key[]`: a repeated
                    // bare key keeps just the last one (verified against projects and users).
                    return { [`${key}[]`]: referent as string[] };
                case "before":
                case "after":
                case "strictly_before":
                case "strictly_after": {
                    const date = referent instanceof Date ? referent : new Date(referent as string);
                    return { [`${key}[${operator}]`]: date.toISOString() };
                }
                case "gte":
                case "gt":
                case "lte":
                case "lt":
                    return { [`${key}[${operator}]`]: String(referent) };
                default:
                    return { [key]: String(referent) };
            }
        },
    };
}

export function getFilterSubject(key: string): FilterSubject | undefined {
    return filterSubjects[key];
}

export function getAllFilterSubjects(resource?: FilterResource): FilterSubject[] {
    const all = Object.values(filterSubjects);
    return resource ? all.filter((s) => s.resources.includes(resource)) : all;
}
