import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ActionIcon, Tooltip } from "@mantine/core";
import { RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface FloatingRefreshButtonProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  tooltip?: string;
  hasOtherFloatingButton?: boolean;
  className?: string;
  bottomOffsetClass?: string;
}

/**
 * Mobile-only sticky floating action button (FAB) for page refreshing.
 * Portaled directly to document.body so it remains strictly sticky to the viewport
 * while the page scrolls, unaffected by any ancestor CSS transforms or animations.
 *
 * Styled with `variant="gradient" gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}`
 * to perfectly match the primary action button on the navigation bar.
 */
export function FloatingRefreshButton({
  onRefresh,
  isRefreshing = false,
  tooltip,
  hasOtherFloatingButton = false,
  className = "",
}: FloatingRefreshButtonProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Do not render if not mounted (SSR/hydration safety) or if page has another floating button
  if (!mounted || hasOtherFloatingButton || typeof document === "undefined") {
    return null;
  }

  const label = tooltip || t("common.refresh", "Refresh");

  return createPortal(
    <div
      className={`sm:hidden fixed z-[999] pointer-events-auto transition-transform duration-200 active:scale-95 ${className}`}
      style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)",
        right: "18px",
        zIndex: 999,
      }}
    >
      <Tooltip label={label} withArrow position="left">
        <ActionIcon
          size={50}
          radius="xl"
          variant="gradient"
          gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
          loading={isRefreshing}
          onClick={onRefresh}
          aria-label={label}
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            boxShadow:
              "0 8px 24px rgba(217, 119, 6, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25)",
            border: "1px solid rgba(254, 243, 199, 0.35)",
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          <RotateCw
            size={22}
            color="#ffffff"
            className={isRefreshing ? "animate-spin" : ""}
          />
        </ActionIcon>
      </Tooltip>
    </div>,
    document.body
  );
}

export default FloatingRefreshButton;
