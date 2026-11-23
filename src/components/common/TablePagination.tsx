import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Group, Pagination, Select, Text, Box } from "@mantine/core";
import {
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Inbox,
} from "lucide-react";

export interface TablePaginationProps {
  page: number;
  total: number;
  pageSize: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: string[];
  disabled?: boolean;
  itemLabel?: string;
}

/**
 * Calculates pagination numbers with ellipsis according to UX specs:
 * - When at start (e.g. page 1 of 10): 1, 2, ..., 9, 10
 * - When in middle (e.g. page 6 of 10): 1, ..., 5, 6, 7, ..., 10
 * - When at end (e.g. page 10 of 10): 1, 2, ..., 9, 10
 */
export function getPaginationRange(current: number, total: number): (number | "dots")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // Page 1
  if (current === 1) {
    return [1, 2, "dots", total - 1, total];
  }

  // Page 2
  if (current === 2) {
    return [1, 2, 3, "dots", total - 1, total];
  }

  // Page 3
  if (current === 3) {
    return [1, 2, 3, 4, "dots", total];
  }

  // Page total
  if (current === total) {
    return [1, 2, "dots", total - 1, total];
  }

  // Page total - 1
  if (current === total - 1) {
    return [1, 2, "dots", total - 2, total - 1, total];
  }

  // Page total - 2
  if (current === total - 2) {
    return [1, "dots", total - 3, total - 2, total - 1, total];
  }

  // Middle pages (e.g. page 6 of 10: [1, "dots", 5, 6, 7, "dots", 10])
  return [1, "dots", current - 1, current, current + 1, "dots", total];
}

export function TablePagination({
  page,
  total,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = ["10", "25", "50", "100"],
  disabled = false,
  itemLabel,
}: TablePaginationProps) {
  const { t, i18n } = useTranslation();
  const calculatedTotalPages = totalPages ?? Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const resolvedItemLabel = itemLabel || t("common.records", "records");

  const paginationRange = useMemo(
    () => getPaginationRange(page, calculatedTotalPages),
    [page, calculatedTotalPages]
  );

  return (
    <Box className="table-pagination-bar">
      {/* Top/Left Metadata: Summary and Per-page selector */}
      <Box className="table-pagination-meta-row">
        {/* Explanatory records and page summary */}
        <Box className="table-pagination-summary-card">
          {total === 0 ? (
            <Group gap={8} align="center">
              <Box className="table-pagination-icon-bubble">
                <Inbox size={14} />
              </Box>
              <Text size="xs" c="dimmed">
                {t("common.noItemsToDisplay", "No {{item}} to display", { item: resolvedItemLabel })}
              </Text>
            </Group>
          ) : (
            <>
              <Box className="table-pagination-icon-bubble">
                <FileText size={14} />
              </Box>

              {i18n.language === "am" ? (
                <Group gap={4} align="center" wrap="nowrap" className="text-xs">
                  <Text size="xs" fw={700} style={{ color: "var(--text-main)" }}>
                    {startItem.toLocaleString()} – {endItem.toLocaleString()}
                  </Text>
                  <Text size="xs" fw={500} c="dimmed">
                    {t("common.of", "ከ")}
                  </Text>
                  <Text size="xs" fw={700} style={{ color: "var(--text-main)" }}>
                    {total.toLocaleString()}
                  </Text>
                  <Text size="xs" fw={600} style={{ color: "var(--primary-accent, #F59E0B)" }} visibleFrom="xs">
                    {resolvedItemLabel}
                  </Text>
                  <Text size="xs" fw={500} c="dimmed" visibleFrom="xs">
                    {t("common.showing", "በማሳየት ላይ")}
                  </Text>
                </Group>
              ) : (
                <Group gap={4} align="center" wrap="nowrap" className="text-xs">
                  <Text size="xs" fw={500} c="dimmed" visibleFrom="xs">
                    {t("common.showing", "Showing")}
                  </Text>
                  <Text size="xs" fw={700} style={{ color: "var(--text-main)" }}>
                    {startItem.toLocaleString()} – {endItem.toLocaleString()}
                  </Text>
                  <Text size="xs" fw={500} c="dimmed">
                    {t("common.of", "of")}
                  </Text>
                  <Text size="xs" fw={700} style={{ color: "var(--text-main)" }}>
                    {total.toLocaleString()}
                  </Text>
                  <Text size="xs" fw={600} style={{ color: "var(--primary-accent, #F59E0B)" }} visibleFrom="xs">
                    {resolvedItemLabel}
                  </Text>
                </Group>
              )}

              <Box className="table-pagination-page-pill" visibleFrom="sm">
                <Layers size={12} className="shrink-0" />
                <span>
                  {t("common.page", "Page")} <strong>{page}</strong> / <strong>{calculatedTotalPages}</strong>
                </span>
              </Box>
            </>
          )}
        </Box>

        {onPageSizeChange && (
          <Group gap={6} align="center" className="table-pagination-per-page-group">
            <Text size="xs" fw={500} c="dimmed" visibleFrom="xs" style={{ whiteSpace: "nowrap" }}>
              {t("common.rowsPerPage", "Rows per page")}:
            </Text>
            <Select
              size="xs"
              w={{ base: 64, sm: 72 }}
              radius="md"
              data={pageSizeOptions}
              value={String(pageSize)}
              onChange={(val) => {
                if (val) {
                  onPageSizeChange(Number(val));
                }
              }}
              disabled={disabled || total === 0}
              allowDeselect={false}
              comboboxProps={{ shadow: "md", transitionProps: { transition: "pop", duration: 150 } }}
            />
          </Group>
        )}
      </Box>

      {/* Page navigation controls (Bottom Tier covering full width by default) */}
      <Box className="table-pagination-controls">
        <Pagination.Root
          total={calculatedTotalPages}
          value={page}
          onChange={onPageChange}
          size="sm"
          radius="md"
          color="amber"
          disabled={disabled || total === 0}
          style={{ width: "100%" }}
        >
          <Group justify="space-between" align="center" wrap="nowrap" style={{ width: "100%" }}>
            {/* Left anchor: Previous page */}
            <Group gap={6} align="center" wrap="nowrap">
              <Box className="table-page-edge-btn">
                <Pagination.First
                  icon={() => <ChevronsLeft size={16} />}
                  aria-label={t("common.firstPage", "First page")}
                  className="table-page-btn"
                  disabled={disabled || page <= 1 || total === 0}
                  onClick={() => onPageChange(1)}
                />
              </Box>
              <Pagination.Previous
                icon={() => (
                  <Group gap={5} wrap="nowrap" align="center">
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline text-xs font-semibold">{t("common.previousPage", "Previous")}</span>
                  </Group>
                )}
                aria-label={t("common.previousPage", "Previous page")}
                className="table-page-btn table-page-nav-btn"
                disabled={disabled || page <= 1 || total === 0}
                onClick={() => onPageChange(Math.max(1, page - 1))}
              />
            </Group>

            {/* Center anchor: Numeric page controls */}
            <Group gap={5} align="center" wrap="nowrap" justify="center" className="table-page-numbers-group">
              {paginationRange.map((item, idx) => {
                if (item === "dots") {
                  return (
                    <Pagination.Dots
                      key={`dots-${idx}`}
                      icon={() => <MoreHorizontal size={14} />}
                      className="table-page-dots"
                    />
                  );
                }
                const isActive = item === page;
                return (
                  <Pagination.Control
                    key={item}
                    active={isActive}
                    onClick={() => onPageChange(item)}
                    className={`table-page-btn ${isActive ? "table-page-btn-active" : ""}`}
                    disabled={disabled}
                  >
                    {item}
                  </Pagination.Control>
                );
              })}
            </Group>

            {/* Right anchor: Next page */}
            <Group gap={6} align="center" wrap="nowrap">
              <Pagination.Next
                icon={() => (
                  <Group gap={5} wrap="nowrap" align="center">
                    <span className="hidden sm:inline text-xs font-semibold">{t("common.nextPage", "Next")}</span>
                    <ChevronRight size={16} />
                  </Group>
                )}
                aria-label={t("common.nextPage", "Next page")}
                className="table-page-btn table-page-nav-btn"
                disabled={disabled || page >= calculatedTotalPages || total === 0}
                onClick={() => onPageChange(Math.min(calculatedTotalPages, page + 1))}
              />
              <Box className="table-page-edge-btn">
                <Pagination.Last
                  icon={() => <ChevronsRight size={16} />}
                  aria-label={t("common.lastPage", "Last page")}
                  className="table-page-btn"
                  disabled={disabled || page >= calculatedTotalPages || total === 0}
                  onClick={() => onPageChange(calculatedTotalPages)}
                />
              </Box>
            </Group>
          </Group>
        </Pagination.Root>
      </Box>
    </Box>
  );
}

export default TablePagination;
