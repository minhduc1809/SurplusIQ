import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import { api } from '../../../../lib/api';

export type ContractStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEED_MORE_INFO';

export interface LegalProfile {
  legalName: string;
  businessType: 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';
  taxCode: string | null;
  businessLicenseNo: string | null;
  representativeName: string;
  representativePhone: string;
  legalAddress: string;
}

export interface ContractView {
  id: string;
  status: ContractStatus;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface OverviewData {
  profile: LegalProfile | null;
  contract: ContractView | null;
}

const BUSINESS_TYPES = [
  { value: 'HOUSEHOLD', label: 'Hộ kinh doanh cá thể' },
  { value: 'COMPANY', label: 'Doanh nghiệp / Công ty' },
  { value: 'INDIVIDUAL', label: 'Cá nhân kinh doanh' },
];

const STATUS_CONFIG: Record<
  ContractStatus,
  {
    label: string;
    color: 'warning' | 'success' | 'error' | 'info';
    desc: string;
    icon: typeof Clock;
  }
> = {
  PENDING_REVIEW: {
    label: 'Chờ duyệt',
    color: 'warning',
    desc: 'Hồ sơ và hợp đồng đã được gửi lên. Đội ngũ kiểm duyệt sàn SurplusIQ đang xử lý thẩm định.',
    icon: Clock,
  },
  NEED_MORE_INFO: {
    label: 'Cần bổ sung thông tin',
    color: 'info',
    desc: 'Quản trị viên đã xem xét và yêu cầu bạn bổ sung / tải lại bản scan hợp đồng theo ghi chú bên dưới.',
    icon: AlertCircle,
  },
  REJECTED: {
    label: 'Bị từ chối',
    color: 'error',
    desc: 'Hồ sơ chưa đạt yêu cầu quy chế sàn. Vui lòng kiểm tra lý do và nộp lại bản hợp lệ.',
    icon: AlertCircle,
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    color: 'success',
    desc: 'Hợp đồng hợp tác đã được phê duyệt chính thức. Cửa hàng đủ điều kiện pháp lý để hoạt động và nhận đối soát.',
    icon: CheckCircle2,
  },
};

export function StoreLegalKYCPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [data, setData] = useState<OverviewData | null>(null);

  // Form states
  const [legalName, setLegalName] = useState('');
  const [businessType, setBusinessType] = useState<'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY'>(
    'HOUSEHOLD',
  );
  const [taxCode, setTaxCode] = useState('');
  const [license, setLicense] = useState('');
  const [repName, setRepName] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<OverviewData>('/store/legal-profile');
      setData(res);
      if (res.profile) {
        setLegalName(res.profile.legalName || '');
        setBusinessType(res.profile.businessType || 'HOUSEHOLD');
        setTaxCode(res.profile.taxCode || '');
        setLicense(res.profile.businessLicenseNo || '');
        setRepName(res.profile.representativeName || '');
        setRepPhone(res.profile.representativePhone || '');
        setLegalAddress(res.profile.legalAddress || '');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);

    if (!legalName.trim()) {
      setError('Vui lòng nhập tên pháp lý theo giấy phép kinh doanh.');
      return;
    }
    if (!repName.trim()) {
      setError('Vui lòng nhập họ tên người đại diện pháp luật.');
      return;
    }
    if (!repPhone.trim()) {
      setError('Vui lòng nhập số điện thoại người đại diện.');
      return;
    }
    if (!legalAddress.trim()) {
      setError('Vui lòng nhập địa chỉ kinh doanh đăng ký.');
      return;
    }

    setSavingProfile(true);
    try {
      await api.put('/store/legal-profile', {
        legalName: legalName.trim(),
        businessType,
        taxCode: taxCode.trim() || undefined,
        businessLicenseNo: license.trim() || undefined,
        representativeName: repName.trim(),
        representativePhone: repPhone.trim(),
        legalAddress: legalAddress.trim(),
      });
      setSuccessMsg('Đã lưu thông tin hồ sơ kinh doanh thành công.');
      await loadOverview();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setError('Tệp scan tối đa 10 MB. Vui lòng chọn tệp nhỏ hơn.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUploadContract = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn tệp bản scan hợp đồng (PDF, JPG, PNG).');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await api.upload('/store/contract', formData);
      setSuccessMsg(
        'Đã tải hợp đồng lên thành công! Hồ sơ đã được chuyển sang trạng thái "Chờ duyệt".',
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadOverview();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleViewContractFile = async () => {
    try {
      const token = localStorage.getItem('sq_store_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_URL}/store/contract/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không thể tải tệp hợp đồng');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  const contract = data?.contract;
  const hasProfile = Boolean(data?.profile);
  const isApproved = contract?.status === 'APPROVED';
  const isNeedInfo = contract?.status === 'NEED_MORE_INFO';
  const isRejected = contract?.status === 'REJECTED';

  // Active step in stepper
  let activeStep = 0;
  if (hasProfile) activeStep = 1;
  if (contract) activeStep = 2;
  if (isApproved) activeStep = 3;

  const statusMeta = contract?.status ? STATUS_CONFIG[contract.status] : null;

  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      {/* Thông báo kết quả */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Tiến trình thẩm định */}
      <Card sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Quy trình thẩm định hồ sơ cửa hàng
        </Typography>
        <Stepper activeStep={activeStep} alternativeLabel>
          <Step completed={hasProfile}>
            <StepLabel>Điền hồ sơ kinh doanh</StepLabel>
          </Step>
          <Step completed={Boolean(contract)}>
            <StepLabel>Gửi bản scan hợp đồng</StepLabel>
          </Step>
          <Step completed={isApproved}>
            <StepLabel>Sàn phê duyệt (KYC)</StepLabel>
          </Step>
        </Stepper>
      </Card>

      {/* Card 1: Trạng thái duyệt hồ sơ & Tải lên hợp đồng */}
      <Card
        sx={{
          p: 3,
          borderLeft: '4px solid',
          borderColor: statusMeta ? `${statusMeta.color}.main` : 'grey.400',
        }}
      >
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <FileCheck size={20} />
              Trạng thái duyệt hồ sơ hợp đồng
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {statusMeta ? statusMeta.desc : 'Bạn chưa tải lên bản scan hợp đồng hợp tác đã ký.'}
            </Typography>
          </Box>
          <Box>
            {statusMeta ? (
              <Chip
                label={statusMeta.label}
                color={statusMeta.color}
                icon={<statusMeta.icon size={16} />}
                sx={{ fontWeight: 700, fontSize: '0.875rem', px: 1 }}
              />
            ) : (
              <Chip label="Chưa tải lên" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
          </Box>
        </Stack>

        {/* Ghi chú phản hồi của Quản trị viên nếu cần bổ sung hoặc từ chối */}
        {(isNeedInfo || isRejected) && contract?.reviewNote && (
          <Alert severity={isNeedInfo ? 'warning' : 'error'} sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Ghi chú từ Quản trị viên sàn SurplusIQ:
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {contract.reviewNote}
            </Typography>
          </Alert>
        )}

        {/* Thông tin tệp hiện tại */}
        {contract && (
          <Box sx={{ mt: 2.5, p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <FileText size={24} color="#64748b" />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {contract.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(contract.sizeBytes / (1024 * 1024)).toFixed(2)} MB • Gửi lúc:{' '}
                    {new Date(contract.createdAt).toLocaleString('vi-VN')}
                  </Typography>
                </Box>
              </Stack>
              <Button
                variant="outlined"
                size="small"
                onClick={handleViewContractFile}
                sx={{ textTransform: 'none' }}
              >
                Xem tệp đã gửi
              </Button>
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 2.5 }} />

        {/* Khu vực nộp/gửi tệp scan hợp đồng mới */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {contract ? 'Cập nhật / Tải lên bản hợp đồng mới' : 'Tải lên bản scan hợp đồng đã ký'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            In mẫu hợp đồng hợp tác, ký đóng dấu đầy đủ các trang, scan hoặc chụp rõ nét (định dạng
            PDF, JPG hoặc PNG, dung lượng tối đa 10 MB). Tệp lưu riêng tư an toàn trên máy chủ.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,image/jpeg,image/png"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              id="upload-contract-input"
            />
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadCloud size={18} />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ textTransform: 'none' }}
            >
              {selectedFile ? 'Chọn tệp khác' : 'Chọn tệp scan từ máy'}
            </Button>

            {selectedFile && (
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Đã chọn: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </Typography>
            )}

            <Button
              variant="contained"
              color="primary"
              disabled={!selectedFile || uploading}
              onClick={handleUploadContract}
              startIcon={
                uploading ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={18} />
              }
              sx={{ textTransform: 'none', ml: { sm: 'auto' } }}
            >
              {uploading ? 'Đang gửi hồ sơ...' : 'Gửi lên sàn thẩm định'}
            </Button>
          </Stack>
        </Box>
      </Card>

      {/* Card 2: Thông tin pháp lý (Hồ sơ kinh doanh) */}
      <Card sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Thông tin hồ sơ kinh doanh
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Thông tin pháp lý chính xác giúp việc đối soát dòng tiền và xuất hóa đơn minh bạch.
        </Typography>

        <Box component="form" onSubmit={handleSaveProfile}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
            <TextField
              fullWidth
              label="Tên pháp lý (theo giấy phép / ĐKKD)"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              required
              size="small"
            />
            <TextField
              fullWidth
              select
              label="Loại hình kinh doanh"
              value={businessType}
              onChange={(e) =>
                setBusinessType(e.target.value as 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY')
              }
              size="small"
            >
              {BUSINESS_TYPES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              mt: 2,
            }}
          >
            <TextField
              fullWidth
              label="Mã số thuế"
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
              placeholder="10 hoặc 13 số"
              size="small"
            />
            <TextField
              fullWidth
              label="Số giấy phép / đăng ký kinh doanh"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              size="small"
            />
            <TextField
              fullWidth
              label="Họ tên người đại diện pháp luật"
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              required
              size="small"
            />
            <TextField
              fullWidth
              label="Số điện thoại người đại diện"
              value={repPhone}
              onChange={(e) => setRepPhone(e.target.value)}
              required
              size="small"
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Địa chỉ kinh doanh theo giấy phép"
              value={legalAddress}
              onChange={(e) => setLegalAddress(e.target.value)}
              required
              multiline
              rows={2}
              size="small"
            />
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={savingProfile}
              sx={{ textTransform: 'none', minWidth: 160 }}
            >
              {savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ kinh doanh'}
            </Button>
          </Box>
        </Box>
      </Card>
    </Stack>
  );
}
