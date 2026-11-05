import {
    apiProjectBudgetItemsGetCollection,
    apiProjectBudgetItemsIdDelete,
    apiProjectBudgetItemsIdPatch,
    apiProjectBudgetItemsPost,
    apiProjectCollaborationsGetCollection,
    apiProjectCollaborationsIdDelete,
    apiProjectCollaborationsIdPatch,
    apiProjectCollaborationsPost,
    apiProjectRewardsGetCollection,
    apiProjectRewardsIdDelete,
    apiProjectRewardsIdPatch,
    apiProjectRewardsPost,
    apiProjectsIdPatch,
} from "../openapi/client";

import type { Session } from "../auth/types";
import type {
    ProjectReward,
    ProjectCollaboration,
    ProjectBudgetItem,
    ProjectProjectUpdationDtoJsonMergePatch,
} from "../openapi/client";
import type { ProjectDraftResources } from "../stores/drafts/projectDraft";

export async function patchProject(
    projectId: string,
    body: ProjectProjectUpdationDtoJsonMergePatch,
    session: Session,
) {
    return apiProjectsIdPatch({
        path: { id: projectId },
        body,
        headers: session.token.asHttpHeaders,
    });
}

export async function createReward(reward: ProjectReward, session: Session) {
    return apiProjectRewardsPost({
        body: reward,
        headers: session.token.asHttpHeaders,
    });
}

export async function updateReward(reward: ProjectReward, session: Session) {
    if (!reward.id) {
        throw new Error("Cannot update reward without id");
    }

    return apiProjectRewardsIdPatch({
        path: { id: String(reward.id) },
        body: reward,
        headers: session.token.asHttpHeaders,
    });
}

export async function deleteReward(rewardId: number, session: Session) {
    return apiProjectRewardsIdDelete({
        path: { id: String(rewardId) },
        headers: session.token.asHttpHeaders,
    });
}

export async function createCollaboration(collab: ProjectCollaboration, session: Session) {
    return apiProjectCollaborationsPost({
        body: {
            ...collab,
            isFulfilled: false,
        },
        headers: session.token.asHttpHeaders,
    });
}

export async function updateCollaboration(collab: ProjectCollaboration, session: Session) {
    if (!collab.id) {
        throw new Error("Cannot update collaboration without id");
    }

    return apiProjectCollaborationsIdPatch({
        path: { id: String(collab.id) },
        body: collab,
        headers: session.token.asHttpHeaders,
    });
}

export async function deleteCollaboration(collabId: number, session: Session) {
    return apiProjectCollaborationsIdDelete({
        path: { id: String(collabId) },
        headers: session.token.asHttpHeaders,
    });
}

export async function createBudgetItem(item: ProjectBudgetItem, session: Session) {
    return apiProjectBudgetItemsPost({
        body: item,
        headers: session.token.asHttpHeaders,
    });
}

export async function updateBudgetItem(item: ProjectBudgetItem, session: Session) {
    if (!item.id) {
        throw new Error("Cannot update budget item without id");
    }

    return apiProjectBudgetItemsIdPatch({
        path: { id: String(item.id) },
        body: item,
        headers: session.token.asHttpHeaders,
    });
}

export async function deleteBudgetItem(itemId: number, session: Session) {
    return apiProjectBudgetItemsIdDelete({
        path: { id: String(itemId) },
        headers: session.token.asHttpHeaders,
    });
}

export async function getProjectDraftResources(
    projectIri: string,
    session: Session,
): Promise<ProjectDraftResources> {
    const [rewardsResult, collaborationsResult, budgetItemsResult] = await Promise.all([
        apiProjectRewardsGetCollection({
            query: { project: projectIri, itemsPerPage: 100 },
            headers: session.token.asHttpHeaders,
        }),
        apiProjectCollaborationsGetCollection({
            query: { project: projectIri, itemsPerPage: 100 },
            headers: session.token.asHttpHeaders,
        }),
        apiProjectBudgetItemsGetCollection({
            query: { project: projectIri, itemsPerPage: 100 },
            headers: session.token.asHttpHeaders,
        }),
    ]);

    if (rewardsResult.error) throw rewardsResult.error;
    if (collaborationsResult.error) throw collaborationsResult.error;
    if (budgetItemsResult.error) throw budgetItemsResult.error;

    const budgetItems = budgetItemsResult.data ?? [];

    return {
        rewards: rewardsResult.data ?? [],
        collaborations: collaborationsResult.data ?? [],
        budgetItems: {
            minimum: budgetItems.filter((item) => item.deadline === "minimum"),
            optimum: budgetItems.filter((item) => item.deadline === "optimum"),
        },
    };
}
