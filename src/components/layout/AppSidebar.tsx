import { ScrollArea, Stack, Text, Box, UnstyledButton, Group, Badge, ActionIcon } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Car,
  Archive,
  Wrench,
  Users,
  BarChart3,
  UserCog,
  Package,
  AlertTriangle,
  Boxes,
  X,
  FileText,
  Settings,
  History,
  ArrowUpRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { checkPermission, type PermissionKey } from "../../lib/permissions";
import { useAuthStore } from "../../store/authStore";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { BrandLogo } from "../common";
import logoWhite from "../../assets/logo-white.svg";
import logoBlack from "../../assets/logo-black.svg";

interface NavItemDef {
  labelKey: string;
  defaultLabel: string;
  icon: React.ElementType;
  activeIcon: React.ElementType;
  path: string;
  permission?: PermissionKey | PermissionKey[];
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
  const user = useAuthStore((s) => s.user);

  const canViewStorage = checkPermission(user?.permissions, user?.role || "", "storage.view");
  const canViewMaterials = checkPermission(user?.permissions, user?.role || "", "catalog.materials.view");
  const canViewAssets = checkPermission(user?.permissions, user?.role || "", "assets.view");

  // Query trash summary for Assets badge alert
  const { data: trashSummary } = useQuery<{ trashCount: number; earliestPurgeAt: string | null }>({
    queryKey: ["assets-trash-summary"],
    queryFn: async () => {
      const res = await api.get("/assets/trash-summary");
      return res.data;
    },
    enabled: canViewAssets,
    staleTime: 60 * 1000,
  });

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
          icon: LayoutDashboard,
          activeIcon: LayoutDashboard,
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
          icon: Car,
          activeIcon: Car,
          path: "/orders",
          permission: "orders.view",
        },
        {
          labelKey: "directSales.title",
          defaultLabel: "Direct Sales (POS)",
          icon: ShoppingBag,
          activeIcon: ShoppingBag,
          path: "/direct-sales",
          permission: "directSales.view",
        },
        {
          labelKey: "directSales.history",
          defaultLabel: "Sales History",
          icon: FileText,
          activeIcon: FileText,
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
          icon: Archive,
          activeIcon: Archive,
          path: "/storage",
          permission: ["storage.view", "storage.restock", "storage.transfer", "storage.adjust", "storage.count", "storage.allocate", "storage.edit"],
        },
        {
          labelKey: "storage.stockHistory",
          defaultLabel: "Stock History",
          icon: History,
          activeIcon: History,
          path: "/storage/history",
          permission: ["storage.history", "storage.view"],
        },
        {
          labelKey: "storage.lowStockAlerts",
          defaultLabel: "Low Stock Alerts",
          icon: AlertTriangle,
          activeIcon: AlertTriangle,
          path: "/storage/low-stock",
          permission: ["storage.lowStock", "storage.view"],
          badge: lowStockCount > 0 ? lowStockCount : undefined,
          badgeColor: "red",
        },
        {
          labelKey: "materials.title",
          defaultLabel: "Materials Catalog",
          icon: Package,
          activeIcon: Package,
          path: "/materials",
          permission: "catalog.materials.view",
        },
        {
          labelKey: "services.title",
          defaultLabel: "Services Catalog",
          icon: Wrench,
          activeIcon: Wrench,
          path: "/services",
          permission: "catalog.services.view",
        },
        {
          labelKey: "cars.title",
          defaultLabel: "Vehicle Models",
          icon: Car,
          activeIcon: Car,
          path: "/cars",
          permission: "catalog.cars.view",
        },
        {
          labelKey: "assets.title",
          defaultLabel: "Company Assets",
          icon: Boxes,
          activeIcon: Boxes,
          path: "/assets",
          permission: "assets.view",
          badge: trashSummary?.trashCount ? `${trashSummary.trashCount} in trash` : undefined,
          badgeColor: "amber",
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
          icon: Users,
          activeIcon: Users,
          path: "/customers",
          permission: "customers.view",
        },
        {
          labelKey: "users.title",
          defaultLabel: "Staff & Users",
          icon: UserCog,
          activeIcon: UserCog,
          path: "/users",
          permission: "users.view",
        },
        {
          labelKey: "reports.title",
          defaultLabel: "Reports & Analytics",
          icon: BarChart3,
          activeIcon: BarChart3,
          path: "/reports",
          permission: "reports.view",
        },
        {
          labelKey: "settings.title",
          defaultLabel: "Settings",
          icon: Settings,
          activeIcon: Settings,
          path: "/settings",
          permission: "settings.view",
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
        <BrandLogo
          size="md"
          showTextOnMobile={true}
          onClick={() => {
            navigate("/");
            onNavigate?.();
          }}
        />

        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={onNavigate}
          aria-label="Close sidebar"
        >
          <X size={20} />
        </ActionIcon>
      </Box>

      {/* Nav List */}
      <ScrollArea style={{ flex: 1 }} scrollbars="y" px="sm" py="md">
        <Stack gap="lg">
          {navSections.map((section) => {
            // Filter items by user permission
            const visibleItems = section.items.filter((item) => {
              if (!item.permission) return true;
              if (Array.isArray(item.permission)) {
                return item.permission.some((p) => checkPermission(user?.permissions, user?.role || "", p));
              }
              return checkPermission(user?.permissions, user?.role || "", item.permission);
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

      {/* CodeAbay Attribution Footer (Always Visible at Bottom) */}
      <Box
        px="sm"
        py="xs"
        style={{
          borderTop: "1px solid var(--surface-border)",
          backgroundColor: "var(--sidebar-bg)",
          flexShrink: 0,
        }}
      >
        <a
          href="https://codeabay.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "5px 8px",
            borderRadius: 8,
            transition: "all 0.15s ease",
          }}
          className="hover:bg-accent/60 transition-colors group"
          title="CodeAbay - Software Development Solutions"
        >
          <Group gap="xs" wrap="nowrap" align="center" style={{ minWidth: 0 }}>
            {/* CodeAbay Logo Mark (Theme Aware) */}
            <Box
              style={{
                width: 26,
                height: 22,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={logoBlack}
                alt="CodeAbay Logo"
                className="dark:hidden w-full h-full object-contain"
              />
              <img
                src={logoWhite}
                alt="CodeAbay Logo"
                className="hidden dark:block w-full h-full object-contain"
              />
            </Box>

            <Box style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
              <Text
                size="9px"
                fw={700}
                c="dimmed"
                tt="uppercase"
                style={{ letterSpacing: "0.06em", lineHeight: 1.1 }}
              >
                {t("common.builtBy", "Built by")}
              </Text>
              <Text
                size="xs"
                fw={700}
                style={{
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                  color: "var(--text-main)",
                }}
                className="group-hover:text-primary transition-colors"
              >
                CodeAbay
              </Text>
            </Box>
          </Group>

          <ArrowUpRight
            size={13}
            className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0"
          />
        </a>
      </Box>
    </Box>
  );
}
