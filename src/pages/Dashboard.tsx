import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { 
  formatCurrency, 
  formatStatus, 
  formatDashboardBannerDate, 
  formatShortDate,
  formatPaymentMethod,
  formatUnit 
} from "../lib/utils";
import { usePermission } from "../lib/permissions";
import { useAuthStore } from "../store/authStore";
import {
  Box,
  SimpleGrid,
  Text,
  Title,
  Group,
  Stack,
  Table,
  Badge,
  Button,
  Tabs,
  ActionIcon,
  Tooltip,
  ThemeIcon,
} from "@mantine/core";
import {
  Car,
  ShoppingBag,
  CheckCheck,
  AlertTriangle,
  ArrowRight,
  Wrench,
  ShieldCheck,
  Archive,
  Calendar,
  RotateCw,
  Eye,
  Printer,
  DollarSign,
  Phone,
} from "lucide-react";
import { printOrderReceipt } from "../lib/receipt-printer";
import { ExecutiveAddButton, TablePagination, PlateBadge } from "../components/common";
import { DailyRevenueChart } from "../components/dashboard/DailyRevenueChart";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<string | null>("bay");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [bayPage, setBayPage] = useState(1);
  const [bayPageSize, setBayPageSize] = useState(5);
  const [salesPage, setSalesPage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(5);
  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState(5);

  const canViewOrders = usePermission("orders.view");
  const canViewMaterials = usePermission("catalog.materials.view");
  const canViewDirectSales = usePermission("directSales.view");
  const canCreateOrder = usePermission("orders.create");
  const canCreateDirectSale = usePermission("directSales.create");
  const canViewReports = usePermission("reports.view");
  const canViewRevenueChart = canViewOrders || canViewDirectSales || canViewReports;

  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["active-orders"],
    queryFn: async () => {
      const res = await api.get("/orders");
      return res.data;
    },
    enabled: canViewOrders,
  });

  const { data: materials = [], refetch: refetchMaterials } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const res = await api.get("/catalog/materials");
      return res.data;
    },
    enabled: canViewMaterials,
  });

  const { data: directSales = [], refetch: refetchDirectSales } = useQuery({
    queryKey: ["direct-sales-today"],
    queryFn: async () => {
      const res = await api.get("/direct-sales");
      return res.data;
    },
    enabled: canViewDirectSales,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchOrders(),
      refetchMaterials(),
      refetchDirectSales(),
    ]);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const getLocName = (item: any) =>
    i18n.language === "am" && item?.nameAm ? item.nameAm : item?.nameEn || item?.name || "";

  const activeOrders = Array.isArray(orders)
    ? orders.filter((o: any) => o.status === "WAITING" || o.status === "IN_PROGRESS" || o.orderStatus === "IN_PROGRESS" || o.orderStatus === "OPEN")
    : [];
  const deliveredOrders = Array.isArray(orders)
    ? orders.filter((o: any) => o.status === "DELIVERED" || o.orderStatus === "DELIVERED")
    : [];

  const lowStockMaterials = Array.isArray(materials)
    ? materials.filter((m: any) => {
        const miniStock = m.materialStocks?.find((s: any) => s.store?.type === "MINI");
        const mainStock = m.materialStocks?.find((s: any) => s.store?.type === "MAIN");
        const miniQty = miniStock ? Number(miniStock.quantity) : 0;
        const mainQty = mainStock ? Number(mainStock.quantity) : 0;
        const threshold = m.lowStockThreshold || 10;
        return miniQty <= threshold || mainQty <= threshold;
      })
    : [];

  // Calculate direct sales revenue
  const directSalesTotalRevenue = Array.isArray(directSales)
    ? directSales.reduce((acc: number, s: any) => acc + Number(s.totalPrice || s.subTotal || 0), 0)
    : 0;

  const bayTotalPages = Math.max(1, Math.ceil(activeOrders.length / bayPageSize));
  const paginatedBayOrders = activeOrders.slice((bayPage - 1) * bayPageSize, bayPage * bayPageSize);

  const salesTotalPages = Math.max(1, Math.ceil(directSales.length / salesPageSize));
  const paginatedSales = directSales.slice((salesPage - 1) * salesPageSize, salesPage * salesPageSize);

  const invTotalPages = Math.max(1, Math.ceil(lowStockMaterials.length / invPageSize));
  const paginatedInv = lowStockMaterials.slice((invPage - 1) * invPageSize, invPage * invPageSize);

  return (
    <Stack gap="xl" pb="xl" className="animate-in fade-in duration-300">
      {/* 1. Executive Hero Header (Exporter-Docs style) */}
      <Box mb="xs">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <Box>
            <Group gap="xs" align="center" mb={4}>
              <Title order={2} style={{ letterSpacing: "-0.02em", fontWeight: 800 }}>
                {t("dashboard.welcome", "Welcome back")}, {user?.name || t("dashboard.operationsTeam", "Operations Team")}
              </Title>
              <span style={{ fontSize: "1.4rem" }}>🚗</span>
            </Group>
            <Group gap="sm" mt={4} wrap="wrap" align="center">
              <Group gap={4} align="center">
                <Calendar size={13} style={{ color: "var(--primary-accent)" }} />
                <Text size="xs" fw={600} style={{ color: "var(--text-main)" }}>
                  {formatDashboardBannerDate(new Date(), i18n.language)}
                </Text>
              </Group>
              <Text size="xs" c="dimmed" style={{ opacity: 0.4 }}>
                •
              </Text>
              <Group gap={6} align="center">
                <span
                  className="pulse-dot"
                  style={{
                    backgroundColor: "var(--status-success, #10b981)",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    display: "inline-block",
                  }}
                />
                <Text size="xs" c="dimmed">
                  {t("dashboard.liveSystem", "Live Workshop & POS System")}
                </Text>
              </Group>
            </Group>
          </Box>

          {/* Quick Action Toolbar on the Right */}
          <Group gap="xs" wrap="wrap" align="center">
            <Tooltip label={t("dashboard.refresh", "Refresh dashboard")} withArrow>
              <ActionIcon
                variant="subtle"
                color="amber"
                size="lg"
                radius="md"
                loading={isRefreshing}
                onClick={handleRefresh}
                aria-label={t("dashboard.refresh", "Refresh dashboard")}
              >
                <RotateCw size={18} />
              </ActionIcon>
            </Tooltip>

            {canCreateDirectSale && (
              <Button
                variant="default"
                radius="md"
                leftSection={<ShoppingBag size={16} />}
                onClick={() => navigate("/direct-sales")}
                style={{
                  height: 36,
                  fontWeight: 600,
                  fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                }}
              >
                {t("dashboard.directSale", "Direct Sale POS")}
              </Button>
            )}

            {canCreateOrder && (
              <ExecutiveAddButton
                label={t("dashboard.newOrder", "New Work Order")}
                to="/orders/new"
              />
            )}
          </Group>
        </Group>
      </Box>

      {/* 2. Top Metric KPI Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Active Work Orders */}
        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {t("dashboard.activeOrders", "Active Bay Orders")}
              </Text>
              <Text fw={700} size="1.45rem" lh={1.1} mt={4} style={{ letterSpacing: "-0.02em" }}>
                {canViewOrders ? activeOrders.length : "—"}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: "rgba(245, 158, 11, 0.12)",
                color: "var(--primary-accent)",
              }}
            >
              <Car size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" wrap="nowrap" style={{ borderTop: "1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))" }}>
            <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
              <span className="pulse-dot" style={{ backgroundColor: "#f59e0b", width: 5, height: 5 }} />
              <Text size="11px" fw={600} style={{ color: "var(--primary-accent)", whiteSpace: "nowrap" }}>
                {t("dashboard.workshopActive", "Workshop active")}
              </Text>
            </Group>
            <Text size="11px" c="dimmed" truncate style={{ whiteSpace: "nowrap", flexShrink: 1 }}>
              {t("dashboard.liveTailoringJobs", "Live tailoring jobs")}
            </Text>
          </Group>
        </Box>

        {/* Direct Sales POS */}
        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {t("dashboard.directSale", "Direct Sales POS")}
              </Text>
              <Text fw={700} size="1.45rem" lh={1.1} mt={4} style={{ letterSpacing: "-0.02em" }}>
                {canViewDirectSales ? directSales.length : "—"}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: "rgba(59, 130, 246, 0.12)",
                color: "#3b82f6",
              }}
            >
              <ShoppingBag size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" wrap="nowrap" style={{ borderTop: "1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))" }}>
            <Text size="11px" fw={600} style={{ color: "#3b82f6", whiteSpace: "nowrap", flexShrink: 0 }}>
              {formatCurrency(directSalesTotalRevenue, i18n.language as any)}
            </Text>
            <Text size="11px" c="dimmed" truncate style={{ whiteSpace: "nowrap", flexShrink: 1 }}>
              {t("dashboard.counterSales", "Counter sales")}
            </Text>
          </Group>
        </Box>

        {/* Low Stock Alerts */}
        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {t("dashboard.lowStock", "Low Stock Alerts")}
              </Text>
              <Text
                fw={700}
                size="1.45rem"
                lh={1.1}
                mt={4}
                style={{
                  letterSpacing: "-0.02em",
                  color: lowStockMaterials.length > 0 ? "var(--status-danger, #ef4444)" : "inherit",
                }}
              >
                {canViewMaterials ? lowStockMaterials.length : "—"}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: lowStockMaterials.length > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                color: lowStockMaterials.length > 0 ? "#ef4444" : "#10b981",
              }}
            >
              <AlertTriangle size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" wrap="nowrap" style={{ borderTop: "1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))" }}>
            <Text
              size="11px"
              fw={600}
              style={{
                color: lowStockMaterials.length > 0 ? "#ef4444" : "#10b981",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {lowStockMaterials.length > 0 ? t("dashboard.requiresRestock", "Requires restock") : t("dashboard.optimalStock", "Optimal stock")}
            </Text>
            <Text size="11px" c="dimmed" truncate style={{ whiteSpace: "nowrap", flexShrink: 1 }}>
              {t("dashboard.miniStoreBuffer", "Mini store buffer")}
            </Text>
          </Group>
        </Box>

        {/* Completed Deliveries */}
        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {t("dashboard.delivered", "Completed Orders")}
              </Text>
              <Text fw={700} size="1.45rem" lh={1.1} mt={4} style={{ letterSpacing: "-0.02em" }}>
                {canViewOrders ? deliveredOrders.length : "—"}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
              }}
            >
              <CheckCheck size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" wrap="nowrap" style={{ borderTop: "1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))" }}>
            <Text size="11px" fw={600} style={{ color: "#10b981", whiteSpace: "nowrap", flexShrink: 0 }}>
              {t("dashboard.handedOver", "100% Handed over")}
            </Text>
            <Text size="11px" c="dimmed" truncate style={{ whiteSpace: "nowrap", flexShrink: 1 }}>
              {t("dashboard.clientCleared", "Client cleared")}
            </Text>
          </Group>
        </Box>
      </SimpleGrid>

      {/* 3. Executive Daily Total Revenue & Orders Pre-Aggregated Chart */}
      {canViewRevenueChart && (
        <DailyRevenueChart isRefreshing={isRefreshing} />
      )}

      {/* 4. Multi-View Operations Hub with Tabs */}
      <Box className="premium-card" p="md">
        <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
          <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
            <Tabs.List style={{ gap: 8 }}>
              <Tabs.Tab value="bay" leftSection={<Wrench size={16} />}>
                {t("dashboard.tabs.bay", "Workshop Bay Jobs")} ({activeOrders.length})
              </Tabs.Tab>
              <Tabs.Tab value="sales" leftSection={<ShoppingBag size={16} />}>
                {t("dashboard.tabs.sales", "Direct POS Sales")} ({directSales.length})
              </Tabs.Tab>
              <Tabs.Tab value="stock" leftSection={<Archive size={16} />}>
                {t("dashboard.tabs.stock", "Stock Alerts")} ({lowStockMaterials.length})
              </Tabs.Tab>
            </Tabs.List>

            <Button
              component={Link}
              to={activeTab === "sales" ? "/direct-sales/history" : activeTab === "stock" ? "/storage/low-stock" : "/orders"}
              variant="subtle"
              color="amber"
              size="xs"
              rightSection={<ArrowRight size={14} />}
            >
              {t("dashboard.viewAll", "View all records")}
            </Button>
          </Group>

          {/* TAB 1: WORKSHOP BAY JOBS */}
          <Tabs.Panel value="bay">
            {!canViewOrders ? (
              <Box py="xl" style={{ textAlign: "center" }}>
                <ThemeIcon size={44} radius="xl" color="gray" variant="light" mb="xs">
                  <ShieldCheck size={24} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  {t("dashboard.accessRestricted", "Access restricted for this section.")}
                </Text>
              </Box>
            ) : activeOrders.length === 0 ? (
              <Box py="xl" style={{ textAlign: "center" }}>
                <Text size="sm" c="dimmed">
                  {t("dashboard.noActiveOrders", "No active work orders right now.")}
                </Text>
              </Box>
            ) : (
              <>
                <Table.ScrollContainer minWidth={600}>
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t("dashboard.table.orderNumber", "Order #")}</Table.Th>
                        <Table.Th>{t("dashboard.table.plateVehicle", "Plate / Vehicle")}</Table.Th>
                        <Table.Th>{t("dashboard.table.customer", "Customer")}</Table.Th>
                        <Table.Th>{t("dashboard.table.status", "Status")}</Table.Th>
                        <Table.Th style={{ textAlign: "right" }}>{t("dashboard.table.actions", "Actions")}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {paginatedBayOrders.map((order: any) => {
                        const vehicleModel = [order.vehicle?.carModel?.brand?.name, order.vehicle?.carModel?.name].filter(Boolean).join(" ");

                        return (
                          <Table.Tr key={order.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/orders/${order.id}`)}>
                            <Table.Td>
                              <Text fw={700} size="sm" style={{ color: "var(--primary-accent)" }}>
                                {order.orderNumber}
                              </Text>
                              <Text size="11px" c="dimmed">
                                {formatShortDate(order.orderDateTime, true, i18n.language)}
                              </Text>
                            </Table.Td>

                            <Table.Td>
                              <PlateBadge plate={order.vehicle?.plateNumber} size="xs" />
                              <Text size="11px" c="dimmed" mt={1}>
                                {vehicleModel || t("dashboard.table.vehicle", "Vehicle")}
                              </Text>
                            </Table.Td>

                            <Table.Td>
                              <Text size="sm" fw={600}>
                                {order.customer?.name || t("dashboard.table.walkIn", "Walk-in")}
                              </Text>
                              {order.customer?.phoneNumber && (
                                <Group gap={4} align="center">
                                  <Phone size={11} color="var(--text-muted)" />
                                  <Text size="11px" c="dimmed">
                                    {order.customer.phoneNumber}
                                  </Text>
                                </Group>
                              )}
                            </Table.Td>

                            <Table.Td>
                              <Badge
                                color={
                                  (order.status || order.orderStatus) === "IN_PROGRESS"
                                    ? "amber"
                                    : (order.status || order.orderStatus) === "DELIVERED"
                                    ? "green"
                                    : "blue"
                                }
                                variant="light"
                                size="sm"
                              >
                                {formatStatus(order.status || order.orderStatus || "OPEN", i18n.language as any)}
                              </Badge>
                            </Table.Td>

                            <Table.Td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                              <Group gap={6} justify="flex-end" wrap="nowrap">
                                <Tooltip label={t("dashboard.tooltips.viewOrder", "View Order Detail")} withArrow>
                                  <ActionIcon
                                    variant="subtle"
                                    color="amber"
                                    size="sm"
                                    onClick={() => navigate(`/orders/${order.id}`)}
                                  >
                                    <Eye size={16} />
                                  </ActionIcon>
                                </Tooltip>

                                <Tooltip label={t("dashboard.tooltips.printInvoice", "Print Invoice")} withArrow>
                                  <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    onClick={() => printOrderReceipt(order)}
                                  >
                                    <Printer size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>

                <TablePagination
                  page={bayPage}
                  pageSize={bayPageSize}
                  total={activeOrders.length}
                  totalPages={bayTotalPages}
                  onPageChange={setBayPage}
                  onPageSizeChange={(newSize) => {
                    setBayPageSize(newSize);
                    setBayPage(1);
                  }}
                  pageSizeOptions={["5", "10", "20"]}
                  itemLabel={t("dashboard.pagination.activeOrders", "active orders")}
                />
              </>
            )}
          </Tabs.Panel>

          {/* TAB 2: DIRECT POS SALES */}
          <Tabs.Panel value="sales">
            {directSales.length === 0 ? (
              <Box py="xl" style={{ textAlign: "center" }}>
                <Text size="sm" c="dimmed">
                  {t("dashboard.noSalesToday", "No direct counter sales recorded today.")}
                </Text>
              </Box>
            ) : (
              <>
                <Table.ScrollContainer minWidth={600}>
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t("dashboard.table.transactionNumber", "Transaction #")}</Table.Th>
                        <Table.Th>{t("dashboard.table.dateTime", "Date & Time")}</Table.Th>
                        <Table.Th>{t("dashboard.table.customer", "Customer")}</Table.Th>
                        <Table.Th>{t("dashboard.table.totalAmount", "Total Amount")}</Table.Th>
                        <Table.Th>{t("dashboard.table.paymentMethod", "Payment Method")}</Table.Th>
                        <Table.Th style={{ textAlign: "right" }}>{t("dashboard.table.actions", "Actions")}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {paginatedSales.map((sale: any) => (
                        <Table.Tr key={sale.id}>
                          <Table.Td>
                            <Text fw={700} size="sm" style={{ color: "var(--primary-accent)" }}>
                              {sale.invoiceNumber || sale.id?.slice(0, 8)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs">
                              {formatShortDate(sale.createdAt || sale.date || sale.saleDateTime, true, i18n.language)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {sale.customerName || sale.customer?.name || t("dashboard.table.walkInRetailClient", "Walk-in Retail Client")}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={700} size="sm">
                              {formatCurrency(sale.totalPrice || sale.netTotal || 0, i18n.language as any)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" color="blue" size="sm">
                              {formatPaymentMethod(sale.paymentMethod || "CASH", i18n.language as any)}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Group gap={6} justify="flex-end" wrap="nowrap">
                              <Tooltip label={t("dashboard.tooltips.viewHistory", "View History")} withArrow>
                                <ActionIcon
                                  variant="subtle"
                                  color="amber"
                                  size="sm"
                                  onClick={() => navigate("/direct-sales/history")}
                                >
                                  <Eye size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>

                <TablePagination
                  page={salesPage}
                  pageSize={salesPageSize}
                  total={directSales.length}
                  totalPages={salesTotalPages}
                  onPageChange={setSalesPage}
                  onPageSizeChange={(newSize) => {
                    setSalesPageSize(newSize);
                    setSalesPage(1);
                  }}
                  pageSizeOptions={["5", "10", "20"]}
                  itemLabel={t("dashboard.pagination.sales", "sales")}
                />
              </>
            )}
          </Tabs.Panel>

          {/* TAB 3: STOCK ALERTS */}
          <Tabs.Panel value="stock">
            {lowStockMaterials.length === 0 ? (
              <Box py="xl" style={{ textAlign: "center" }}>
                <ThemeIcon size={44} radius="xl" color="green" variant="light" mb="xs">
                  <CheckCheck size={24} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  {t("dashboard.allMaterialsOptimal", "All workshop fabrics and materials are currently above threshold levels.")}
                </Text>
              </Box>
            ) : (
              <>
                <Table.ScrollContainer minWidth={600}>
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t("dashboard.table.material", "Material")}</Table.Th>
                        <Table.Th>{t("dashboard.table.miniStore", "Mini Store (Floor)")}</Table.Th>
                        <Table.Th>{t("dashboard.table.mainWarehouse", "Main Warehouse")}</Table.Th>
                        <Table.Th>{t("dashboard.table.threshold", "Threshold")}</Table.Th>
                        <Table.Th style={{ textAlign: "right" }}>{t("dashboard.table.action", "Action")}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {paginatedInv.map((mat: any) => {
                        const miniStock = mat.materialStocks?.find((s: any) => s.store?.type === "MINI");
                        const mainStock = mat.materialStocks?.find((s: any) => s.store?.type === "MAIN");
                        const miniQty = miniStock ? Number(miniStock.quantity) : 0;
                        const mainQty = mainStock ? Number(mainStock.quantity) : 0;
                        const threshold = mat.lowStockThreshold || 10;

                        return (
                          <Table.Tr key={mat.id}>
                            <Table.Td>
                              <Text fw={600} size="sm">
                                {getLocName(mat)}
                              </Text>
                              <Text size="11px" c="dimmed">
                                {t("dashboard.table.unit", "Unit")}: {formatUnit(mat.unit || "Meter", i18n.language as any)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={miniQty <= threshold ? "red" : "gray"} variant="light">
                                {miniQty} {formatUnit(mat.unit, i18n.language as any)}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" fw={600}>
                                {mainQty} {formatUnit(mat.unit, i18n.language as any)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="xs" c="dimmed">
                                {threshold} {formatUnit(mat.unit, i18n.language as any)}
                              </Text>
                            </Table.Td>
                            <Table.Td style={{ textAlign: "right" }}>
                              <Button
                                size="xs"
                                variant="light"
                                color="amber"
                                leftSection={<DollarSign size={14} />}
                                onClick={() => navigate("/storage")}
                              >
                                {t("dashboard.transfer", "Transfer")}
                              </Button>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>

                <TablePagination
                  page={invPage}
                  pageSize={invPageSize}
                  total={lowStockMaterials.length}
                  totalPages={invTotalPages}
                  onPageChange={setInvPage}
                  onPageSizeChange={(newSize) => {
                    setInvPageSize(newSize);
                    setInvPage(1);
                  }}
                  pageSizeOptions={["5", "10", "20"]}
                  itemLabel={t("dashboard.pagination.materials", "materials")}
                />
              </>
            )}
          </Tabs.Panel>
        </Tabs>
      </Box>
    </Stack>
  );
}
