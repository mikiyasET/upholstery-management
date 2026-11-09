import {
  Box,
  Group,
  Title,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Breadcrumbs,
  Anchor,
  Button,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCw, Plus } from "lucide-react";
import { FloatingRefreshButton } from "./FloatingRefreshButton";
import { cn } from "../../lib/utils";
import { type ReactNode } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: any;
}

export interface AddButtonConfig {
  label: ReactNode;
  onClick?: () => void;
  to?: string;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

export interface ExecutiveAddButtonProps {
  label: ReactNode;
  onClick?: () => void;
  to?: string;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Executive Add CTA Button matching Exporter-Docs luxury styling:
 * Warm Amber gradient, RiAddLine (18px), Plus Jakarta Sans font, 36px height.
 */
export function ExecutiveAddButton({
  label,
  onClick,
  to,
  icon,
  disabled,
  loading,
  className,
  style,
}: ExecutiveAddButtonProps) {
  const navigate = useNavigate();

  return (
    <Button
      variant="gradient"
      gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}

     //  gradient={{ from: "#F59E0B", to: "#D97706", deg: 135 }}
      radius="md"
      leftSection={icon !== undefined ? icon : <Plus size={18} />}
      disabled={disabled}
      loading={loading}
      className={cn("!w-full sm:!w-auto justify-center", className)}
      onClick={to ? () => navigate(to) : onClick}
      style={{
        boxShadow: disabled ? "none" : "0 2px 10px rgba(245, 158, 11, 0.25)",
        fontWeight: 600,
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        letterSpacing: "-0.01em",
        height: 36,
        ...style,
      }}
    >
      {label}
    </Button>
  );
}

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  badgeColor?: string;
  backTo?: string;
  hideBackOnMobile?: boolean;
  hideSubtitleOnMobile?: boolean;
  hideBadgeOnMobile?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshTooltip?: string;
  addButton?: AddButtonConfig;
  action?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  extraHeaderContent?: ReactNode;
  hasOtherFloatingButton?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  badgeColor = "amber",
  backTo,
  hideBackOnMobile = false,
  hideSubtitleOnMobile = false,
  hideBadgeOnMobile = false,
  onRefresh,
  isRefreshing = false,
  refreshTooltip = "Refresh data",
  addButton,
  action,
  primaryAction,
  secondaryAction,
  breadcrumbs,
  extraHeaderContent,
  hasOtherFloatingButton = false,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const effectiveAction = action || primaryAction;

  return (
    <Box mb="lg">
      {/* Optional Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs separator="›" separatorMargin="xs" mb="xs">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            if (isLast || !crumb.href) {
              return (
                <Text key={idx} size="xs" fw={600} c="dimmed">
                  {crumb.label}
                </Text>
              );
            }
            return (
              <Anchor
                key={idx}
                size="xs"
                c="dimmed"
                onClick={() => navigate(crumb.href!)}
                style={{
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  textDecoration: "none",
                }}
              >
                {crumb.icon && (
                  <crumb.icon
                    size={13}
                    style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
                  />
                )}
                <span>{crumb.label}</span>
              </Anchor>
            );
          })}
        </Breadcrumbs>
      )}

      {/* Main Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full">
        {/* Left: Back button + Title & Subtitle */}
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto flex-1">
          {backTo && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="md"
              onClick={() => navigate(backTo)}
              title="Go back"
              className={cn("shrink-0 mt-0.5", hideBackOnMobile && "!hidden sm:!inline-flex")}
            >
              <ArrowLeft size={20} />
            </ActionIcon>
          )}

          <Box style={{ minWidth: 0, flex: 1 }}>
            <Group gap="xs" align="center" wrap="wrap">
              {typeof title === "string" ? (
                <Title
                  order={2}
                  className="!text-xl sm:!text-2xl font-extrabold tracking-tight"
                  style={{ letterSpacing: "-0.02em", fontWeight: 800 }}
                >
                  {title}
                </Title>
              ) : (
                title
              )}

              {badge && (
                <Badge
                  variant="light"
                  color={badgeColor}
                  size="sm"
                  className={cn(hideBadgeOnMobile && "!hidden sm:!inline-flex")}
                  style={{ textTransform: "none", fontWeight: 600 }}
                >
                  {badge}
                </Badge>
              )}
            </Group>

            {subtitle && (
              <Text
                size="sm"
                c="dimmed"
                mt={3}
                className={cn("text-xs sm:text-sm", hideSubtitleOnMobile && "!hidden sm:!block")}
                style={{ maxWidth: 840 }}
              >
                {subtitle}
              </Text>
            )}

            {extraHeaderContent && <Box mt="xs">{extraHeaderContent}</Box>}
          </Box>
        </div>

        {/* Right: Refresh Toolbar & Add CTA Button Side by Side (Exporter-Docs Style) */}
        {(effectiveAction || addButton || secondaryAction || onRefresh) && (
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 [&>*]:!w-full sm:[&>*]:!w-auto [&_button]:!w-full sm:[&_button]:!w-auto">
            {onRefresh && (
              <Box visibleFrom={hasOtherFloatingButton ? undefined : "sm"} className="!w-auto">
                <Tooltip label={refreshTooltip} withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="amber"
                    size="lg"
                    radius="md"
                    loading={isRefreshing}
                    onClick={onRefresh}
                    aria-label={refreshTooltip}
                    style={{ height: 36, width: 36 }}
                  >
                    <RotateCw size={18} />
                  </ActionIcon>
                </Tooltip>
              </Box>
            )}

            {secondaryAction}

            {addButton && (
              <ExecutiveAddButton
                label={addButton.label}
                onClick={addButton.onClick}
                to={addButton.to}
                icon={addButton.icon}
                disabled={addButton.disabled}
                loading={addButton.loading}
              />
            )}

            {effectiveAction}
          </div>
        )}
      </div>

      {/* Floating Refresh Button for Mobile (< sm) */}
      {onRefresh && (
        <FloatingRefreshButton
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          tooltip={refreshTooltip}
          hasOtherFloatingButton={hasOtherFloatingButton}
        />
      )}
    </Box>
  );
}
