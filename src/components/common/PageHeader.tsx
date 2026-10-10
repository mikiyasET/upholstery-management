import { Box, Group, Title, Text, Badge, ActionIcon, Tooltip, Breadcrumbs, Anchor } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { RiArrowLeftLine, RiRefreshLine } from "react-icons/ri";
import { type ReactNode } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: any;
}

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  badgeColor?: string;
  backTo?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshTooltip?: string;
  action?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  extraHeaderContent?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  badgeColor = "amber",
  backTo,
  onRefresh,
  isRefreshing = false,
  refreshTooltip = "Refresh data",
  action,
  primaryAction,
  secondaryAction,
  breadcrumbs,
  extraHeaderContent,
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
                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                {crumb.icon && <crumb.icon size={13} />}
                {crumb.label}
              </Anchor>
            );
          })}
        </Breadcrumbs>
      )}

      {/* Main Header Row */}
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        {/* Left: Back button + Title & Subtitle */}
        <Group gap="sm" align="flex-start" wrap="nowrap" style={{ minWidth: 0, flex: "1 1 auto" }}>
          {backTo && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="md"
              onClick={() => navigate(backTo)}
              title="Go back"
              style={{ flexShrink: 0, marginTop: 2 }}
            >
              <RiArrowLeftLine size={20} />
            </ActionIcon>
          )}

          <Box style={{ minWidth: 0, flex: 1 }}>
            <Group gap="xs" align="center" wrap="wrap">
              {typeof title === "string" ? (
                <Title order={2} style={{ letterSpacing: "-0.02em", fontWeight: 800 }}>
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
                  style={{ textTransform: "none", fontWeight: 600 }}
                >
                  {badge}
                </Badge>
              )}
            </Group>

            {subtitle && (
              <Text size="sm" c="dimmed" mt={3} style={{ maxWidth: 840 }}>
                {subtitle}
              </Text>
            )}

            {extraHeaderContent && <Box mt="xs">{extraHeaderContent}</Box>}
          </Box>
        </Group>

        {/* Right: Action Buttons & Refresh Toolbar */}
        <Group gap="xs" align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
          {onRefresh && (
            <Tooltip label={refreshTooltip} withArrow>
              <ActionIcon
                variant="subtle"
                color="amber"
                size="lg"
                radius="md"
                loading={isRefreshing}
                onClick={onRefresh}
                aria-label={refreshTooltip}
              >
                <RiRefreshLine size={18} />
              </ActionIcon>
            </Tooltip>
          )}

          {secondaryAction}
          {effectiveAction}
        </Group>
      </Group>
    </Box>
  );
}
