// Nạp dữ liệu hồ sơ pháp lý và hợp đồng kinh doanh scan (KYC) cho các cửa hàng.
// Phục vụ quy trình duyệt tay của Super Admin trên cổng /admin/merchants.
// Chạy: node scripts/seed-kyc-contracts.mjs
import { createRequire } from 'node:module';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
require('dotenv').config({ path: new URL('../.env', import.meta.url) });

const DB = process.env.POSTGRES_DB || 'surplusiq_db';
if (
  process.env.NODE_ENV === 'production' ||
  /prod/i.test(DB) ||
  !/^(localhost|127\.0\.0\.1)$/.test(process.env.DB_HOST || 'localhost')
) {
  console.error('Từ chối chạy: chỉ dùng cho DB dev trên máy local.');
  process.exit(1);
}

/** Tạo tệp PDF scan hợp đồng hợp lệ theo chuẩn PDF 1.4 có tiêu đề, điều khoản và chữ ký */
function createContractPdf(data) {
  const lines = [
    'CONG HOA XA HOI CHU NGHIA VIET NAM',
    'Doc lap - Tu do - Hanh phuc',
    '-------------------------------------------------------',
    'HOP DONG HOP TAC KINH DOANH NEN TANG SURPLUSIQ',
    `So: HD-SIQ/${new Date().getFullYear()}/${data.storeId.slice(0, 8).toUpperCase()}`,
    '',
    'BEN A: CONG TY CO PHAN CONG NGHE SURPLUSIQ',
    'Dai dien: Ong Nguyen Van Quan - Tong Giam Doc',
    'Dia chi: So 1 Pham Hung, Quan Nam Tu Liem, Ha Noi',
    '',
    `BEN B (DOI TAC): ${data.legalName.toUpperCase()}`,
    `Loai hinh: ${data.businessType}`,
    `Ma so thue: ${data.taxCode || 'Dang cap nhat'}`,
    `So GPKD: ${data.licenseNo || 'Dang cap nhat'}`,
    `Nguoi dai dien: ${data.repName}`,
    `So dien thoai: ${data.repPhone}`,
    `Dia chi kinh doanh: ${data.address}`,
    '',
    'DIEU 1: PHAM VI HOP TAC',
    'Ben B dong y dang ky mo ban cac goi mon an cuu tro tren nen tang SurplusIQ theo BRD Ch.13.',
    'Thuc pham phai dam bao 100% ve sinh an toan thuc pham, con han su dung.',
    '',
    'DIEU 2: TY LE HOA HONG & DOI SOAT TAI CHINH',
    'Ty le hoa hong san co dinh: 10% tren gia tri don hang thuc nhan (BR-075 / VC-10).',
    'Ky doi soat dinh ky vao thu Hai hang tuan, chuyen khoan quyet toan trong 48 gio lam viec.',
    '',
    'DIEU 3: CAM KET VA CHU KY XAC NHAN',
    'Hai ben da doc, hieu ro va dong y voi moi quy che hoat dong tren san giao dich SurplusIQ.',
    '',
    'DAI DIEN BEN A (SURPLUSIQ)                 DAI DIEN BEN B (CHU CUA HANG)',
    '(Da ky & dong dau xac nhan)                (Da ky & dong dau scan)',
    '                                           ' + data.repName,
  ];

  let streamContent = 'BT\n/F1 9 Tf\n50 750 Td\n15 TL\n';
  for (const line of lines) {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    streamContent += `(${escaped}) '\n`;
  }
  streamContent += 'ET';

  const streamLen = Buffer.byteLength(streamContent);
  const pdfString = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj
5 0 obj << /Length ${streamLen} >> stream
${streamContent}
endstream endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000323 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
${420 + streamLen}
%%EOF`;

  return Buffer.from(pdfString);
}

async function runSeed() {
  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: +process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: DB,
  });
  await db.connect();

  const rootDir = fileURLToPath(new URL('..', import.meta.url));
  const uploadRoot = path.join(rootDir, 'apps/backend/private-uploads');
  const contractsDir = path.join(uploadRoot, 'contracts');
  await fs.mkdir(contractsDir, { recursive: true });

  const adminUserId = 'a0000000-0000-4000-8000-000000000001';

  // Danh sách kịch bản nộp hợp đồng & hồ sơ pháp lý đa dạng cho Admin duyệt tay
  const storeKycScenarios = [
    // ---------------------------------------------------------
    // 1. Quán Chờ Duyệt (Chủ: chuthucan.choduyet@surplusiq.vn) -> PENDING_REVIEW
    // ---------------------------------------------------------
    {
      storeId: 'a1000000-0000-4000-8000-0000000000e1',
      storeStatus: 'PENDING_VERIFY',
      legalName: 'Hộ kinh doanh Quán Cơm Chờ Duyệt',
      businessType: 'HOUSEHOLD',
      taxCode: '0109876543',
      licenseNo: '01A8012345/HKD-CG',
      repName: 'Hoàng Đức Anh',
      repPhone: '0988300003',
      address: 'Số 1 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
      contractStatus: 'PENDING_REVIEW',
      fileName: 'hop-dong-quan-cho-duyet-signed.pdf',
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    // ---------------------------------------------------------
    // 2. Cơm Tấm Sườn Nướng 234 (Chủ: chuthucan3.hanoi@surplusiq.vn) -> PENDING_REVIEW
    // ---------------------------------------------------------
    {
      storeId: 'a1000000-0000-4000-8000-000000000003',
      storeStatus: 'PENDING_VERIFY',
      legalName: 'Hộ kinh doanh Cơm Tấm Sườn Nướng 234 HQV',
      businessType: 'HOUSEHOLD',
      taxCode: '0108765432',
      licenseNo: '01A8087654/HKD-CG',
      repName: 'Nguyễn Văn Hùng',
      repPhone: '0988123003',
      address: '82 Ngõ 234 Hoàng Quốc Việt, Phường Nghĩa Đô, Cầu Giấy, Hà Nội',
      contractStatus: 'PENDING_REVIEW',
      fileName: 'hop-dong-com-tam-234-hqv.pdf',
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    // ---------------------------------------------------------
    // 3. Bánh Mì Chảo 86 Ngõ 234 Hoàng Quốc Việt -> PENDING_REVIEW
    // ---------------------------------------------------------
    {
      storeId: 'a1000000-0000-4000-8000-000000000041',
      storeStatus: 'PENDING_VERIFY',
      legalName: 'Hộ kinh doanh Bánh Mì Chảo 86',
      businessType: 'HOUSEHOLD',
      taxCode: '0107654321',
      licenseNo: '01A8076543/HKD-CG',
      repName: 'Lê Hoàng Long',
      repPhone: '0988123041',
      address: '86 Ngõ 234 Hoàng Quốc Việt, Phường Nghĩa Đô, Cầu Giấy, Hà Nội',
      contractStatus: 'PENDING_REVIEW',
      fileName: 'hop-dong-banh-mi-chao-86-signed.pdf',
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    // ---------------------------------------------------------
    // 4. Rincón del Pan Pasteur (Chủ: owner7@surplusiq.test) -> NEED_MORE_INFO
    // ---------------------------------------------------------
    {
      storeId: '428e11bf-4aeb-5f99-a8bf-c54c00b8774d',
      storeStatus: 'PENDING_VERIFY',
      legalName: 'Công ty TNHH Bánh Mì Rincón Việt Nam',
      businessType: 'COMPANY',
      taxCode: '0312456789',
      licenseNo: '0312456789/DKKD-TPHCM',
      repName: 'Trần Thị Mai',
      repPhone: '0903123456',
      address: '120 Pasteur, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      contractStatus: 'NEED_MORE_INFO',
      fileName: 'hop-dong-rincon-pasteur-scan.pdf',
      reviewNote:
        'Bản scan trang 2 bị mờ và thiếu dấu giáp lai đại diện pháp luật, vui lòng scan lại bản gốc rõ nét và tải lại trong vòng 48h.',
      reviewedBy: adminUserId,
      reviewedAt: new Date(Date.now() - 36 * 3600 * 1000),
    },
    // ---------------------------------------------------------
    // 5. Niêu Quán - Tô Hiệu -> REJECTED (Bị từ chối)
    // ---------------------------------------------------------
    {
      storeId: 'a1000000-0000-4000-8000-000000000007',
      storeStatus: 'PENDING_VERIFY',
      legalName: 'Hộ kinh doanh Niêu Quán Tô Hiệu',
      businessType: 'HOUSEHOLD',
      taxCode: '0106543210',
      licenseNo: '01A8065432/HKD-CG',
      repName: 'Đỗ Văn Nam',
      repPhone: '0988123007',
      address: '108B D4, Ngõ 215 Tô Hiệu, Phường Nghĩa Đô, Cầu Giấy, Hà Nội',
      contractStatus: 'REJECTED',
      fileName: 'hop-dong-nieu-quan-invalid.pdf',
      reviewNote:
        'Giấy phép kinh doanh đã hết hiệu lực từ tháng trước và số điện thoại người đại diện không liên lạc được.',
      reviewedBy: adminUserId,
      reviewedAt: new Date(Date.now() - 48 * 3600 * 1000),
    },
    // ---------------------------------------------------------
    // 6. Cơm Thố Anh Nguyễn (Chủ: chuthucan.hanoi@surplusiq.vn) -> APPROVED
    // ---------------------------------------------------------
    {
      storeId: 'a1000000-0000-4000-8000-000000000001',
      storeStatus: 'ACTIVE',
      legalName: 'Hộ kinh doanh Cơm Thố Anh Nguyễn',
      businessType: 'HOUSEHOLD',
      taxCode: '0108889999',
      licenseNo: '01A8099999/HKD-CG',
      repName: 'Nguyễn Anh Tuấn',
      repPhone: '0988123001',
      address: '142 Hoàng Quốc Việt, Phường Nghĩa Đô, Cầu Giấy, Hà Nội',
      contractStatus: 'APPROVED',
      fileName: 'hop-dong-com-tho-anh-nguyen-official.pdf',
      reviewNote: 'Hồ sơ pháp lý và chữ ký đại diện đầy đủ, hợp lệ theo quy chế sàn.',
      reviewedBy: adminUserId,
      reviewedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
    // ---------------------------------------------------------
    // 7. Cơm Lệ 255 Tô Hiệu -> APPROVED
    // ---------------------------------------------------------
    {
      storeId: 'a1000000-0000-4000-8000-000000000004',
      storeStatus: 'ACTIVE',
      legalName: 'Hộ kinh doanh Quán Cơm Lệ',
      businessType: 'HOUSEHOLD',
      taxCode: '0105432109',
      licenseNo: '01A8054321/HKD-CG',
      repName: 'Nguyễn Thị Lệ',
      repPhone: '0988123004',
      address: '255 Tô Hiệu, Phường Nghĩa Đô, Cầu Giấy, Hà Nội',
      contractStatus: 'APPROVED',
      fileName: 'hop-dong-com-le-255-to-hieu.pdf',
      reviewNote: 'Đã đối soát thông tin doanh nghiệp trùng khớp với cơ sở dữ liệu quốc gia.',
      reviewedBy: adminUserId,
      reviewedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    },
  ];

  console.log('\n=== SEED HỒ SƠ PHÁP LÝ & HỢP ĐỒNG SCAN KYC ===');

  for (const s of storeKycScenarios) {
    // 1. Cập nhật trạng thái cửa hàng
    await db.query('UPDATE stores SET status = $1 WHERE id = $2', [s.storeStatus, s.storeId]);

    // 2. Tạo tệp PDF scan hợp đồng
    const storeSubdir = path.join(contractsDir, s.storeId);
    await fs.mkdir(storeSubdir, { recursive: true });
    const relativePath = path.join('contracts', s.storeId, s.fileName).replace(/\\/g, '/');
    const absolutePath = path.join(uploadRoot, relativePath);
    const pdfBuf = createContractPdf(s);
    await fs.writeFile(absolutePath, pdfBuf);

    // 3. Upsert hồ sơ pháp lý (store_legal_profiles)
    await db.query(
      `INSERT INTO store_legal_profiles (
        store_id, legal_name, business_type, tax_code, business_license_no,
        representative_name, representative_phone, legal_address, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
      ON CONFLICT (store_id) DO UPDATE SET
        legal_name = EXCLUDED.legal_name,
        business_type = EXCLUDED.business_type,
        tax_code = EXCLUDED.tax_code,
        business_license_no = EXCLUDED.business_license_no,
        representative_name = EXCLUDED.representative_name,
        representative_phone = EXCLUDED.representative_phone,
        legal_address = EXCLUDED.legal_address,
        updated_at = now()`,
      [
        s.storeId,
        s.legalName,
        s.businessType,
        s.taxCode,
        s.licenseNo,
        s.repName,
        s.repPhone,
        s.address,
      ],
    );

    // 4. Lấy owner_user_id của quán
    const { rows: storeRows } = await db.query('SELECT owner_user_id FROM stores WHERE id = $1', [
      s.storeId,
    ]);
    const uploadedBy = storeRows[0]?.owner_user_id || adminUserId;

    // 5. Xóa hợp đồng cũ và thêm hợp đồng scan mới
    await db.query('DELETE FROM store_contracts WHERE store_id = $1', [s.storeId]);
    await db.query(
      `INSERT INTO store_contracts (
        store_id, status, file_path, file_name, mime_type, size_bytes,
        uploaded_by, review_note, reviewed_by, reviewed_at, created_at
      ) VALUES ($1, $2, $3, $4, 'application/pdf', $5, $6, $7, $8, $9, now())`,
      [
        s.storeId,
        s.contractStatus,
        relativePath,
        s.fileName,
        pdfBuf.length,
        uploadedBy,
        s.reviewNote,
        s.reviewedBy,
        s.reviewedAt,
      ],
    );

    const statusBadge =
      s.contractStatus === 'PENDING_REVIEW'
        ? '⏳ CHỜ DUYỆT TAY'
        : s.contractStatus === 'NEED_MORE_INFO'
          ? '⚠️ YÊU CẦU BỔ SUNG'
          : s.contractStatus === 'APPROVED'
            ? '✅ ĐÃ DUYỆT'
            : '❌ TỪ CHỐI';

    console.log(`- ${statusBadge}: [${s.storeStatus}] ${s.legalName} (${s.fileName})`);
  }

  // Quán chưa nộp hợp đồng (để test tính năng Admin bấm Nhắc nhở KYC)
  const unsubmittedStoreId = 'a1000000-0000-4000-8000-000000000038'; // Bami Bread
  await db.query("UPDATE stores SET status = 'PENDING_VERIFY' WHERE id = $1", [unsubmittedStoreId]);
  await db.query('DELETE FROM store_contracts WHERE store_id = $1', [unsubmittedStoreId]);
  await db.query('DELETE FROM store_legal_profiles WHERE store_id = $1', [unsubmittedStoreId]);
  console.log('- 📢 CHƯA NỘP HỢP ĐỒNG: Bami Bread - Hoàng Quốc Việt (Sẵn sàng test nút Nhắc nhở)');

  await db.end();
  console.log('\n✓ Hoàn tất nạp dữ liệu hồ sơ pháp lý và hợp đồng scan KYC thành công!');
}

runSeed().catch((err) => {
  console.error('Lỗi khi nạp dữ liệu KYC:', err);
  process.exit(1);
});
