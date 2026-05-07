import { getPaginationMeta } from "./offset";
import { PaginatedResult } from "./types";

/**
 * Creates a paginated response wrapper.
 *
 * @param data - Array of items
 * @param page - Current page
 * @param limit - Items per page
 * @param total - Total items count
 * @returns Paginated result object
 */
export function createPaginatedResult<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
): PaginatedResult<T> {
    return {
        data,
        meta: getPaginationMeta(page, limit, total),
    };
}

/**
 * Calculates the valid page range for a given total.
 *
 * @param total - Total number of items
 * @param limit - Items per page
 * @returns Object with first and last valid page numbers
 */
export function getPageRange(
    total: number,
    limit: number
): { firstPage: number; lastPage: number } {
    const totalPages = Math.ceil(total / limit);
    return {
        firstPage: 1,
        lastPage: Math.max(1, totalPages),
    };
}

/**
 * Validates if a page number is within valid range.
 *
 * @param page - Page number to validate
 * @param total - Total number of items
 * @param limit - Items per page
 * @returns True if page is valid
 */
export function isValidPage(
    page: number,
    total: number,
    limit: number
): boolean {
    const { lastPage } = getPageRange(total, limit);
    return page >= 1 && page <= lastPage;
}

/**
 * Generates page numbers for pagination UI.
 *
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param maxVisible - Maximum visible page numbers
 * @returns Array of page numbers to display
 */
export function generatePageNumbers(
    currentPage: number,
    totalPages: number,
    maxVisible: number = 5
): (number | "ellipsis")[] {
    if (totalPages <= maxVisible) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [];
    const halfVisible = Math.floor(maxVisible / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);

    // Adjust if we're near the beginning
    if (currentPage <= halfVisible) {
        endPage = Math.min(totalPages, maxVisible - 1);
    }

    // Adjust if we're near the end
    if (currentPage > totalPages - halfVisible) {
        startPage = Math.max(1, totalPages - maxVisible + 2);
    }

    // Always show first page
    if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
            pages.push("ellipsis");
        }
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    // Always show last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pages.push("ellipsis");
        }
        pages.push(totalPages);
    }

    return pages;
}