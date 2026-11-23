import React, { type ReactNode } from "react";
import { Button as MantineButton } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";

export interface ExecutiveButtonProps {
  children?: ReactNode;
  label?: ReactNode;
  onClick?: (e?: any) => void;
  to?: string;
  icon?: ReactNode;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: React.CSSProperties;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  fullWidth?: boolean;
}

/**
 * Executive Button: Unified luxury CTA matching the Add Brand styling.
 * Warm Amber gradient, Plus Jakarta Sans font, 36px height (md), glowing shadow.
 */
export const ExecutiveButton: React.FC<ExecutiveButtonProps> = ({
  children,
  label,
  onClick,
  to,
  icon,
  leftSection,
  rightSection,
  disabled,
  loading,
  type = "button",
  className,
  style,
  size = "md",
  variant = "primary",
  fullWidth = false,
}) => {
  const navigate = useNavigate();
  const content = children !== undefined ? children : label;
  const effectiveLeft = leftSection !== undefined ? leftSection : icon;

  const heightMap = {
    xs: 28,
    sm: 32,
    md: 36,
    lg: 42,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || loading) return;
    if (to) {
      navigate(to);
    } else if (onClick) {
      onClick(e);
    }
  };

  if (variant !== "primary") {
    return (
      <MantineButton
        type={type}
        variant={variant === "outline" ? "default" : variant === "danger" ? "light" : variant}
        color={variant === "danger" ? "red" : undefined}
        radius="md"
        size={size}
        leftSection={effectiveLeft}
        rightSection={rightSection}
        disabled={disabled}
        loading={loading}
        fullWidth={fullWidth}
        className={cn(fullWidth ? "!w-full" : "justify-center", className)}
        onClick={handleClick}
        style={{
          height: heightMap[size] || 36,
          fontWeight: 600,
          fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          letterSpacing: "-0.01em",
          ...style,
        }}
      >
        {content}
      </MantineButton>
    );
  }

  return (
    <MantineButton
      type={type}
      variant="gradient"
      gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
      radius="md"
      size={size}
      leftSection={effectiveLeft}
      rightSection={rightSection}
      disabled={disabled}
      loading={loading}
      fullWidth={fullWidth}
      className={cn(fullWidth ? "!w-full" : "justify-center", className)}
      onClick={handleClick}
      style={{
        boxShadow: disabled ? "none" : "0 2px 10px rgba(245, 158, 11, 0.25)",
        fontWeight: 600,
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        letterSpacing: "-0.01em",
        height: heightMap[size] || 36,
        ...style,
      }}
    >
      {content}
    </MantineButton>
  );
};
