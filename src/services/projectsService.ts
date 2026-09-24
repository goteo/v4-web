import { apiProjectsGetCollection } from "../openapi/client/sdk.gen";
import { constrainToPublicStatuses } from "../utils/projectStatus";

import type { AuthError } from "../openapi/api";
import type { Project } from "../openapi/client/types.gen";
import type { SearchFilters } from "../stores/searchStore";
import { get } from "svelte/store";
import { locale } from "../i18n/store";

/**
 * Simple service wrapper for project API calls
 * Based on OpenAPI client documentation
 */
export class ProjectsService {
    /**
     * Search projects with filters and pagination
     * Returns raw Project[] from API
     */
    async searchProjects(
        filters: SearchFilters,
        options?: {
            page?: number;
            limit?: number;
            abortSignal?: AbortSignal;
        },
    ): Promise<{
        projects: Project[];
        totalCount: number;
        hasNextPage: boolean;
    }> {
        try {
            const { status, "status[]": statuses, ...restFilters } = filters ?? {};
            const response = await apiProjectsGetCollection({
                query: {
                    ...restFilters,
                    "status[]": constrainToPublicStatuses([
                        ...(statuses ?? []),
                        ...(status ? [status] : []),
                    ]),
                    page: options?.page || 1,
                    itemsPerPage: options?.limit || 20,
                },
                headers: { "Accept-Language": get(locale) },
                ...(options?.abortSignal && { signal: options.abortSignal }),
            });

            // According to OpenAPI types, response.data is Array<Project>
            const projects = (response.data as Project[]) || [];
            const limit = options?.limit || 20;

            // Infer hasNextPage: if we got exactly the requested amount, there might be more
            const hasNextPage = projects.length === limit;

            // Without Hydra metadata, we can only use the current page count
            // Multiply by current page to give a rough estimate
            const totalCount = hasNextPage
                ? projects.length * (options?.page || 1) + 1 // At least one more page
                : projects.length * (options?.page || 1);

            return {
                projects,
                totalCount,
                hasNextPage,
            };
        } catch (error) {
            // Re-throw aborted requests as-is so callers can detect cancellation.
            // The fetch client may not preserve the DOMException name, so also
            // check the signal directly.
            if (
                options?.abortSignal?.aborted ||
                (error instanceof Error && error.name === "AbortError")
            ) {
                throw new DOMException("Aborted", "AbortError");
            }

            // Re-throw auth errors as-is for component handling
            if (error && typeof error === "object" && "type" in error) {
                throw error as AuthError;
            }

            // Wrap other errors with context
            if (error instanceof Error) {
                throw new Error(`Project search failed: ${error.message}`, { cause: error });
            }

            throw new Error("Project search failed", { cause: error });
        }
    }

    /**
     * Get initial projects for SSR
     * Returns empty array on error
     */
    async getInitialProjects(
        locale: string,
        options?: {
            limit?: number;
            abortSignal?: AbortSignal;
        },
    ): Promise<Project[]> {
        try {
            const response = await apiProjectsGetCollection({
                query: {
                    page: 1,
                    itemsPerPage: options?.limit || 12,
                },
                headers: {
                    "Accept-Language": locale,
                },
                ...(options?.abortSignal && { signal: options.abortSignal }),
            });

            return response.data || [];
        } catch {
            return [];
        }
    }

    /**
     * Helper: Check if there are more pages
     * API doesn't return pagination metadata, so we infer from results
     */
    hasNextPage(projects: Project[], limit: number): boolean {
        return projects.length === limit;
    }
}

// Export singleton instance
export const projectsService = new ProjectsService();
