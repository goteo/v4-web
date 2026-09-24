import { get } from "svelte/store";

import { getDefaultLanguage } from "./consts";
import { currencySymbols } from "./currencyData";
import {
    suggestGateways,
    suggestAccounting,
    suggestOwner,
    suggestCategories,
    suggestProjects,
    suggestProjectsBySubtitle,
    suggestProjectsByDescription,
    suggestProjectsBySlug,
    suggestUserHandle,
    suggestUserEmail,
} from "./filterSuggestions";
import TerritoryReferentInput from "../components/library/filters/TerritoryReferentInput.svelte";
import { locale } from "../i18n/store";

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

export type FilterResource = "projects" | "gateway_charges" | "users";

export interface FilterOption {
    value: string;
    label: string;
}

export interface FilterSubject {
    key: string;
    param?: string;
    type: "string" | "date" | "number" | "money";
    compatibleOperators: FilterOperator[];
    resources: FilterResource[];
    options?: FilterOption[];
    suggest?: (q: string) => Promise<FilterOption[]>;
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

const projectStatuses: FilterOption[] = [
    { value: "in_draft", label: "In draft" },
    { value: "to_campaign_review", label: "To campaign review" },
    { value: "in_campaign_review", label: "In campaign review" },
    { value: "in_campaign_review.request_change", label: "Request change (campaign)" },
    { value: "campaign_review.rejected", label: "Rejected (campaign)" },
    { value: "to_campaign", label: "To campaign" },
    { value: "in_campaign", label: "In campaign" },
    { value: "campaign.failed", label: "Failed (campaign)" },
    { value: "to_funding_review", label: "To funding review" },
    { value: "in_funding_review", label: "In funding review" },
    { value: "in_funding_review.request_change", label: "Request change (funding)" },
    { value: "funding_review.rejected", label: "Rejected (funding)" },
    { value: "to_funding", label: "To funding" },
    { value: "in_funding", label: "In funding" },
    { value: "funding.paid", label: "Funding paid" },
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
        suggest: suggestProjects,
    },
    subtitle: {
        key: "subtitle",
        type: "string",
        compatibleOperators: ["equals"],
        resources: ["projects"],
        suggest: suggestProjectsBySubtitle,
    },
    description: {
        key: "description",
        type: "string",
        compatibleOperators: ["equals"],
        resources: ["projects"],
        suggest: suggestProjectsByDescription,
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
        suggest: suggestCategories,
        allowsMultipleEquals: true,
    },
    owner: {
        key: "owner",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["projects"],
        suggest: suggestOwner,
        allowsMultipleEquals: true,
    },
    slug: {
        key: "slug",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["projects"],
        suggest: suggestProjectsBySlug,
        allowsMultipleEquals: true,
    },
    budgetAmount: {
        key: "budgetAmount",
        type: "money",
        compatibleOperators: ["gte", "gt", "lte", "lt"],
        resources: ["projects"],
    },
    gateway: {
        key: "gateway",
        param: "checkout.gateway",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["gateway_charges"],
        suggest: suggestGateways,
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
        suggest: suggestAccounting,
        allowsMultipleEquals: true,
        display: "accountingOwner",
    },
    origin: {
        key: "checkout.origin",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["gateway_charges"],
        suggest: suggestAccounting,
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
    dateCreated: {
        key: "dateCreated",
        type: "date",
        compatibleOperators: ["before", "after", "strictly_before", "strictly_after"],
        resources: ["projects", "gateway_charges", "users"],
    },
    dateUpdated: {
        key: "dateUpdated",
        type: "date",
        compatibleOperators: ["before", "after", "strictly_before", "strictly_after"],
        resources: ["projects", "gateway_charges", "users"],
    },
    handle: {
        key: "handle",
        type: "string",
        compatibleOperators: ["equals"],
        resources: ["users"],
        suggest: suggestUserHandle,
    },
    email: {
        key: "email",
        type: "string",
        compatibleOperators: ["equals"],
        resources: ["users"],
        suggest: suggestUserEmail,
    },
    userType: {
        key: "userType",
        param: "type",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["users"],
        options: [
            { value: "individual", label: "Individual" },
            { value: "organization", label: "Organización" },
        ],
        allowsMultipleEquals: true,
    },
    active: {
        key: "active",
        type: "string",
        compatibleOperators: ["equals"],
        resources: ["users"],
        options: [
            { value: "true", label: "Activo" },
            { value: "false", label: "Inactivo" },
        ],
    },
    userRoles: {
        key: "userRoles",
        param: "roles",
        type: "string",
        compatibleOperators: ["equals", "is_any_of"],
        resources: ["users"],
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
                    return { [key]: referent as string[] };
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
