import { Box, Loader, Skeleton, Stack, Group, Card } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function PageLoadingFallback() {
  const { t } = useTranslation();

  return (
    <Box className="space-y-6 animate-fade-in w-full pb-8">
      {/* 1. Indeterminate Top Progress Accent Line */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[9999] overflow-hidden bg-primary/20 pointer-events-none">
        <div className="h-full w-1/2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 animate-progress-indeterminate rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
      </div>

      {/* 2. Executive Page Header Skeleton */}
      <Box className="bg-card p-5 rounded-2xl border border-border shadow-xs">
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Stack gap={6} style={{ flex: 1, minWidth: 200 }}>
            <Group gap="xs" align="center">
              <Skeleton height={26} width={180} radius="md" />
              <Skeleton height={20} width={70} radius="xl" />
            </Group>
            <Skeleton height={14} width={280} radius="sm" />
          </Stack>
          <Group gap="xs">
            <Skeleton height={36} width={110} radius="xl" />
            <Skeleton height={36} width={130} radius="xl" />
          </Group>
        </Group>
      </Box>

      {/* 3. Stat Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 rounded-xl border border-border/80 bg-card/60 shadow-2xs">
            <Stack gap={8}>
              <Skeleton height={12} width="40%" radius="xs" />
              <Skeleton height={24} width="70%" radius="sm" />
            </Stack>
          </Card>
        ))}
      </div>

      {/* 4. Main Content Skeleton (Table / Card View) with Center Loading Indicator */}
      <Box className="bg-card rounded-2xl border border-border shadow-xs p-6 min-h-[340px] flex flex-col justify-between relative overflow-hidden">
        {/* Subtle Background Skeleton Rows */}
        <Stack gap="md" className="opacity-40">
          <Skeleton height={40} radius="lg" />
          <Skeleton height={48} radius="lg" />
          <Skeleton height={48} radius="lg" />
          <Skeleton height={48} radius="lg" />
          <Skeleton height={48} radius="lg" />
        </Stack>

        {/* Foreground Animated Loading Focus */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 backdrop-blur-[1.5px] z-10 gap-3">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs flex items-center justify-center">
            <Loader color="amber" size="md" type="dots" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground animate-pulse tracking-wide">
            {t('errors.loadingPage', 'Loading page...')}
          </p>
        </div>
      </Box>
    </Box>
  );
}

export default PageLoadingFallback;
