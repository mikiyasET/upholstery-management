import { ScrollArea, Stack, Text, Box, UnstyledButton, Group, Badge, ActionIcon } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import {
  RiDashboard3Line,
  RiDashboard3Fill,
  RiShoppingBag3Line,
  RiShoppingBag3Fill,
  RiCarLine,
  RiCarFill,
  RiArchiveLine,
  RiArchiveFill,
  RiToolsLine,
  RiToolsFill,
  RiGroupLine,
  RiGroupFill,
  RiBarChartBoxLine,
  RiBarChartBoxFill,
  RiUserSettingsLine,
  RiUserSettingsFill,
  RiExchangeDollarLine,
  RiExchangeDollarFill,
  RiAlertLine,
  RiAlertFill,
  RiCloseLine,
  RiFileList3Line,
  RiFileList3Fill,
  RiSettings4Line,
  RiSettings4Fill,
} from "react-icons/ri";
import { useTranslation } from "react-i18next";
import { usePermission, type PermissionKey } from "../../lib/permissions";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";

interface NavItemDef {
  labelKey: string;
  defaultLabel: string;
  icon: React.ElementType;
  activeIcon: React.ElementType;
  path: string;
  permission?: PermissionKey;
  badge?: string | number;
  badgeColor?: string;
}

interface NavSection {
  titleKey: string;
  defaultTitle: string;
  items: NavItemDef[];
}

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const canViewStorage = usePermission("storage.view");
  const canViewMaterials = usePermission("catalog.materials.view");

  // Query low stock materials count for badge
  const { data: materials = [] } = useQuery({
    queryKey: ["materials-low-stock-count"],
    queryFn: async () => {
      const res = await api.get("/catalog/materials");
      return res.data;
    },
    enabled: canViewMaterials || canViewStorage,
    staleTime: 60 * 1000,
  });

  const lowStockCount = Array.isArray(materials)
    ? materials.filter((m: any) => {
        const miniStock = m.materialStocks?.find((s: any) => s.store?.type === "MINI");
        const mainStock = m.materialStocks?.find((s: any) => s.store?.type === "MAIN");
        const miniQty = miniStock ? Number(miniStock.quantity) : 0;
        const mainQty = mainStock ? Number(mainStock.quantity) : 0;
        const threshold = m.lowStockThreshold || 10;
        return miniQty <= threshold || mainQty <= threshold;
      }).length
    : 0;

  const navSections: NavSection[] = [
    {
      titleKey: "nav.overview",
      defaultTitle: "Overview",
      items: [
        {
          labelKey: "common.dashboard",
          defaultLabel: "Dashboard",
          icon: RiDashboard3Line,
          activeIcon: RiDashboard3Fill,
          path: "/",
        },
      ],
    },
    {
      titleKey: "nav.posAndOrders",
      defaultTitle: "Point of Sale & Workshop",
      items: [
        {
          labelKey: "orders.title",
          defaultLabel: "Work Orders",
          icon: RiCarLine,
          activeIcon: RiCarFill,
          path: "/orders",
          permission: "orders.view",
        },
        {
          labelKey: "directSales.title",
          defaultLabel: "Direct Sales (POS)",
          icon: RiShoppingBag3Line,
          activeIcon: RiShoppingBag3Fill,
          path: "/direct-sales",
          permission: "directSales.view",
        },
        {
          labelKey: "directSales.history",
          defaultLabel: "Sales History",
          icon: RiFileList3Line,
          activeIcon: RiFileList3Fill,
          path: "/direct-sales/history",
          permission: "directSales.history",
        },
      ],
    },
    {
      titleKey: "nav.inventoryAndStores",
      defaultTitle: "Inventory & Stores",
      items: [
        {
          labelKey: "storage.title",
          defaultLabel: "Dual Storage",
          icon: RiArchiveLine,
          activeIcon: RiArchiveFill,
          path: "/storage",
          permission: "storage.view",
        },
        {
          labelKey: "storage.lowStockAlerts",
          defaultLabel: "Low Stock Alerts",
          icon: RiAlertLine,
          activeIcon: RiAlertFill,
          path: "/storage/low-stock",
          permission: "storage.view",
          badge: lowStockCount > 0 ? lowStockCount : undefined,
          badgeColor: "red",
        },
        {
          labelKey: "materials.title",
          defaultLabel: "Materials Catalog",
          icon: RiExchangeDollarLine,
          activeIcon: RiExchangeDollarFill,
          path: "/materials",
          permission: "catalog.materials.view",
        },
        {
          labelKey: "services.title",
          defaultLabel: "Services Catalog",
          icon: RiToolsLine,
          activeIcon: RiToolsFill,
          path: "/services",
          permission: "catalog.services.view",
        },
        {
          labelKey: "cars.title",
          defaultLabel: "Vehicle Models",
          icon: RiCarLine,
          activeIcon: RiCarFill,
          path: "/cars",
          permission: "catalog.cars.view",
        },
      ],
    },
    {
      titleKey: "nav.management",
      defaultTitle: "Management",
      items: [
        {
          labelKey: "customers.title",
          defaultLabel: "Customers Directory",
          icon: RiGroupLine,
          activeIcon: RiGroupFill,
          path: "/customers",
          permission: "customers.view",
        },
        {
          labelKey: "users.title",
          defaultLabel: "Staff & Users",
          icon: RiUserSettingsLine,
          activeIcon: RiUserSettingsFill,
          path: "/users",
          permission: "users.view",
        },
        {
          labelKey: "reports.title",
          defaultLabel: "Reports & Analytics",
          icon: RiBarChartBoxLine,
          activeIcon: RiBarChartBoxFill,
          path: "/reports",
          permission: "reports.view",
        },
        {
          labelKey: "settings.title",
          defaultLabel: "Settings & Studio",
          icon: RiSettings4Line,
          activeIcon: RiSettings4Fill,
          path: "/settings",
        },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/direct-sales") return location.pathname === "/direct-sales";
    if (path === "/storage") return location.pathname === "/storage";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <Box
      className="glass-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        userSelect: "none",
      }}
    >
      {/* Mobile-only Header Row with Brand & Close Button */}
      <Box
        hiddenFrom="sm"
        px="md"
        py="sm"
        style={{
          borderBottom: "1px solid var(--surface-border)",
          backgroundColor: "var(--surface-card)",
          minHeight: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <UnstyledButton
          onClick={() => {
            navigate("/");
            onNavigate?.();
          }}
          style={{ textDecoration: "none" }}
        >
          <Group gap="xs" wrap="nowrap">
            <Box
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--brand-gradient)",
                color: "#FFFFFF",
                flexShrink: 0,
              }}
            >
              <RiCarLine size={20} />
            </Box>
            <Box>
              <Text fw={800} size="sm" style={{ letterSpacing: "-0.02em" }}>
                YONATAN
              </Text>
              <Text size="9px" fw={700} c="amber.5" style={{ textTransform: "uppercase" }}>
                POS & UPHOLSTERY
              </Text>
            </Box>
          </Group>
        </UnstyledButton>

        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={onNavigate}
          aria-label="Close sidebar"
        >
          <RiCloseLine size={20} />
        </ActionIcon>
      </Box>

      {/* Nav List */}
      <ScrollArea style={{ flex: 1 }} scrollbars="y" px="sm" py="md">
        <Stack gap="lg">
          {navSections.map((section) => {
            // Filter items by user permission
            const visibleItems = section.items.filter((item) => {
              if (!item.permission) return true;
              return usePermission(item.permission);
            });

            if (visibleItems.length === 0) return null;

            return (
              <Box key={section.defaultTitle}>
                <Text
                  size="10px"
                  fw={700}
                  c="dimmed"
                  tt="uppercase"
                  mb={6}
                  px="xs"
                  style={{ letterSpacing: "0.08em" }}
                >
                  {t(section.titleKey, section.defaultTitle)}
                </Text>

                <Stack gap={3}>
                  {visibleItems.map((item) => {
                    const active = isActive(item.path);
                    const Icon = active ? item.activeIcon : item.icon;

                    return (
                      <UnstyledButton
                        key={item.path}
                        className={`nav-item-btn ${active ? "active" : ""}`}
                        onClick={() => {
                          navigate(item.path);
                          onNavigate?.();
                        }}
                      >
                        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                          <Box
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 22,
                              height: 22,
                              flexShrink: 0,
                              color: active ? "var(--primary-accent)" : "inherit",
                            }}
                          >
                            <Icon size={19} />
                          </Box>
                          <Text
                            size="sm"
                            fw={active ? 600 : 500}
                            truncate
                            style={{ flex: 1 }}
                          >
                            {t(item.labelKey, item.defaultLabel)}
                          </Text>
                        </Group>

                        {item.badge !== undefined && (
                          <Badge
                            size="xs"
                            color={item.badgeColor || "amber"}
                            variant={active ? "filled" : "light"}
                            style={{ flexShrink: 0 }}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </UnstyledButton>
                    );
                  })}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </ScrollArea>
    </Box>
  );
}
