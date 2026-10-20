import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InviteStaffDto, UpdateStaffDto } from './store-operations.dto';

describe('DTO nhân viên (R2-076, R2-078)', () => {
  const invalid = async (cls: any, plain: object) =>
    (await validate(plainToInstance(cls, plain))).length > 0;

  it('không cho mời hoặc nâng ai lên OWNER', async () => {
    expect(
      await invalid(InviteStaffDto, {
        email: 'a@b.vn',
        fullName: 'Nguyễn Văn A',
        permission: 'OWNER',
      }),
    ).toBe(true);
    expect(await invalid(UpdateStaffDto, { permission: 'OWNER' })).toBe(true);
    expect(
      await invalid(InviteStaffDto, {
        email: 'a@b.vn',
        fullName: 'Nguyễn Văn A',
        permission: 'COUNTER',
      }),
    ).toBe(false);
    expect(
      await invalid(InviteStaffDto, { email: 'a@b.vn', fullName: 'A', permission: 'COUNTER' }),
    ).toBe(true);
  });

  it('chỉ đổi trạng thái giữa ACTIVE và LOCKED, không tự đặt REMOVED', async () => {
    expect(await invalid(UpdateStaffDto, { permission: 'MANAGER', status: 'REMOVED' })).toBe(true);
    expect(await invalid(UpdateStaffDto, { permission: 'MANAGER', status: 'LOCKED' })).toBe(false);
  });
});
