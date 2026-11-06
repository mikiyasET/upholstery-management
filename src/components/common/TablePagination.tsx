import { useMemo } from "react";
import { Group, Pagination, Select, Text, Box } from "@mantine/core";
import {
  FileText,
  Layers,
  CheckSquare,
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
  itemLabel = "records",
}: TablePaginationProps) {
  const calculatedTotalPages = totalPages ?? Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const paginationRange = useMemo(
    () => getPaginationRange(page, calculatedTotalPages),
    [page, calculatedTotalPages]
  );

  return (
    <Box className="table-pagination-bar">
      {/* Top/Left Metadata: Summary and Per-page selector */}
      <Box className="table-pagination-meta-row">
        {/* Explanatory records and page summary card */}
        <Box className="table-pagination-summary-card">
          {total === 0 ? (
            <Group gap={8} align="center">
              <Box className="table-pagination-icon-bubble">
                <Inbox size={14} />
              </Box>
              <Text size="xs" c="dimmed">
                No {itemLabel} to display
              </Text>
            </Group>
          ) : (
            <>
              <Box className="table-pagination-icon-bubble">
                <FileText size={14} />
              </Box>

              <Group gap={4} align="center" wrap="nowrap">
                <Text size="xs" fw={500} c="dimmed" visibleFrom="xs">
                  Showing
                </Text>
                <Text size="xs" fw={700} style={{ color: "var(--text-main)" }}>
                  {startItem.toLocaleString()} – {endItem.toLocaleString()}
                </Text>
                <Text size="xs" fw={500} c="dimmed">
                  of
                </Text>
                <Text size="xs" fw={700} style={{ color: "var(--text-main)" }}>
                  {total.toLocaleString()}
                </Text>
                <Text size="xs" fw={600} style={{ color: "var(--primary-accent, #F59E0B)" }} visibleFrom="xs">
                  {itemLabel}
                </Text>
              </Group>

              <Box className="table-pagination-divider" visibleFrom="sm" />

              <Box visibleFrom="sm">
                <Group gap={5} align="center" wrap="nowrap">
                  <Layers size={13} style={{ color: "var(--text-muted)" }} />
                  <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                    Page{" "}
                    <Text span fw={700} style={{ color: "var(--text-main)" }}>
                      {page}
                    </Text>{" "}
                    of{" "}
                    <Text span fw={700} style={{ color: "var(--text-main)" }}>
                      {calculatedTotalPages}
                    </Text>
                  </Text>
                </Group>
              </Box>
            </>
          )}
        </Box>

        {onPageSizeChange && (
          <Group gap={6} align="center" className="table-pagination-per-page-group">
            <CheckSquare size={15} style={{ color: "var(--text-muted)" }} />
            <Text size="xs" fw={500} c="dimmed" visibleFrom="xs" style={{ whiteSpace: "nowrap" }}>
              Rows:
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

      {/* Page navigation controls */}
      <Box className="table-pagination-controls">
        <Pagination.Root
          total={calculatedTotalPages}
          value={page}
          onChange={onPageChange}
          size="sm"
          radius="md"
          color="amber"
          disabled={disabled || total === 0}
        >
          <Group gap={4} align="center" wrap="nowrap" justify="center">
            <Box visibleFrom="sm">
              <Pagination.First
                icon={() => <ChevronsLeft size={15} />}
                aria-label="First page"
                className="table-page-btn table-page-edge-btn"
                disabled={disabled || page <= 1 || total === 0}
                onClick={() => onPageChange(1)}
              />
            </Box>
            <Pagination.Previous
              icon={() => <ChevronLeft size={15} />}
              aria-label="Previous page"
              className="table-page-btn"
              disabled={disabled || page <= 1 || total === 0}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            />

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

            <Pagination.Next
              icon={() => <ChevronRight size={15} />}
              aria-label="Next page"
              className="table-page-btn"
              disabled={disabled || page >= calculatedTotalPages || total === 0}
              onClick={() => onPageChange(Math.min(calculatedTotalPages, page + 1))}
            />
            <Box visibleFrom="sm">
              <Pagination.Last
                icon={() => <ChevronsRight size={15} />}
                aria-label="Last page"
                className="table-page-btn table-page-edge-btn"
                disabled={disabled || page >= calculatedTotalPages || total === 0}
                onClick={() => onPageChange(calculatedTotalPages)}
              />
            </Box>
          </Group>
        </Pagination.Root>
      </Box>
    </Box>
  );
}

export default TablePagination;
