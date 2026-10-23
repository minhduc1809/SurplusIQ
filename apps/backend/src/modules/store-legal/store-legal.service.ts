import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StoreLegalProfileEntity } from '../../entities/stores/store-legal-profile.entity';
import { ContractStatus, StoreContractEntity } from '../../entities/stores/store-contract.entity';
import { ReviewContractDto, UpsertLegalProfileDto } from './dto/store-legal.dto';

export const MAX_CONTRACT_BYTES = 10 * 1024 * 1024;

export interface ContractUpload {
  buffer: Buffer;
  size: number;
  originalname: string;
}

/** Nhận diện định dạng thật của tệp bằng chữ ký đầu tệp, không tin đuôi tệp hay mimetype do client gửi. */
export function detectContractType(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('latin1') === '%PDF') {
    return { mime: 'application/pdf', ext: 'pdf' };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length >= 8 && buf.subarray(0, 8).equals(png)) return { mime: 'image/png', ext: 'png' };
  return null;
}

/** Thư mục lưu tệp riêng tư (không được phục vụ tĩnh). */
export function privateUploadRoot() {
  return process.env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), 'private-uploads');
}

@Injectable()
export class StoreLegalService {
  constructor(
    @InjectRepository(StoreLegalProfileEntity)
    private readonly profileRepo: Repository<StoreLegalProfileEntity>,
    @InjectRepository(StoreContractEntity)
    private readonly contractRepo: Repository<StoreContractEntity>,
  ) {}

  private toContractView(c: StoreContractEntity | null) {
    if (!c) return null;
    return {
      id: c.id,
      status: c.status,
      fileName: c.fileName,
      mimeType: c.mimeType,
      sizeBytes: c.sizeBytes,
      reviewNote: c.reviewNote,
      reviewedAt: c.reviewedAt,
      createdAt: c.createdAt,
    };
  }

  async getOverview(storeId: string) {
    const [profile, contract] = await Promise.all([
      this.profileRepo.findOne({ where: { storeId } }),
      this.contractRepo.findOne({ where: { storeId }, order: { createdAt: 'DESC' } }),
    ]);
    return { profile, contract: this.toContractView(contract) };
  }

  async upsertProfile(storeId: string, dto: UpsertLegalProfileDto) {
    const existing = await this.profileRepo.findOne({ where: { storeId } });
    const entity = this.profileRepo.create({
      ...(existing ?? {}),
      storeId,
      legalName: dto.legalName.trim(),
      businessType: dto.businessType,
      taxCode: dto.taxCode?.trim() || null,
      businessLicenseNo: dto.businessLicenseNo?.trim() || null,
      representativeName: dto.representativeName.trim(),
      representativePhone: dto.representativePhone.trim(),
      legalAddress: dto.legalAddress.trim(),
    });
    return this.profileRepo.save(entity);
  }

  async uploadContract(storeId: string, userId: string, file?: ContractUpload) {
    if (!file || !file.buffer?.length) throw new BadRequestException('Chưa chọn tệp hợp đồng.');
    if (file.size > MAX_CONTRACT_BYTES) throw new BadRequestException('Tệp hợp đồng tối đa 10 MB.');
    const type = detectContractType(file.buffer);
    if (!type) throw new BadRequestException('Hợp đồng phải là tệp PDF, JPG hoặc PNG hợp lệ.');

    const latest = await this.contractRepo.findOne({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
    if (latest?.status === ContractStatus.PENDING_REVIEW) {
      throw new ConflictException('Hợp đồng đang chờ duyệt, chưa thể tải bản mới.');
    }
    if (latest?.status === ContractStatus.APPROVED) {
      throw new ConflictException('Hợp đồng đã được duyệt. Liên hệ hỗ trợ nếu cần thay đổi.');
    }

    const relative = path.join('contracts', storeId, `${randomUUID()}.${type.ext}`);
    const absolute = path.join(privateUploadRoot(), relative);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, file.buffer);

    const saved = await this.contractRepo.save(
      this.contractRepo.create({
        storeId,
        status: ContractStatus.PENDING_REVIEW,
        filePath: relative,
        fileName: path.basename(file.originalname || `hop-dong.${type.ext}`).slice(0, 200),
        mimeType: type.mime,
        sizeBytes: file.size,
        uploadedBy: userId,
      }),
    );
    return this.toContractView(saved);
  }

  /** Tệp hợp đồng mới nhất của cửa hàng (chỉ gọi sau khi đã xác thực chủ quán). */
  async getLatestContractFile(storeId: string) {
    const c = await this.contractRepo.findOne({ where: { storeId }, order: { createdAt: 'DESC' } });
    if (!c) throw new NotFoundException('Cửa hàng chưa tải hợp đồng.');
    return this.readFile(c);
  }

  async getContractFileById(contractId: string) {
    const c = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!c) throw new NotFoundException('Không tìm thấy hợp đồng.');
    return this.readFile(c);
  }

  private async readFile(c: StoreContractEntity) {
    const root = path.resolve(privateUploadRoot());
    const absolute = path.resolve(root, c.filePath);
    // Chặn đường dẫn thoát khỏi thư mục lưu riêng tư
    if (!absolute.startsWith(root + path.sep)) throw new NotFoundException('Không tìm thấy tệp.');
    try {
      return { buffer: await fs.readFile(absolute), mimeType: c.mimeType, fileName: c.fileName };
    } catch {
      throw new NotFoundException('Tệp hợp đồng không còn trên máy chủ.');
    }
  }

  // --- Admin ---

  async listForAdmin(status?: ContractStatus) {
    const rows = await this.contractRepo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const ids = [...new Set(rows.map((c) => c.storeId))];
    const [profiles, stores] = ids.length
      ? await Promise.all([
          this.profileRepo.find({ where: { storeId: In(ids) } }),
          this.profileRepo.manager.query('SELECT id, name FROM stores WHERE id = ANY($1)', [ids]),
        ])
      : [[], []];
    const profileOf = new Map(profiles.map((p) => [p.storeId, p]));
    const nameOf = new Map<string, string>(
      stores.map((r: { id: string; name: string }) => [r.id, r.name]),
    );
    return rows.map((c) => {
      const p = profileOf.get(c.storeId);
      return {
        ...this.toContractView(c),
        storeId: c.storeId,
        storeName: nameOf.get(c.storeId) ?? null,
        legalProfile: p && {
          legalName: p.legalName,
          businessType: p.businessType,
          taxCode: p.taxCode,
          businessLicenseNo: p.businessLicenseNo,
          representativeName: p.representativeName,
          representativePhone: p.representativePhone,
          legalAddress: p.legalAddress,
        },
      };
    });
  }

  async review(contractId: string, adminId: string, dto: ReviewContractDto) {
    const c = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!c) throw new NotFoundException('Không tìm thấy hợp đồng.');
    if (c.status !== ContractStatus.PENDING_REVIEW) {
      throw new ConflictException('Chỉ duyệt được hợp đồng đang chờ duyệt.');
    }
    const note = dto.note?.trim();
    if (dto.decision !== ContractStatus.APPROVED && !note) {
      throw new BadRequestException('Từ chối hoặc yêu cầu bổ sung phải nhập lý do.');
    }
    c.status = dto.decision;
    c.reviewNote = note || null;
    c.reviewedBy = adminId;
    c.reviewedAt = new Date();
    return this.toContractView(await this.contractRepo.save(c));
  }
}
