import { Chip, Stack } from '@mui/material';

export interface FilterOption {
  value: string;
  label: string;
}

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          onClick={() => onChange(o.value)}
          variant={value === o.value ? 'filled' : 'outlined'}
          color={value === o.value ? 'primary' : 'default'}
          sx={{ cursor: 'pointer', fontWeight: 600 }}
        />
      ))}
    </Stack>
  );
}
