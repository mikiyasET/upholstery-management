import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { formatStatus } from "../lib/utils";
import { parsePlateNumber } from "../utils/plate";
import { usePermission } from "../lib/permissions";
import { StatCard } from "../components/common/StatCard";
import {
  Box,
  Grid,
  Paper,
  Text,
  Title,
  Group,
  Stack,
  Table,
  Badge,
  Button,
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
} from "react-icons/ri";

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const canViewOrders = usePermission("orders.view");
  const canViewMaterials = usePermission("catalog.materials.view");
  const canViewDirectSales = usePermission("directSales.view");
  const canCreateOrder = usePermission("orders.create");
  const canCreateDirectSale = usePermission("directSales.create");

  const { data: orders = [] } = useQuery({
    queryKey: ["active-orders"],
    queryFn: async () => {
      const res = await api.get("/orders");
      return res.data;
    },
    enabled: canViewOrders,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const res = await api.get("/catalog/materials");
      return res.data;
    },
    enabled: canViewMaterials,
  });

  const { data: directSales = [] } = useQuery({
    queryKey: ["direct-sales-today"],
    queryFn: async () => {
      const res = await api.get("/direct-sales");
      return res.data;
    },
    enabled: canViewDirectSales,
  });

  const activeOrders = Array.isArray(orders)
    ? orders.filter((o: any) => o.status === "WAITING" || o.status === "IN_PROGRESS")
    : [];
  const deliveredOrders = Array.isArray(orders)
    ? orders.filter((o: any) => o.status === "DELIVERED")
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

  return (
    <Stack gap="xl">
      {/* Top Hero Banner */}
      <Paper
        p={{ base: "md", sm: "xl" }}
        radius="lg"
        style={{
          background: "var(--brand-gradient-subtle)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Box>
            <Title order={2} style={{ letterSpacing: "-0.03em" }}>
              {t("common.dashboard", "Operations Dashboard")}
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              {t(
                "dashboard.welcome",
                "Real-time overview of active work orders, shop floor stock, and point-of-sale activities."
              )}
            </Text>
          </Box>

          <Group gap="xs">
            {canCreateOrder && (
              <Button
                variant="gradient"
                gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                leftSection={<RiAddLine size={16} />}
                onClick={() => navigate("/orders/new")}
              >
                {t("dashboard.newOrder", "New Work Order")}
              </Button>
            )}
            {canCreateDirectSale && (
              <Button
                variant="default"
                leftSection={<RiShoppingBag3Line size={16} />}
                onClick={() => navigate("/direct-sales")}
              >
                {t("dashboard.directSale", "Direct Sale POS")}
              </Button>
            )}
          </Group>
        </Group>
      </Paper>

      {/* Metric Stat Cards */}
      <Grid gap="md">
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <StatCard
            title={t("dashboard.activeOrders", "Active Work Orders")}
            value={canViewOrders ? activeOrders.length : "-"}
            subtitle={t("dashboard.currentlyInProgress", "Currently in workshop bay")}
            icon={<RiCarLine size={22} />}
            iconColor="amber"
            badge="Live Bay"
            badgeColor="amber"
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <StatCard
            title={t("dashboard.delivered", "Completed Orders")}
            value={canViewOrders ? deliveredOrders.length : "-"}
            subtitle={t("dashboard.completedTotal", "Successfully delivered")}
            icon={<RiCheckDoubleLine size={22} />}
            iconColor="green"
            badge="Finished"
            badgeColor="green"
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <StatCard
            title={t("dashboard.lowStock", "Low Stock Alerts")}
            value={canViewMaterials ? lowStockMaterials.length : "-"}
            subtitle={t("dashboard.itemsInMiniStore", "Materials requiring transfer")}
            icon={<RiAlertLine size={22} />}
            iconColor="red"
            badge={lowStockMaterials.length > 0 ? "Needs Restock" : "Optimal"}
            badgeColor={lowStockMaterials.length > 0 ? "red" : "green"}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <StatCard
            title={t("dashboard.directSale", "Direct Sales (POS)")}
            value={canViewDirectSales ? directSales.length : "-"}
            subtitle={t("dashboard.overTheCounter", "Over-the-counter transactions")}
            icon={<RiShoppingBag3Line size={22} />}
            iconColor="blue"
            badge="Counter"
            badgeColor="blue"
          />
        </Grid.Col>
      </Grid>

      {/* Split Activity Tables */}
      <Grid gap="lg">
        {/* Left Column: Active Bay Work Orders */}
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Paper className="premium-card" p="md" radius="lg">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <ThemeIcon size={34} radius="md" color="amber" variant="light">
                  <RiToolsLine size={18} />
                </ThemeIcon>
                <Box>
                  <Text fw={700} size="sm">
                    {t("dashboard.currentBayActivity", "Workshop Bay Activity")}
                  </Text>
                  <Text size="xs" c="dimmed">
                    In-progress tailoring and modification jobs
                  </Text>
                </Box>
              </Group>

              {canViewOrders && (
                <Button
                  component={Link}
                  to="/orders"
                  variant="subtle"
                  size="xs"
                  rightSection={<RiArrowRightLine size={14} />}
                >
                  {t("dashboard.viewAll", "View all")}
                </Button>
              )}
            </Group>

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
              <Table.ScrollContainer minWidth={450}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Plate / Vehicle</Table.Th>
                      <Table.Th>Customer</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>Action</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {activeOrders.slice(0, 5).map((order: any) => {
                      const plate = parsePlateNumber(order.vehicle?.plateNumber);
                      return (
                        <Table.Tr key={order.id}>
                          <Table.Td>
                            <Group gap="xs">
                              <Badge size="sm" variant="default" radius="sm">
                                {plate?.serial || order.vehicle?.plateNumber || "N/A"}
                              </Badge>
                              <Text size="xs" fw={500}>
                                {order.vehicle?.brand?.name} {order.vehicle?.model?.name}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" fw={600}>
                              {order.customer?.firstName} {order.customer?.lastName}
                            </Text>
                            <Text size="10px" c="dimmed">
                              {order.customer?.phone}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              size="xs"
                              color={order.status === "WAITING" ? "amber" : "blue"}
                              variant="light"
                            >
                              {formatStatus(order.status)}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Button
                              component={Link}
                              to={`/orders/${order.id}`}
                              size="compact-xs"
                              variant="light"
                              color="amber"
                            >
                              View
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Paper>
        </Grid.Col>

        {/* Right Column: Inventory Low Stock Alerts */}
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Paper className="premium-card" p="md" radius="lg">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <ThemeIcon size={34} radius="md" color="red" variant="light">
                  <RiAlertLine size={18} />
                </ThemeIcon>
                <Box>
                  <Text fw={700} size="sm">
                    {t("storage.lowStockAlerts", "Low Stock Attention")}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Materials at or below threshold
                  </Text>
                </Box>
              </Group>

              {canViewMaterials && (
                <Button
                  component={Link}
                  to="/storage/low-stock"
                  variant="subtle"
                  size="xs"
                  color="red"
                  rightSection={<RiArrowRightLine size={14} />}
                >
                  {t("dashboard.viewAll", "View all")}
                </Button>
              )}
            </Group>

            {lowStockMaterials.length === 0 ? (
              <Box py="xl" style={{ textAlign: "center" }}>
                <ThemeIcon size={44} radius="xl" color="green" variant="light" mb="xs">
                  <RiArchiveLine size={24} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  All materials are adequately stocked across stores.
                </Text>
              </Box>
            ) : (
              <Table.ScrollContainer minWidth={320}>
                <Table verticalSpacing="xs" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Material</Table.Th>
                      <Table.Th style={{ textAlign: "center" }}>Mini Store</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>Action</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {lowStockMaterials.slice(0, 5).map((mat: any) => {
                      const mini = mat.materialStocks?.find((s: any) => s.store?.type === "MINI");
                      const qty = mini ? Number(mini.quantity) : 0;
                      return (
                        <Table.Tr key={mat.id}>
                          <Table.Td>
                            <Text size="xs" fw={600} truncate maw={180}>
                              {mat.name}
                            </Text>
                            <Text size="10px" c="dimmed">
                              Min: {mat.lowStockThreshold || 10}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "center" }}>
                            <Badge size="xs" color="red" variant="filled">
                              {qty}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Button
                              component={Link}
                              to="/storage"
                              size="compact-xs"
                              variant="default"
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
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
