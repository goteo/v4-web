import {
    createBudgetItem,
    createCollaboration,
    createReward,
    deleteBudgetItem,
    deleteCollaboration,
    deleteReward,
    patchProject,
    updateBudgetItem,
    updateCollaboration,
    updateReward,
} from "./projectSubmissionApi";
import { richTextToMarkdown } from "./richText";
import { validateDraftToPublish } from "../stores/drafts/draftValidation";

import type { Session } from "../auth/types";
import type {
    ProjectBudgetItem,
    ProjectCollaboration,
    ProjectProjectUpdationDtoJsonMergePatch,
    ProjectReward,
} from "../openapi/client";
import type { Draft, ProjectDraftResources } from "../stores/drafts/projectDraft";

export class PublishValidationError extends Error {
    constructor(public errors: Record<string, string>) {
        super("Draft validation failed");
    }
}

function getIds<T extends { id?: number }>(items: T[]) {
    return new Set(items.flatMap((item) => (item.id ? [item.id] : [])));
}

function flattenBudgetItems(resources: ProjectDraftResources["budgetItems"]) {
    return [...resources.minimum, ...resources.optimum];
}

async function assertResult<T>(result: { data?: T; error?: unknown }) {
    if (result.error) throw result.error;
    return result.data;
}

async function syncRewards(current: ProjectReward[], snapshot: ProjectReward[], session: Session) {
    const currentIds = getIds(current);
    const deleted = snapshot.filter((reward) => reward.id && !currentIds.has(reward.id));

    await Promise.all(
        deleted.map(async (reward) => {
            const result = await deleteReward(reward.id!, session);
            await assertResult(result);
        }),
    );

    const synced = await Promise.all(
        current.map(async (reward) => {
            const result = reward.id
                ? await updateReward(reward, session)
                : await createReward(reward, session);

            return assertResult(result);
        }),
    );

    return synced.filter(Boolean) as ProjectReward[];
}

async function syncCollaborations(
    current: ProjectCollaboration[],
    snapshot: ProjectCollaboration[],
    session: Session,
) {
    const currentIds = getIds(current);
    const deleted = snapshot.filter((collab) => collab.id && !currentIds.has(collab.id));

    await Promise.all(
        deleted.map(async (collab) => {
            const result = await deleteCollaboration(collab.id!, session);
            await assertResult(result);
        }),
    );

    const synced = await Promise.all(
        current.map(async (collab) => {
            const result = collab.id
                ? await updateCollaboration(collab, session)
                : await createCollaboration(collab, session);

            return assertResult(result);
        }),
    );

    return synced.filter(Boolean) as ProjectCollaboration[];
}

async function syncBudgetItems(
    current: ProjectDraftResources["budgetItems"],
    snapshot: ProjectDraftResources["budgetItems"],
    session: Session,
) {
    const currentItems = flattenBudgetItems(current);
    const snapshotItems = flattenBudgetItems(snapshot);
    const currentIds = getIds(currentItems);
    const deleted = snapshotItems.filter((item) => item.id && !currentIds.has(item.id));

    await Promise.all(
        deleted.map(async (item) => {
            const result = await deleteBudgetItem(item.id!, session);
            await assertResult(result);
        }),
    );

    const synced = await Promise.all(
        currentItems.map(async (item) => {
            const result = item.id
                ? await updateBudgetItem(item, session)
                : await createBudgetItem(item, session);

            return assertResult(result);
        }),
    );

    const syncedItems = synced.filter(Boolean) as ProjectBudgetItem[];

    return {
        minimum: syncedItems.filter((item) => item.deadline === "minimum"),
        optimum: syncedItems.filter((item) => item.deadline === "optimum"),
    };
}

export async function publishDraft(draft: Draft, session: Session, projectId: string) {
    const validationErrors = validateDraftToPublish(draft);

    if (Object.keys(validationErrors).length > 0) {
        throw new PublishValidationError(validationErrors);
    }

    const wizard = draft.wizardForm;
    const apiSnapshot = draft.apiSnapshot ?? {
        rewards: [],
        collaborations: [],
        budgetItems: {
            minimum: [],
            optimum: [],
        },
    };

    const firstImage = wizard.campaignInfo.images[0];

    const result = await patchProject(
        projectId,
        {
            title: draft.createProject.title,
            subtitle: draft.createProject.subtitle,
            categories: draft.createProject.categories,
            video: wizard.campaignInfo.video,
            descBrief: richTextToMarkdown(wizard.campaignInfo.brief),
            descAbout: richTextToMarkdown(wizard.campaignInfo.about),
            descGoal: richTextToMarkdown(wizard.campaignInfo.goal),
            descTeam: richTextToMarkdown(wizard.campaignInfo.team),
            deadline: wizard.configuration.deadline,
            territory: draft.createProject.territory,
            cover: firstImage?.url ?? "",
        } as ProjectProjectUpdationDtoJsonMergePatch & { cover?: string },
        session,
    );

    if (result.error) {
        throw result.error;
    }

    const [rewards, collaborations, budgetItems] = await Promise.all([
        syncRewards(wizard.rewards, apiSnapshot.rewards, session),
        syncCollaborations(wizard.collaborations, apiSnapshot.collaborations, session),
        syncBudgetItems(wizard.budgetItems, apiSnapshot.budgetItems, session),
    ]);

    return {
        project: result.data,
        resources: {
            rewards,
            collaborations,
            budgetItems,
        },
    };
}
