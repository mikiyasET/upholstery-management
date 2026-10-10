import {
  Group,
  Burger,
  ActionIcon,
  Menu,
  Avatar,
  Text,
  Box,
  UnstyledButton,
  Badge,
  Tooltip,
  Button,
} from "@mantine/core";
import {
  RiMoonLine,
  RiSunLine,
  RiLogoutBoxRLine,
  RiAddLine,
  RiTranslate2,
  RiCarLine,
  RiShoppingBag3Line,
  RiExchangeDollarLine,
} from "react-icons/ri";
import { useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "react-i18next";
import { usePermission } from "../../lib/permissions";

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
          <RiLogoutBoxRLine size={20} color="var(--status-warning, #EF4444)" />
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

        <UnstyledButton onClick={() => navigate("/")} style={{ textDecoration: "none" }}>
          <Group gap="xs" wrap="nowrap">
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--brand-glow)",
                background: "var(--brand-gradient)",
                color: "#FFFFFF",
                flexShrink: 0,
              }}
            >
              <RiCarLine size={22} />
            </Box>

            <Box visibleFrom="xs">
              <Text className="brand-title-text">YONATAN</Text>
              <Text className="brand-subtitle-badge">
                POS & UPHOLSTERY
              </Text>
            </Box>
          </Group>
        </UnstyledButton>
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
                leftSection={<RiAddLine size={16} />}
                style={{ fontWeight: 600 }}
              >
                {t("common.new", "New Action")}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {canCreateOrder && (
                <Menu.Item
                  leftSection={<RiCarLine size={16} color="var(--primary-accent)" />}
                  onClick={() => navigate("/orders/new")}
                >
                  {t("orders.newOrder", "New Work Order")}
                </Menu.Item>
              )}
              {canCreateDirectSale && (
                <Menu.Item
                  leftSection={<RiShoppingBag3Line size={16} color="var(--secondary-accent)" />}
                  onClick={() => navigate("/direct-sales")}
                >
                  {t("directSales.title", "Direct Sale")}
                </Menu.Item>
              )}
              <Menu.Item
                leftSection={<RiExchangeDollarLine size={16} />}
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
            <RiTranslate2 size={18} />
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
              <RiSunLine size={18} color="var(--primary-accent)" />
            ) : (
              <RiMoonLine size={18} />
            )}
          </ActionIcon>
        </Tooltip>

        {/* User Profile Menu */}
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <UnstyledButton
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px",
                borderRadius: 10,
                border: "1px solid var(--surface-border)",
                background: "var(--surface-card)",
              }}
            >
              <Avatar
                size={30}
                radius="md"
                color="amber"
                style={{ fontWeight: 700, fontSize: "0.8rem" }}
              >
                {initials}
              </Avatar>
              <Box visibleFrom="sm" style={{ textAlign: "left", lineHeight: 1.15 }}>
                <Text size="xs" fw={700} truncate maw={110}>
                  {user?.name || "User"}
                </Text>
                <Text size="10px" c="dimmed" style={{ textTransform: "uppercase" }}>
                  {user?.role || "Staff"}
                </Text>
              </Box>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Box px="xs" py={6}>
              <Text size="xs" fw={700}>
                {user?.name}
              </Text>
              <Text size="10px" c="dimmed">
                {user?.phone || user?.role}
              </Text>
              <Badge size="xs" variant="light" color="amber" mt={4}>
                {user?.role}
              </Badge>
            </Box>
            <Menu.Divider />
            <Menu.Item
              leftSection={<RiTranslate2 size={16} />}
              onClick={toggleLanguage}
            >
              {i18n.language === "am" ? "English" : "አማርኛ (Amharic)"}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<RiLogoutBoxRLine size={16} />}
              onClick={handleLogout}
            >
              {t("common.signOut", "Sign Out")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
