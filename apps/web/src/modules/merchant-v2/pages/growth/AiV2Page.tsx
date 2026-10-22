import { useRef, useState } from 'react';
import { Alert, Box, Button, Card, Stack, TextField, Typography } from '@mui/material';
import { api } from '../../../../lib/api';
import { PageHeader } from '../../components/PageHeader';

interface Msg {
  from: 'me' | 'ai';
  text: string;
}
interface ChatReply {
  conversationId: string;
  reply: string;
}

const SUGGESTIONS = [
  'Hôm nay còn dư nhiều, nên giảm giá bao nhiêu % để bán hết?',
  'Gợi ý cách xử lý các món sắp hết hạn.',
  'Làm sao để tăng số đơn vào cuối ngày?',
];

/** Hỏi đáp với trợ lý AI của cửa hàng (chủ/quản lý). Lịch sử cuộc trò chuyện giữ trong phiên hiện tại. */
export function AiV2Page() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conv = useRef<string | undefined>(undefined);

  const send = async (q: string) => {
    const message = q.trim();
    if (!message || busy) return;
    setMsgs((m) => [...m, { from: 'me', text: message }]);
    setText('');
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<ChatReply>('/store/ai/chat', {
        message,
        conversationId: conv.current,
      });
      conv.current = r.conversationId;
      setMsgs((m) => [...m, { from: 'ai', text: r.reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader title="Trợ lý AI" subtitle="Tư vấn định giá, vận hành và giảm lãng phí" />
      <Card sx={{ p: 2 }}>
        <Stack spacing={1.5} sx={{ minHeight: 240, mb: 2 }}>
          {msgs.length === 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {SUGGESTIONS.map((s) => (
                <Button key={s} size="small" variant="outlined" onClick={() => void send(s)}>
                  {s}
                </Button>
              ))}
            </Stack>
          )}
          {msgs.map((m, i) => (
            <Box
              key={i}
              sx={{
                alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: m.from === 'me' ? 'primary.main' : 'action.hover',
                color: m.from === 'me' ? 'primary.contrastText' : 'text.primary',
                whiteSpace: 'pre-wrap',
              }}
            >
              <Typography variant="body2">{m.text}</Typography>
            </Box>
          ))}
          {busy && <Typography variant="caption">Trợ lý đang trả lời…</Typography>}
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Nhập câu hỏi (tối đa 1000 ký tự)"
            value={text}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void send(text)}
          />
          <Button
            variant="contained"
            disabled={busy || !text.trim()}
            onClick={() => void send(text)}
          >
            Gửi
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}
