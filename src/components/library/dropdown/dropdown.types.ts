export type DropdownVariant = "basic" | "multiselect";

export type DropdownOption = {
    id: string;
    label: string;
    selected: boolean;
    /** Original entity, for callers that need to render a richer row (e.g. users). */
    raw?: unknown;
};
