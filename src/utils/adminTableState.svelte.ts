import {
    ADMIN_ITEMS_PER_PAGE_COOKIE,
    getInitialItemsPerPage,
    isValidItemsPerPage,
    type AdminItemsPerPage,
} from "./adminTable";
import { setCookie } from "./cookies";

export function useAdminTableState<T extends string>(
    initialSort: T,
    cookie = ADMIN_ITEMS_PER_PAGE_COOKIE,
) {
    let currentPage = $state(1);
    let itemsPerPage = $state<AdminItemsPerPage>(getInitialItemsPerPage(cookie));
    let selectedSort = $state<T>(initialSort);
    let isLoading = $state(false);
    let isFirstLoad = $state(true);
    let totalItems = $state(0);

    return {
        get currentPage() {
            return currentPage;
        },
        set currentPage(v: number) {
            currentPage = v;
        },
        get itemsPerPage() {
            return itemsPerPage;
        },
        set itemsPerPage(v: AdminItemsPerPage) {
            itemsPerPage = v;
        },
        get selectedSort() {
            return selectedSort;
        },
        set selectedSort(v: T) {
            selectedSort = v;
        },
        get isLoading() {
            return isLoading;
        },
        set isLoading(v: boolean) {
            isLoading = v;
        },
        get isFirstLoad() {
            return isFirstLoad;
        },
        set isFirstLoad(v: boolean) {
            isFirstLoad = v;
        },
        get totalItems() {
            return totalItems;
        },
        set totalItems(v: number) {
            totalItems = v;
        },
        handlePageChange(page: number) {
            currentPage = page;
        },
        handleItemsPerPageChange(perPage: number) {
            if (isValidItemsPerPage(perPage)) {
                itemsPerPage = perPage;
                setCookie(cookie, String(perPage));
                currentPage = 1;
            }
        },
        handleSortChange(sort: T) {
            selectedSort = sort;
            currentPage = 1;
        },
    };
}
