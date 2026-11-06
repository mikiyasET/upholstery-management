import {
  Group,
  Burger,
  ActionIcon,
  Menu,
  Text,
  Box,
  UnstyledButton,
  Tooltip,
  Button,
} from "@mantine/core";
import {
  Moon,
  Sun,
  LogOut,
  Plus,
  Languages,
  Car,
  ShoppingBag,
  CircleDollarSign,
  Settings,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "react-i18next";
import { usePermission } from "../../lib/permissions";
import { BrandLogo } from "../common";

interface AppHeaderProps {
  mobileOpened: boolean;
  toggleMobile: () => void;
}

export function AppHeader({ mobileOpened, toggleMobile }: AppHeaderProps) {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });
  const isDark = computedColorScheme === "dark";

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setColorScheme(next);
  };
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const canCreateOrder = usePermission("orders.create");
  const canCreateDirectSale = usePermission("directSales.create");

  const toggleLanguage = () => {
    const nextLang = i18n.language === "am" ? "en" : "am";
    i18n.changeLanguage(nextLang);
  };

  const handleLogout = () => {
    modals.openConfirmModal({
      title: (
        <Group gap="xs">
          <LogOut size={20} color="var(--status-warning, #EF4444)" />
          <Text fw={700} size="md">
            {t("auth.signOutConfirmTitle", "Sign Out Confirmation")}
          </Text>
        </Group>
      ),
      centered: true,
      children: (
        <Text size="sm" c="dimmed">
          {t(
            "auth.signOutConfirmMessage",
            "Are you sure you want to sign out? You will need your credentials to log back in."
          )}
        </Text>
      ),
      labels: {
        confirm: t("common.signOut", "Sign Out"),
        cancel: t("common.cancel", "Cancel"),
      },
      confirmProps: { color: "red" },
      onConfirm: () => {
        logout();
        navigate("/login", { replace: true });
      },
    });
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "YC";

  return (
    <Group
      h="100%"
      px={{ base: "xs", sm: "md", md: "lg" }}
      justify="space-between"
      align="center"
      wrap="nowrap"
      className="glass-header"
      style={{ overflow: "hidden" }}
    >
      {/* Left: Mobile Toggle & Brand Logo */}
      <Group gap="sm" align="center" wrap="nowrap" style={{ flexShrink: 0, minWidth: 0 }}>
        <Burger
          opened={mobileOpened}
          onClick={toggleMobile}
          hiddenFrom="sm"
          size="sm"
          aria-label="Toggle navigation"
        />

        <BrandLogo size="md" onClick={() => navigate("/")} />
      </Group>

      {/* Right: Quick Actions, Language, Dark Mode & User Profile */}
      <Group gap="xs" align="center" wrap="nowrap">
        {/* Quick Action Button */}
        {(canCreateOrder || canCreateDirectSale) && (
          <Menu shadow="md" width={190} position="bottom-end">
            <Menu.Target>
              <Button
                size="xs"
                variant="gradient"
                gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                leftSection={<Plus size={16} />}
                style={{ fontWeight: 600 }}
              >
                {t("common.new", "New Action")}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {canCreateOrder && (
                <Menu.Item
                  leftSection={<Car size={16} color="var(--primary-accent)" />}
                  onClick={() => navigate("/orders/new")}
                >
                  {t("orders.newOrder", "New Work Order")}
                </Menu.Item>
              )}
              {canCreateDirectSale && (
                <Menu.Item
                  leftSection={<ShoppingBag size={16} color="var(--secondary-accent)" />}
                  onClick={() => navigate("/direct-sales")}
                >
                  {t("directSales.title", "Direct Sale")}
                </Menu.Item>
              )}
              <Menu.Item
                leftSection={<CircleDollarSign size={16} />}
                onClick={() => navigate("/storage")}
              >
                {t("storage.transfers", "Store Transfer")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}

        {/* Language Switcher */}
        <Tooltip label={i18n.language === "am" ? "Switch to English" : "ወደ አማርኛ ቀይር"}>
          <ActionIcon
            variant="default"
            size="md"
            radius="md"
            onClick={toggleLanguage}
            aria-label="Toggle language"
          >
            <Languages size={18} />
          </ActionIcon>
        </Tooltip>

        {/* Dark / Light Mode Toggle */}
        <Tooltip label={isDark ? "Light Mode" : "Dark Mode"}>
          <ActionIcon
            variant="default"
            size="md"
            radius="md"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun size={18} color="var(--primary-accent)" />
            ) : (
              <Moon size={18} />
            )}
          </ActionIcon>
        </Tooltip>

        {/* Executive User Profile Menu */}
        <Menu shadow="md" width={240} position="bottom-end" transitionProps={{ transition: "pop-top-right", duration: 150 }}>
          <Menu.Target>
            <UnstyledButton
              className="exec-profile-capsule"
              aria-label="User profile menu"
            >
              <Box className="exec-avatar-wrapper">
                {initials}
                <span className="exec-online-pip" />
              </Box>
              <Box visibleFrom="sm" className="exec-user-info">
                <Text size="xs" fw={700} truncate maw={120} className="exec-user-name">
                  {user?.name || "System Admin"}
                </Text>
                <span className="exec-role-pill">
                  <ShieldCheck size={9} />
                  {user?.role || "Admin"}
                </span>
              </Box>
              <ChevronDown size={15} className="exec-chevron" />
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown
            style={{
              padding: 6,
              borderRadius: 14,
              border: "1px solid var(--surface-border)",
              boxShadow: "var(--shadow-dropdown)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Box px="sm" py="xs" style={{ borderBottom: "1px solid var(--surface-border-subtle)" }}>
              <Group gap="xs" wrap="nowrap" align="center">
                <Box
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 55%, #8A6208 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                    fontWeight: 800,
                    fontSize: 13,
                    flexShrink: 0,
                    boxShadow: "0 0 0 1.5px rgba(212, 175, 55, 0.4), 0 2px 6px rgba(0,0,0,0.2)",
                  }}
                >
                  {initials}
                </Box>
                <Box style={{ overflow: "hidden", minWidth: 0 }}>
                  <Text size="xs" fw={700} truncate>
                    {user?.name || "System Admin"}
                  </Text>
                  <Text size="11px" c="dimmed" truncate>
                    {user?.phone || "0941398934"}
                  </Text>
                  <span className="exec-role-pill" style={{ marginTop: 3 }}>
                    <ShieldCheck size={9} />
                    {user?.role || "Admin"}
                  </span>
                </Box>
              </Group>
            </Box>

            <Box py={4}>
              <Menu.Item
                leftSection={<Languages size={16} />}
                onClick={toggleLanguage}
                style={{ borderRadius: 8, fontSize: "0.8125rem", fontWeight: 500 }}
              >
                {i18n.language === "am" ? "English" : "አማርኛ (Amharic)"}
              </Menu.Item>
              <Menu.Item
                leftSection={<Settings size={16} />}
                onClick={() => navigate("/settings")}
                style={{ borderRadius: 8, fontSize: "0.8125rem", fontWeight: 500 }}
              >
                {t("settings.title", "Settings")}
              </Menu.Item>
            </Box>

            <Menu.Divider />

            <Menu.Item
              color="red"
              leftSection={<LogOut size={16} />}
              onClick={handleLogout}
              style={{ borderRadius: 8, fontSize: "0.8125rem", fontWeight: 600 }}
            >
              {t("common.signOut", "Sign Out")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
