import { Box, Group, Text, ThemeIcon, Badge } from "@mantine/core";
import { type ReactNode } from "react";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconColor?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  badge?: string;
  badgeColor?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "amber",
  trend,
  badge,
  badgeColor = "amber",
}: StatCardProps) {
  return (
    <Box className="stat-card-widget">
      <Group justify="space-between" align="flex-start" mb="sm">
        <Box>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.06em" }}>
            {title}
          </Text>
          <Text size="1.75rem" fw={800} mt={4} style={{ letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            {value}
          </Text>
        </Box>

        <ThemeIcon
          size={42}
          radius="md"
          variant="light"
          color={iconColor}
          style={{
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          }}
        >
          {icon}
        </ThemeIcon>
      </Group>

      <Group justify="space-between" align="center" mt="xs">
        {subtitle && (
          <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
            {subtitle}
          </Text>
        )}

        {trend && (
          <Badge
            size="sm"
            variant="light"
            color={trend.positive ? "green" : "red"}
          >
            {trend.value}
          </Badge>
        )}

        {badge && (
          <Badge size="sm" variant="light" color={badgeColor}>
            {badge}
          </Badge>
        )}
      </Group>
    </Box>
  );
}

export default StatCard;
