import { useState, useEffect } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Box,
  Alert,
  Checkbox,
  ActionIcon,
  Badge,
  Tooltip,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api from "../lib/api";
import { useTranslation } from "react-i18next";
import {
  Phone,
  Lock,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
} from "lucide-react";
import { BrandLogo } from "../components/common";

export default function Login() {
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });
  const isDark = computedColorScheme === "dark";
  const navigate = useNavigate();
  const { t } = useTranslation();

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setColorScheme(next);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.setAttribute("data-mantine-color-scheme", computedColorScheme);
    localStorage.setItem("mantine-color-scheme-value", computedColorScheme);
    localStorage.setItem("vite-ui-theme", computedColorScheme);
  }, [isDark, computedColorScheme]);

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
      const status = err.response?.status;
      const rawMsg = err.response?.data?.error?.message;

      if (!err.response) {
        setError({
          title: t("alerts.noInternet", "Network Error"),
          message: t("auth.login.serverError", "Unable to connect to the server. Please check your connection and try again."),
        });
      } else if (status === 401) {
        const isEmployee = typeof rawMsg === 'string' && rawMsg.toLowerCase().includes('employee');
        setError({
          title: t("auth.login.authFailed", "Authentication Failed"),
          message: isEmployee
            ? t("auth.login.employeeBlocked", "Employees cannot log in to the system")
            : t("auth.login.invalidCredentials", "Invalid phone number or password"),
        });
      } else {
        setError({
          title: t("auth.login.serverErrorTitle", "Connection Error"),
          message: t("auth.login.serverError", "Unable to connect to the server. Please check your connection and try again."),
        });
      }
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
        <Box style={{ position: "relative", zIndex: 10 }}>
          <BrandLogo size="lg" />
        </Box>

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
          <Tooltip label={isDark ? "Light Mode" : "Dark Mode"}>
            <ActionIcon
              variant="default"
              size="lg"
              radius="md"
              onClick={toggleTheme}
              aria-label="Toggle color scheme"
            >
              {isDark ? (
                <Sun size={20} color="var(--primary-accent)" />
              ) : (
                <Moon size={20} />
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
                icon={<AlertCircle size={18} />}
                color="red"
                radius="md"
                variant="light"
                title={error.title}
              >
                {error.message}
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
                  leftSection={<Phone size={18} color="var(--text-muted)" />}
                  required
                  size="md"
                />

                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  leftSection={<Lock size={18} color="var(--text-muted)" />}
                  required
                  size="md"
                />

                <Box mt={4}>
                  <Checkbox
                    label="Remember me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.currentTarget.checked)}
                    size="xs"
                    color="amber"
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  loading={loading}
                  rightSection={<ArrowRight size={18} />}
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
