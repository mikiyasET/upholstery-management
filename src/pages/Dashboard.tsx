import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { formatCurrency, formatStatus } from "../lib/utils";
import { formatPlateNumber } from "../utils/plate";
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
  RiCarLine,
  RiShoppingBag3Line,
  RiCheckDoubleLine,
  RiAlertLine,
  RiAddLine,
  RiArrowRightLine,
  RiToolsLine,
  RiShieldCheckLine,
  RiArchiveLine,
  RiCalendarEventLine,
  RiRefreshLine,
  RiEyeLine,
  RiPrinterLine,
  RiExchangeDollarLine,
  RiPhoneLine,
} from "react-icons/ri";
import { printOrderReceipt } from "../lib/receipt-printer";
import dayjs from "dayjs";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<string | null>("bay");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const canViewOrders = usePermission("orders.view");
  const canViewMaterials = usePermission("catalog.materials.view");
  const canViewDirectSales = usePermission("directSales.view");
  const canCreateOrder = usePermission("orders.create");
  const canCreateDirectSale = usePermission("directSales.create");

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
    i18n.language === "am" && item?.nameAm ? item.nameAm : item?.name || item?.nameEn || "";

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

  return (
    <Stack gap="xl" pb="xl" className="animate-in fade-in duration-300">
      {/* 1. Executive Hero Header (Exporter-Docs style) */}
      <Box mb="xs">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <Box>
            <Group gap="xs" align="center" mb={4}>
              <Title order={2} style={{ letterSpacing: "-0.02em", fontWeight: 800 }}>
                Welcome back, {user?.name || "Operations Team"}
              </Title>
              <span style={{ fontSize: "1.4rem" }}>🚗</span>
            </Group>
            <Group gap="sm" mt={4} wrap="wrap" align="center">
              <Group gap={4} align="center">
                <RiCalendarEventLine size={13} style={{ color: "var(--primary-accent)" }} />
                <Text size="xs" fw={600} style={{ color: "var(--text-main)" }}>
                  {dayjs().format("dddd, MMMM D, YYYY")}
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
                  Live Workshop & POS System
                </Text>
              </Group>
            </Group>
          </Box>

          {/* Quick Action Toolbar on the Right */}
          <Group gap="xs" wrap="wrap" align="center">
            <Tooltip label="Refresh dashboard" withArrow>
              <ActionIcon
                variant="subtle"
                color="amber"
                size="lg"
                radius="md"
                loading={isRefreshing}
                onClick={handleRefresh}
                aria-label="Refresh dashboard"
              >
                <RiRefreshLine size={18} />
              </ActionIcon>
            </Tooltip>

            {canCreateDirectSale && (
              <Button
                variant="default"
                radius="md"
                size="sm"
                leftSection={<RiShoppingBag3Line size={16} />}
                onClick={() => navigate("/direct-sales")}
              >
                {t("dashboard.directSale", "Direct Sale POS")}
              </Button>
            )}

            {canCreateOrder && (
              <Button
                variant="gradient"
                gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                radius="md"
                size="sm"
                leftSection={<RiAddLine size={18} />}
                onClick={() => navigate("/orders/new")}
                style={{
                  boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
                  fontWeight: 600,
                }}
              >
                {t("dashboard.newOrder", "New Work Order")}
              </Button>
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
                background: "rgba(245, 158, 11, 0.12)",
                color: "var(--primary-accent)",
              }}
            >
              <RiCarLine size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: "1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))" }}>
            <Group gap={4}>
              <span className="pulse-dot" style={{ backgroundColor: "#f59e0b", width: 5, height: 5 }} />
              <Text size="11px" fw={600} style={{ color: "var(--primary-accent)" }}>
                Workshop active
              </Text>
            </Group>
            <Text size="11px" c="dimmed">
              Live tailoring jobs
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
                background: "rgba(59, 130, 246, 0.12)",
                color: "#3b82f6",
              }}
            >
              <RiShoppingBag3Line size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: "1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))" }}>
            <Text size="11px" fw={600} style={{ color: "#3b82f6" }}>
              {formatCurrency(directSalesTotalRevenue)}
            </Text>
            <Text size="11px" c="dimmed">
              Counter sales
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
                background: lowStockMaterials.length > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                color: lowStockMaterials.length > 0 ? "#ef4444" : "#10b981",
              }}
            >
              <RiAlertLine size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: "1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))" }}>
            <Text
              size="11px"
              fw={600}
              style={{
                color: lowStockMaterials.length > 0 ? "#ef4444" : "#10b981",
              }}
            >
              {lowStockMaterials.length > 0 ? "Requires restock" : "Optimal stock"}
            </Text>
            <Text size="11px" c="dimmed">
              Mini store buffer
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
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
              }}
            >
              <RiCheckDoubleLine size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: "1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))" }}>
            <Text size="11px" fw={600} style={{ color: "#10b981" }}>
              100% Handed over
            </Text>
            <Text size="11px" c="dimmed">
              Client cleared
            </Text>
          </Group>
        </Box>
      </SimpleGrid>

      {/* 3. Multi-View Operations Hub with Tabs */}
      <Box className="premium-card" p="md">
        <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
          <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
            <Tabs.List style={{ gap: 8 }}>
              <Tabs.Tab value="bay" leftSection={<RiToolsLine size={16} />}>
                Workshop Bay Jobs ({activeOrders.length})
              </Tabs.Tab>
              <Tabs.Tab value="sales" leftSection={<RiShoppingBag3Line size={16} />}>
                Direct POS Sales ({directSales.length})
              </Tabs.Tab>
              <Tabs.Tab value="stock" leftSection={<RiArchiveLine size={16} />}>
                Stock Alerts ({lowStockMaterials.length})
              </Tabs.Tab>
            </Tabs.List>

            <Button
              component={Link}
              to={activeTab === "sales" ? "/direct-sales/history" : activeTab === "stock" ? "/storage/low-stock" : "/orders"}
              variant="subtle"
              color="amber"
              size="xs"
              rightSection={<RiArrowRightLine size={14} />}
            >
              {t("dashboard.viewAll", "View all records")}
            </Button>
          </Group>

          {/* TAB 1: WORKSHOP BAY JOBS */}
          <Tabs.Panel value="bay">
            {!canViewOrders ? (
              <Box py="xl" style={{ textAlign: "center" }}>
                <ThemeIcon size={44} radius="xl" color="gray" variant="light" mb="xs">
                  <RiShieldCheckLine size={24} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  Access restricted for this section.
                </Text>
              </Box>
            ) : activeOrders.length === 0 ? (
              <Box py="xl" style={{ textAlign: "center" }}>
                <Text size="sm" c="dimmed">
                  {t("dashboard.noActiveOrders", "No active work orders right now.")}
                </Text>
              </Box>
            ) : (
              <Table.ScrollContainer minWidth={600}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Order #</Table.Th>
                      <Table.Th>Plate / Vehicle</Table.Th>
                      <Table.Th>Customer</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {activeOrders.slice(0, 8).map((order: any) => {
                      const plate = order.vehicle?.plateNumber ? formatPlateNumber(order.vehicle.plateNumber) : "—";
                      const vehicleModel = [order.vehicle?.carModel?.brand?.name, order.vehicle?.carModel?.name].filter(Boolean).join(" ");

                      return (
                        <Table.Tr key={order.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/orders/${order.id}`)}>
                          <Table.Td>
                            <Text fw={700} size="sm" style={{ color: "var(--primary-accent)" }}>
                              {order.orderNumber}
                            </Text>
                            <Text size="11px" c="dimmed">
                              {dayjs(order.orderDateTime).format("MMM D, HH:mm")}
                            </Text>
                          </Table.Td>

                          <Table.Td>
                            <Badge variant="light" color="amber" size="sm" mb={2}>
                              {plate}
                            </Badge>
                            <Text size="11px" c="dimmed">
                              {vehicleModel || "Vehicle"}
                            </Text>
                          </Table.Td>

                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {order.customer?.name || "Walk-in"}
                            </Text>
                            {order.customer?.phoneNumber && (
                              <Group gap={4} align="center">
                                <RiPhoneLine size={11} color="var(--text-muted)" />
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
                              {formatStatus(order.status || order.orderStatus || "OPEN")}
                            </Badge>
                          </Table.Td>

                          <Table.Td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                            <Group gap={6} justify="flex-end" wrap="nowrap">
                              <Tooltip label="View Order Detail" withArrow>
                                <ActionIcon
                                  variant="subtle"
                                  color="amber"
                                  size="sm"
                                  onClick={() => navigate(`/orders/${order.id}`)}
                                >
                                  <RiEyeLine size={16} />
                                </ActionIcon>
                              </Tooltip>

                              <Tooltip label="Print Invoice" withArrow>
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  onClick={() => printOrderReceipt(order)}
                                >
                                  <RiPrinterLine size={16} />
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
            )}
          </Tabs.Panel>

          {/* TAB 2: DIRECT POS SALES */}
          <Tabs.Panel value="sales">
            {directSales.length === 0 ? (
              <Box py="xl" style={{ textAlign: "center" }}>
                <Text size="sm" c="dimmed">
                  No direct counter sales recorded today.
                </Text>
              </Box>
            ) : (
              <Table.ScrollContainer minWidth={600}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Transaction #</Table.Th>
                      <Table.Th>Date & Time</Table.Th>
                      <Table.Th>Customer</Table.Th>
                      <Table.Th>Total Amount</Table.Th>
                      <Table.Th>Payment Method</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {directSales.slice(0, 8).map((sale: any) => (
                      <Table.Tr key={sale.id}>
                        <Table.Td>
                          <Text fw={700} size="sm" style={{ color: "var(--primary-accent)" }}>
                            {sale.invoiceNumber || sale.id?.slice(0, 8)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">
                            {dayjs(sale.createdAt || sale.date).format("MMM D, HH:mm")}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {sale.customerName || sale.customer?.name || "Walk-in Retail Client"}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={700} size="sm">
                            {formatCurrency(sale.totalPrice || sale.netTotal || 0)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="blue" size="sm">
                            {sale.paymentMethod || "CASH"}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "right" }}>
                          <Group gap={6} justify="flex-end" wrap="nowrap">
                            <Tooltip label="View History" withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="amber"
                                size="sm"
                                onClick={() => navigate("/direct-sales/history")}
                              >
                                <RiEyeLine size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Tabs.Panel>

          {/* TAB 3: STOCK ALERTS */}
          <Tabs.Panel value="stock">
            {lowStockMaterials.length === 0 ? (
              <Box py="xl" style={{ textAlign: "center" }}>
                <ThemeIcon size={44} radius="xl" color="green" variant="light" mb="xs">
                  <RiCheckDoubleLine size={24} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  All workshop fabrics and materials are currently above threshold levels.
                </Text>
              </Box>
            ) : (
              <Table.ScrollContainer minWidth={600}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Material</Table.Th>
                      <Table.Th>Mini Store (Floor)</Table.Th>
                      <Table.Th>Main Warehouse</Table.Th>
                      <Table.Th>Threshold</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>Action</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {lowStockMaterials.slice(0, 8).map((mat: any) => {
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
                              Unit: {mat.unit || "Meter"}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={miniQty <= threshold ? "red" : "gray"} variant="light">
                              {miniQty} {mat.unit}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {mainQty} {mat.unit}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {threshold} {mat.unit}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Button
                              size="xs"
                              variant="light"
                              color="amber"
                              leftSection={<RiExchangeDollarLine size={14} />}
                              onClick={() => navigate("/storage")}
                            >
                              Transfer
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Tabs.Panel>
        </Tabs>
      </Box>
    </Stack>
  );
}
