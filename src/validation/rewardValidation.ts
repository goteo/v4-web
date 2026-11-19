import {
    zApiProjectRewardsIdPatchBody,
    zApiProjectRewardsPostBody,
} from "../openapi/client/zod.gen";

import type { z } from "zod";

function requireTexts(data: { title: string; description?: string | null }, ctx: z.RefinementCtx) {
    if (!data.title.trim()) {
        ctx.addIssue({
            code: "custom",
            path: ["title"],
            message: "system.validation.requiredField",
        });
    }

    if (!data.description?.trim()) {
        ctx.addIssue({
            code: "custom",
            path: ["description"],
            message: "system.validation.requiredField",
        });
    }
}

export const zCreateRewardForm = zApiProjectRewardsPostBody.superRefine(requireTexts);

export const zUpdateRewardForm = zApiProjectRewardsIdPatchBody
    .omit({ dateCreated: true, dateUpdated: true })
    .superRefine(requireTexts);
