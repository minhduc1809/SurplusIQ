import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

export function StatCard({
  label,
  value,
  sub,
  icon,
  color = 'primary',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'info' | 'error';
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '10px',
            display: 'grid',
            placeItems: 'center',
            mb: 1.5,
            color: `${color}.main`,
            bgcolor: (t) => `color-mix(in srgb, ${t.palette[color].main} 12%, transparent)`,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
