import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Box,
  Alert,
  Group,
  Checkbox,
  ActionIcon,
  Badge,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api from "../lib/api";
import { useTranslation } from "react-i18next";
import {
  RiPhoneLine,
  RiLockPasswordLine,
  RiArrowRightLine,
  RiSunLine,
  RiMoonLine,
  RiErrorWarningLine,
  RiCarLine,
  RiShieldCheckLine,
  RiArchiveLine,
  RiSparklingFill,
} from "react-icons/ri";

export default function Login() {
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post("/auth/login", { phone, password });
      login(data.user, data.accessToken, data.refreshToken);
      notifications.show({
        title: t("auth.login.welcomeBack", "Welcome back!"),
        message: `${t("auth.login.signedInAs", "Signed in as")} ${data.user.name}`,
        color: "green",
      });
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          t("auth.login.failed", "Invalid credentials. Please verify your phone number and password.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        width: "100%",
        backgroundColor: "var(--surface-bg)",
        overflow: "hidden",
      }}
    >
      {/* Left Column: Visual Showcase (Hidden on small screens) */}
      <Box
        visibleFrom="md"
        style={{
          flex: "1 1 52%",
          position: "relative",
          backgroundImage: "url('/login-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
          color: "#FAFAF9",
        }}
      >
        <Box
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(18, 18, 21, 0.88) 0%, rgba(39, 39, 42, 0.75) 50%, rgba(18, 18, 21, 0.95) 100%)",
            backdropFilter: "blur(4px)",
          }}
        />

        {/* Top Header in Left Column */}
        <Group style={{ position: "relative", zIndex: 10 }} justify="space-between">
          <Group gap="xs">
            <Box
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 25px rgba(245, 158, 11, 0.4)",
                background: "var(--brand-gradient)",
                color: "#FFFFFF",
              }}
            >
              <RiCarLine size={26} />
            </Box>
            <Box>
              <Text fw={800} size="md" style={{ letterSpacing: "-0.02em", color: "#FFFFFF" }}>
                YONATAN
              </Text>
              <Text size="10px" fw={700} c="amber.4" style={{ letterSpacing: "0.08em" }}>
                CAR DECOR & UPHOLSTERY
              </Text>
            </Box>
          </Group>

          <Badge
            size="md"
            variant="filled"
            color="amber.6"
            leftSection={<RiSparklingFill size={12} />}
            style={{ fontWeight: 600 }}
          >
            v2.0 Enterprise
          </Badge>
        </Group>

        {/* Hero Narrative */}
        <Stack style={{ position: "relative", zIndex: 10, maxWidth: 540 }} gap="lg">
          <Badge
            size="sm"
            variant="light"
            color="amber.3"
            w="fit-content"
            style={{ fontWeight: 700, letterSpacing: "0.04em" }}
          >
            PRECISION MANAGEMENT SYSTEM
          </Badge>

          <Title
            order={1}
            style={{
              fontSize: "2.75rem",
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#FFFFFF",
            }}
          >
            Elevate Your <Text span c="amber.4">Automotive</Text> Craftsmanship
          </Title>

          <Text size="md" c="gray.3" style={{ lineHeight: 1.6, fontWeight: 400 }}>
            The dedicated operating system for vehicle styling, custom upholstery tailoring, dual-store inventory tracking, and swift point-of-sale operations.
          </Text>

          <Group gap="sm" mt="xs">
            <Badge size="lg" variant="outline" color="amber.3" leftSection={<RiShieldCheckLine size={14} />}>
              Dual-Store Inventory
            </Badge>
            <Badge size="lg" variant="outline" color="amber.3" leftSection={<RiArchiveLine size={14} />}>
              Car Condition Diagrams
            </Badge>
          </Group>
        </Stack>

        {/* Bottom Footer Quote */}
        <Box
          style={{
            position: "relative",
            zIndex: 10,
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: 20,
          }}
        >
          <Text size="xs" c="gray.4">
            Designed for workshop managers, technicians, and cashiers • Addis Ababa, Ethiopia
          </Text>
        </Box>
      </Box>

      {/* Right Column: Sign-in Form */}
      <Box
        style={{
          flex: "1 1 48%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "48px 32px",
          position: "relative",
        }}
      >
        {/* Top-Right Theme Toggle */}
        <Box style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
          <Tooltip label={colorScheme === "dark" ? "Light Mode" : "Dark Mode"}>
            <ActionIcon
              variant="default"
              size="lg"
              radius="md"
              onClick={() => toggleColorScheme()}
              aria-label="Toggle color scheme"
            >
              {colorScheme === "dark" ? (
                <RiSunLine size={20} color="var(--primary-accent)" />
              ) : (
                <RiMoonLine size={20} />
              )}
            </ActionIcon>
          </Tooltip>
        </Box>

        {/* Centered Form Card */}
        <Box style={{ width: "100%", maxWidth: 420 }}>
          <Stack gap="xl">
            {/* Header Titles */}
            <Box>
              <Title order={2} style={{ letterSpacing: "-0.02em" }}>
                Welcome back
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                Sign in to your Yonatan Car Decor account
              </Text>
            </Box>

            {/* Error Banner */}
            {error && (
              <Alert
                icon={<RiErrorWarningLine size={18} />}
                color="red"
                radius="md"
                variant="light"
                title="Authentication Failed"
              >
                {error}
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Phone Number"
                  placeholder="0911234567"
                  value={phone}
                  onChange={(e) => setPhone(e.currentTarget.value)}
                  leftSection={<RiPhoneLine size={18} color="var(--text-muted)" />}
                  required
                  size="md"
                />

                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  leftSection={<RiLockPasswordLine size={18} color="var(--text-muted)" />}
                  required
                  size="md"
                />

                <Group justify="space-between" mt={4}>
                  <Checkbox
                    label="Remember me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.currentTarget.checked)}
                    size="xs"
                    color="amber"
                  />
                  <Text size="xs" c="amber" style={{ cursor: "pointer" }}>
                    Forgot password?
                  </Text>
                </Group>

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  loading={loading}
                  rightSection={<RiArrowRightLine size={18} />}
                  variant="gradient"
                  gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                  mt="sm"
                  style={{ fontWeight: 600 }}
                >
                  Sign In
                </Button>
              </Stack>
            </form>
          </Stack>
        </Box>

        {/* Bottom Copyright */}
        <Box style={{ width: "100%", textAlign: "center" }}>
          <Text size="xs" c="dimmed">
            © {new Date().getFullYear()} Yonatan Car Decor & Upholstery. All rights reserved.
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
