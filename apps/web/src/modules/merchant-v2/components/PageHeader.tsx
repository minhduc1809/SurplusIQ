import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}
    >
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
