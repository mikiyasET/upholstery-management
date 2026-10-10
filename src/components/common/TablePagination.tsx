import { Group, Pagination, Select, Text, Box } from "@mantine/core";
import { RiFileList3Line } from "react-icons/ri";

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

  return (
    <Box className="table-pagination-bar">
      {/* Top/Left Metadata: Summary and Per-page selector */}
      <Box className="table-pagination-meta-row">
        <Box className="table-pagination-summary-card">
          <Group gap={8} align="center">
            <RiFileList3Line size={16} color="var(--primary-accent)" />
            <Text size="xs" c="dimmed">
              Showing <Text span fw={700} c="var(--text-main)">{startItem}-{endItem}</Text> of <Text span fw={700} c="var(--text-main)">{total}</Text> {itemLabel}
            </Text>
          </Group>
        </Box>

        {onPageSizeChange && (
          <Group gap={6} align="center">
            <Text size="xs" c="dimmed">Rows:</Text>
            <Select
              size="xs"
              w={76}
              data={pageSizeOptions}
              value={String(pageSize)}
              onChange={(val) => val && onPageSizeChange(Number(val))}
              disabled={disabled}
              comboboxProps={{ withinPortal: true }}
            />
          </Group>
        )}
      </Box>

      {/* Pagination Controls */}
      <Pagination
        value={page}
        onChange={onPageChange}
        total={calculatedTotalPages}
        size="sm"
        radius="md"
        color="amber"
        disabled={disabled || calculatedTotalPages <= 1}
      />
    </Box>
  );
}

export default TablePagination;
