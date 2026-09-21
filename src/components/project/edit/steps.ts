import BudgetStep from "./BudgetStep.svelte";
import CampaignInfoStep from "./CampaignInfoStep.svelte";
import CollaborationsStep from "./CollaborationsStep.svelte";
import ConfigurationStep from "./ConfigurationStep.svelte";
import RewardsStep from "./RewardsStep.svelte";

import type { Component } from "svelte";

export type ProjectEditorStep = {
    id: string;
    // Steps declare different prop shapes (project required/optional, onContinue,
    // onPublish), so the array is only typed as "some Svelte component".
    component: Component<any>;
};

/**
 * `astro check` and `svelte-check` model an imported `.svelte` module with
 * different types — Astro wraps it as `(props) => any`, Svelte types it as
 * `Component<Props>` — so no single annotation satisfies both tools. The cast
 * is confined here so consumers still see one shared component type.
 */
function toStep(id: string, component: unknown): ProjectEditorStep {
    return { id, component: component as Component<any> };
}

export const steps: ProjectEditorStep[] = [
    toStep("1", ConfigurationStep),
    toStep("2", CampaignInfoStep),
    toStep("3", RewardsStep),
    toStep("4", CollaborationsStep),
    toStep("5", BudgetStep),
    // toStep("6", OwnerInfoStep),
];

export function getStepComponent(id: string): Component<any> {
    const step = steps.find((s) => s.id === id) || steps[0];

    return step.component;
}
