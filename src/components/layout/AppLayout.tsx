import { AppShell, Box, useComputedColorScheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { preloadPlateAssets } from "../../utils/plateAssets";

function ColorSchemeSync() {
  const computedColorScheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });

  useEffect(() => {
    const isDark = computedColorScheme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.setAttribute("data-mantine-color-scheme", computedColorScheme);
    localStorage.setItem("mantine-color-scheme-value", computedColorScheme);
    localStorage.setItem("vite-ui-theme", computedColorScheme);
  }, [computedColorScheme]);

  return null;
}

export function AppLayout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const location = useLocation();

  // Preload plate assets (CARGO font & holographic foil) when admin panel is loaded
  useEffect(() => {
    preloadPlateAssets();
  }, []);

  // Automatically close mobile sidebar whenever route changes
  useEffect(() => {
    closeMobile();
  }, [location.pathname, closeMobile]);

  return (
    <>
      <ColorSchemeSync />
      <AppShell
        header={{ height: 64 }}
        navbar={{
          width: { base: "100%", sm: 270 },
          breakpoint: "sm",
          collapsed: { mobile: !mobileOpened },
        }}
        padding={{ base: "md", sm: "lg", lg: "xl" }}
        style={{
          minHeight: "100vh",
          maxWidth: "100vw",
          overflowX: "hidden",
          backgroundColor: "var(--surface-bg)",
        }}
      >
        <AppShell.Header withBorder={false} style={{ maxWidth: "100vw", overflowX: "hidden" }}>
          <AppHeader
            mobileOpened={mobileOpened}
            toggleMobile={toggleMobile}
          />
        </AppShell.Header>

        <AppShell.Navbar withBorder={false}>
          <AppSidebar onNavigate={closeMobile} />
        </AppShell.Navbar>

        <AppShell.Main style={{ maxWidth: "100vw", overflowX: "hidden" }}>
          <Box
            className="animate-fade-in"
            style={{
              maxWidth: 1600,
              margin: "0 auto",
              width: "100%",
            }}
          >
            <Outlet />
          </Box>
        </AppShell.Main>
      </AppShell>
    </>
  );
}

export default AppLayout;
