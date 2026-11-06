import { useState } from "react";
import {
  Box,
  Button,
  Group,
  Title,
  Text,
  Badge,
  Tabs,
  TextInput,
  SimpleGrid,
  Paper,
  Grid,
  Stack,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Shield,
  QrCode,
  Save,
  Store,
  Phone,
  MapPin,
  Mail,
  Lock,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";

export default function Settings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string | null>("profile");

  // Workshop Profile State
  const [profile, setProfile] = useState({
    workshopName: "Yonatan Car Decoration & Upholstery",
    nameAmharic: "ዮናታን የመኪና ዲኮር እና የኮርቻ ስራ",
    phone: "+251 911 234 567",
    email: "info@yonatanupholstery.com",
    address: "Bole Sub-City, Next to Edna Mall",
    city: "Addis Ababa, Ethiopia",
    tinNumber: "0012345678",
    tradeLicense: "TR-AA-2024-8891",
    telebirrAccount: "0911234567",
    cbeAccount: "1000123456789",
  });

  // Number Sequences State
  const [sequences, setSequences] = useState({
    orderPrefix: "WO-",
    orderNextNumber: "0043",
    posPrefix: "DS-",
    posNextNumber: "0190",
    receiptPrefix: "REC-",
    receiptNextNumber: "0312",
  });

  const tabs = [
    { key: "profile", label: t("settings.tabs.profile", "Workshop Identity"), icon: Building2 },
    { key: "sequences", label: t("settings.tabs.sequences", "Number Sequences"), icon: QrCode },
    { key: "security", label: t("settings.tabs.security", "Security & Passwords"), icon: Shield },
  ];

  const handleSaveProfile = () => {
    notifications.show({
      title: t("settings.savedTitle", "Settings Saved"),
      message: t("settings.savedMessage", "Workshop identity and profile settings have been successfully updated."),
      color: "green",
    });
  };

  return (
    <Box pb="xl" className="animate-in fade-in duration-300">
      {/* 1. Executive Standard PageHeader */}
      <PageHeader
        title={t("settings.title", "Settings")}
        subtitle={t(
          "settings.subtitle",
          "Manage workshop identity, business profile, number sequences, and security controls."
        )}
        onRefresh={() => {
          notifications.show({
            title: t("settings.refreshedTitle", "Settings Refreshed"),
            message: t("settings.refreshedMessage", "System preferences reloaded to current state."),
            color: "amber",
          });
        }}
        refreshTooltip={t("settings.refreshTooltip", "Refresh settings")}
        action={
          <Button
            variant="gradient"
            gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
            radius="md"
            leftSection={<Save size={18} />}
            onClick={handleSaveProfile}
            style={{
              boxShadow: "0 2px 10px rgba(245, 158, 11, 0.25)",
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              letterSpacing: "-0.01em",
              height: 36,
            }}
          >
            {t("common.saveChanges", "Save Changes")}
          </Button>
        }
      />

      {/* 2. Top Metric KPI Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }} truncate>
                {t("settings.kpi.workshopEntity", "Workshop Entity")}
              </Text>
              <Text fw={700} size="1.25rem" lh={1.2} mt={4} truncate>
                {profile.workshopName}
              </Text>
              <Text size="xs" c="dimmed" mt={4} truncate>
                {t("settings.kpi.tin", "TIN")}: {profile.tinNumber}
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
              <Building2 size={20} />
            </Box>
          </Group>
        </Box>

        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {t("settings.kpi.numberSequences", "Number Sequences")}
              </Text>
              <Text fw={700} size="1.25rem" lh={1.2} mt={4}>
                {t("settings.kpi.formatsActive", "3 Formats Active")}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                {sequences.orderPrefix}, {sequences.posPrefix}, {sequences.receiptPrefix}
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
              <QrCode size={20} />
            </Box>
          </Group>
        </Box>

        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {t("settings.kpi.dualStores", "Dual Storage Stores")}
              </Text>
              <Text fw={700} size="1.25rem" lh={1.2} mt={4}>
                {t("settings.kpi.activeHubs", "2 Active Hubs")}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                {t("settings.kpi.miniPlusMain", "Mini Floor + Main Warehouse")}
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
                background: "rgba(168, 85, 247, 0.12)",
                color: "#10b981",
              }}
            >
              <Store size={20} />
            </Box>
          </Group>
        </Box>

        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {t("settings.kpi.accessPolicy", "Access Policy")}
              </Text>
              <Text fw={700} size="1.25rem" lh={1.2} mt={4}>
                {t("settings.kpi.roleRbac", "Role-Based RBAC")}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                {t("settings.kpi.rolesSummary", "Admin, Cashier, Technician")}
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
                background: "rgba(168, 85, 247, 0.12)",
                color: "#a855f7",
              }}
            >
              <Shield size={20} />
            </Box>
          </Group>
        </Box>
      </SimpleGrid>

      {/* 3. Executive Sub-Navigation Tabs Switcher Bar */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md" mb="lg">
        <Box
          p={4}
          style={{
            backgroundColor: "var(--surface-card, rgba(255, 255, 255, 0.04))",
            border: "1px solid var(--surface-border, rgba(255, 255, 255, 0.08))",
            borderRadius: 12,
            display: "inline-flex",
            gap: 6,
            boxShadow: "var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05))",
            maxWidth: "100%",
            overflowX: "auto",
          }}
          className="custom-scrollbar"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Button
                key={tab.key}
                variant={isActive ? "filled" : "subtle"}
                color="amber"
                size="sm"
                radius="md"
                leftSection={<tab.icon size={15} />}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  fontWeight: isActive ? 700 : 500,
                  height: 36,
                  padding: "0 16px",
                  fontSize: "13px",
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                  background: isActive ? undefined : "transparent",
                  color: isActive ? "#ffffff" : "var(--mantine-color-dimmed, #9ca3af)",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>
      </Group>

      {/* 4. Tab Content Panels */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        {/* TAB 1: WORKSHOP PROFILE */}
        <Tabs.Panel value="profile" className="animate-in fade-in duration-200">
          <Box className="premium-card" p="xl" style={{ borderRadius: 16 }}>
            <Group justify="space-between" align="flex-start" mb="lg">
              <Group gap="sm">
                <Box
                  className="stat-icon-wrapper"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: "rgba(245, 158, 11, 0.12)",
                    color: "var(--primary-accent)",
                  }}
                >
                  <Building2 size={20} />
                </Box>
                <Box>
                  <Title order={3} size="h4" fw={700}>
                    {t("settings.profile.title", "Commercial & Workshop Entity Details")}
                  </Title>
                  <Text size="xs" c="dimmed">
                    {t(
                      "settings.profile.subtitle",
                      "These details are automatically printed on Work Order invoices, proforma estimates, and receipts."
                    )}
                  </Text>
                </Box>
              </Group>
            </Group>

            <Grid gap="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label={t("settings.profile.workshopNameEn", "Workshop Trading Name (English)")}
                  value={profile.workshopName}
                  onChange={(e) => setProfile({ ...profile, workshopName: e.target.value })}
                  leftSection={<Building2 size={16} />}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label={t("settings.profile.workshopNameAm", "የድርጅቱ ስም (Amharic)")}
                  value={profile.nameAmharic}
                  onChange={(e) => setProfile({ ...profile, nameAmharic: e.target.value })}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label={t("settings.profile.phone", "Official Telephone Number")}
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  leftSection={<Phone size={16} />}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label={t("settings.profile.email", "Business Email Address")}
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  leftSection={<Mail size={16} />}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label={t("settings.profile.tin", "Tax Identification Number (TIN)")}
                  value={profile.tinNumber}
                  onChange={(e) => setProfile({ ...profile, tinNumber: e.target.value })}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label={t("settings.profile.tradeLicense", "Trade License Number")}
                  value={profile.tradeLicense}
                  onChange={(e) => setProfile({ ...profile, tradeLicense: e.target.value })}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label={t("settings.profile.telebirr", "Telebirr Merchant / Phone Number")}
                  value={profile.telebirrAccount}
                  onChange={(e) => setProfile({ ...profile, telebirrAccount: e.target.value })}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label={t("settings.profile.cbe", "Commercial Bank of Ethiopia (CBE) Account")}
                  value={profile.cbeAccount}
                  onChange={(e) => setProfile({ ...profile, cbeAccount: e.target.value })}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12 }}>
                <TextInput
                  label={t("settings.profile.address", "Physical Location & Workshop Address")}
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  leftSection={<MapPin size={16} />}
                />
              </Grid.Col>
            </Grid>

            <Group justify="flex-end" mt="xl">
              <Button
                variant="gradient"
                gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                leftSection={<Save size={16} />}
                onClick={handleSaveProfile}
              >
                {t("settings.profile.saveButton", "Save Workshop Profile")}
              </Button>
            </Group>
          </Box>
        </Tabs.Panel>

        {/* TAB 2: NUMBER SEQUENCES */}
        <Tabs.Panel value="sequences" className="animate-in fade-in duration-200">
          <Box className="premium-card" p="xl" style={{ borderRadius: 16 }}>
            <Group justify="space-between" align="flex-start" mb="lg">
              <Group gap="sm">
                <Box
                  className="stat-icon-wrapper"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: "rgba(59, 130, 246, 0.12)",
                    color: "#3b82f6",
                  }}
                >
                  <QrCode size={20} />
                </Box>
                <Box>
                  <Title order={3} size="h4" fw={700}>
                    {t("settings.sequences.title", "Automated Number Sequences")}
                  </Title>
                  <Text size="xs" c="dimmed">
                    {t(
                      "settings.sequences.subtitle",
                      "Configure serial numbering format and auto-increment codes for invoices, work orders, and direct sales."
                    )}
                  </Text>
                </Box>
              </Group>
            </Group>

            <Grid gap="lg">
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper
                  p="lg"
                  radius="md"
                  withBorder
                  style={{
                    backgroundColor: "var(--surface-card, rgba(255, 255, 255, 0.02))",
                    borderColor: "var(--surface-border, rgba(255, 255, 255, 0.08))",
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Text fw={700} size="sm">
                      {t("settings.sequences.workOrders", "Work Orders")}
                    </Text>
                    <Badge color="amber" variant="light" size="sm">
                      {sequences.orderPrefix}2026-{sequences.orderNextNumber}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mb="md">
                    {t("settings.sequences.formatOrder", "Format: Prefix + Year + Serial")}
                  </Text>
                  <TextInput
                    label={t("settings.sequences.prefix", "Prefix")}
                    value={sequences.orderPrefix}
                    onChange={(e) => setSequences({ ...sequences, orderPrefix: e.target.value })}
                    mb="xs"
                  />
                  <TextInput
                    label={t("settings.sequences.nextNumber", "Next Number")}
                    value={sequences.orderNextNumber}
                    onChange={(e) => setSequences({ ...sequences, orderNextNumber: e.target.value })}
                  />
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper
                  p="lg"
                  radius="md"
                  withBorder
                  style={{
                    backgroundColor: "var(--surface-card, rgba(255, 255, 255, 0.02))",
                    borderColor: "var(--surface-border, rgba(255, 255, 255, 0.08))",
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Text fw={700} size="sm">
                      {t("settings.sequences.directSales", "Direct Sales POS")}
                    </Text>
                    <Badge color="blue" variant="light" size="sm">
                      {sequences.posPrefix}{sequences.posNextNumber}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mb="md">
                    {t("settings.sequences.formatPos", "Format: Prefix + Serial")}
                  </Text>
                  <TextInput
                    label={t("settings.sequences.prefix", "Prefix")}
                    value={sequences.posPrefix}
                    onChange={(e) => setSequences({ ...sequences, posPrefix: e.target.value })}
                    mb="xs"
                  />
                  <TextInput
                    label={t("settings.sequences.nextNumber", "Next Number")}
                    value={sequences.posNextNumber}
                    onChange={(e) => setSequences({ ...sequences, posNextNumber: e.target.value })}
                  />
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper
                  p="lg"
                  radius="md"
                  withBorder
                  style={{
                    backgroundColor: "var(--surface-card, rgba(255, 255, 255, 0.02))",
                    borderColor: "var(--surface-border, rgba(255, 255, 255, 0.08))",
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Text fw={700} size="sm">
                      {t("settings.sequences.cashReceipts", "Cash Receipts")}
                    </Text>
                    <Badge color="green" variant="light" size="sm">
                      {sequences.receiptPrefix}{sequences.receiptNextNumber}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mb="md">
                    {t("settings.sequences.formatPos", "Format: Prefix + Serial")}
                  </Text>
                  <TextInput
                    label={t("settings.sequences.prefix", "Prefix")}
                    value={sequences.receiptPrefix}
                    onChange={(e) => setSequences({ ...sequences, receiptPrefix: e.target.value })}
                    mb="xs"
                  />
                  <TextInput
                    label={t("settings.sequences.nextNumber", "Next Number")}
                    value={sequences.receiptNextNumber}
                    onChange={(e) => setSequences({ ...sequences, receiptNextNumber: e.target.value })}
                  />
                </Paper>
              </Grid.Col>
            </Grid>

            <Group justify="flex-end" mt="xl">
              <Button
                variant="gradient"
                gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                leftSection={<Save size={16} />}
                onClick={() => {
                  notifications.show({
                    title: t("settings.sequencesSavedTitle", "Sequences Saved"),
                    message: t("settings.sequencesSavedMessage", "Number sequence counters updated successfully."),
                    color: "green",
                  });
                }}
              >
                {t("settings.sequences.saveButton", "Update Sequences")}
              </Button>
            </Group>
          </Box>
        </Tabs.Panel>

        {/* TAB 3: SECURITY & PASSWORDS */}
        <Tabs.Panel value="security" className="animate-in fade-in duration-200">
          <Box className="premium-card" p="xl" style={{ maxWidth: 650, borderRadius: 16 }}>
            <Group justify="space-between" align="flex-start" mb="lg">
              <Group gap="sm">
                <Box
                  className="stat-icon-wrapper"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: "rgba(168, 85, 247, 0.12)",
                    color: "#a855f7",
                  }}
                >
                  <Shield size={20} />
                </Box>
                <Box>
                  <Title order={3} size="h4" fw={700}>
                    {t("settings.security.title", "Account Security & Password")}
                  </Title>
                  <Text size="xs" c="dimmed">
                    {t("settings.security.subtitle", "Update your account credentials and manage security preferences.")}
                  </Text>
                </Box>
              </Group>
            </Group>

            <Stack gap="md">
              <TextInput
                label={t("settings.security.currentPassword", "Current Password")}
                type="password"
                placeholder="••••••••"
                leftSection={<Lock size={16} />}
              />
              <TextInput
                label={t("settings.security.newPassword", "New Password")}
                type="password"
                placeholder="••••••••"
                leftSection={<Lock size={16} />}
              />
              <TextInput
                label={t("settings.security.confirmPassword", "Confirm New Password")}
                type="password"
                placeholder="••••••••"
                leftSection={<Lock size={16} />}
              />

              <Group justify="flex-end" mt="md">
                <Button
                  variant="gradient"
                  gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                  onClick={() => {
                    notifications.show({
                      title: t("settings.securityUpdatedTitle", "Security Settings Updated"),
                      message: t("settings.securityUpdatedMessage", "Password and security settings verified."),
                      color: "green",
                    });
                  }}
                >
                  {t("settings.security.saveButton", "Save Security Changes")}
                </Button>
              </Group>
            </Stack>
          </Box>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
