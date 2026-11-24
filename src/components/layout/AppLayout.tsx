import { AppShell, Box, useComputedColorScheme } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, Suspense } from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { ErrorBoundary, PageLoadingFallback } from "../common";
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

  // Detect tablet viewport (768px - 1199px)
  const isTablet = useMediaQuery("(min-width: 48em) and (max-width: 74.99em)");
  const [isOverlayExpanded, setIsOverlayExpanded] = useState(false);

  // In tablet mode, sidebar is icon-only by default unless overlay-expanded
  const isCollapsed = Boolean(isTablet && !isOverlayExpanded);

  // Automatically close mobile sidebar or overlay sidebar whenever route changes
  useEffect(() => {
    closeMobile();
    setIsOverlayExpanded(false);
  }, [location.pathname, closeMobile]);

  // Reset overlay expansion when transitioning out of tablet mode
  useEffect(() => {
    if (!isTablet && isOverlayExpanded) {
      setIsOverlayExpanded(false);
    }
  }, [isTablet, isOverlayExpanded]);

  // Preload plate assets (CARGO font & holographic foil) when admin panel is loaded
  useEffect(() => {
    preloadPlateAssets();
  }, []);

  const isDirectSales = location.pathname === "/direct-sales";

  return (
    <>
      <ColorSchemeSync />
      <AppShell
        header={{ height: 64 }}
        navbar={{
          width: { base: "100%", sm: isTablet ? 70 : 270 },
          breakpoint: "sm",
          collapsed: { mobile: !mobileOpened },
        }}
        padding={
          isDirectSales
            ? { base: 8, sm: 10, md: 12, lg: 16 }
            : { base: "md", sm: "lg", lg: "xl" }
        }
        style={{
          minHeight: "100vh",
          maxWidth: "100vw",
          overflowX: "hidden",
          backgroundColor: "var(--surface-bg)",
        }}
      >
        <AppShell.Header
          withBorder={false}
          style={{ maxWidth: "100vw", overflowX: "hidden", zIndex: 110 }}
        >
          <AppHeader
            mobileOpened={mobileOpened}
            toggleMobile={toggleMobile}
          />
        </AppShell.Header>

        <AppShell.Navbar
          withBorder={false}
          style={{
            width: isOverlayExpanded ? 270 : isTablet ? 70 : 270,
            zIndex: isOverlayExpanded ? 105 : undefined,
            boxShadow: isOverlayExpanded ? "var(--shadow-dropdown)" : undefined,
            backgroundColor: "var(--sidebar-bg)",
            borderRight: "1px solid var(--surface-border)",
            transition: "width 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease",
          }}
        >
          <AppSidebar
            isCollapsed={isCollapsed}
            isOverlayExpanded={isOverlayExpanded}
            onToggleExpand={() => setIsOverlayExpanded((prev) => !prev)}
            onNavigate={() => {
              closeMobile();
              setIsOverlayExpanded(false);
            }}
          />
        </AppShell.Navbar>

        {/* Backdrop for tablet overlay sidebar: clicking outside or body collapses it */}
        {isTablet && isOverlayExpanded && (
          <Box
            onClick={() => setIsOverlayExpanded(false)}
            aria-label="Close sidebar overlay"
            style={{
              position: "fixed",
              inset: 0,
              top: 64,
              zIndex: 100,
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              backdropFilter: "blur(1px)",
              WebkitBackdropFilter: "blur(1px)",
              cursor: "pointer",
            }}
          />
        )}

        <AppShell.Main style={{ maxWidth: "100vw", overflowX: "hidden" }}>
          <ErrorBoundary>
            <Suspense key={location.pathname} fallback={<PageLoadingFallback />}>
              <Box
                className="animate-fade-in"
                style={{
                  maxWidth: isDirectSales ? "100%" : 1600,
                  margin: "0 auto",
                  width: "100%",
                }}
              >
                <Outlet />
              </Box>
            </Suspense>
          </ErrorBoundary>
        </AppShell.Main>
      </AppShell>
    </>
  );
}

export default AppLayout;
