import { Box, Button, Chip, Typography } from '@mui/material';
import { Sparkles, ArrowLeft } from 'lucide-react';

interface ComingSoonV2Props {
  title: string;
  description?: string;
  onBack?: () => void;
}

export function ComingSoonV2Page({ title, description, onBack }: ComingSoonV2Props) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: 460,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '24px',
            background:
              'linear-gradient(135deg, rgba(31,59,179,0.1) 0%, rgba(14,165,233,0.1) 100%)',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.main',
          }}
        >
          <Sparkles size={36} />
        </Box>
        <Box>
          <Chip label="Sắp ra mắt" color="primary" size="small" sx={{ mb: 1.5, fontWeight: 700 }} />
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            {description ??
              'Tính năng này đang được phát triển và sẽ sớm ra mắt trong phiên bản tới.'}
          </Typography>
        </Box>
        {onBack && (
          <Button startIcon={<ArrowLeft size={16} />} variant="outlined" onClick={onBack}>
            Quay lại
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default ComingSoonV2Page;
