import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import {
  UserEntity,
  UserRole,
  UserStatus,
  CustomerProfileEntity,
  StoreEntity,
  StoreStatus,
  StoreMemberEntity,
  StorePermission,
  StoreMemberStatus,
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
  StoreSettingsEntity,
  OtpCodeEntity,
  OtpPurpose,
  RefreshTokenEntity,
  TrustedDeviceEntity,
  ConsentEntity,
  ConsentType,
} from '../../entities';
import { AUTH_CONSTANTS, AUTH_ERRORS } from './auth.constants';
import { CryptoUtil } from './crypto.util';
import {
  CustomerRegisterDto,
  CustomerLoginDto,
  StoreRegisterDto,
  StoreLoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  Enable2faDto,
  GoogleLoginDto,
} from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(CustomerProfileEntity)
    private readonly customerProfileRepo: Repository<CustomerProfileEntity>,
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    @InjectRepository(StoreMemberEntity)
    private readonly storeMemberRepo: Repository<StoreMemberEntity>,
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepo: Repository<SubscriptionEntity>,
    @InjectRepository(StoreSettingsEntity)
    private readonly storeSettingsRepo: Repository<StoreSettingsEntity>,
    @InjectRepository(OtpCodeEntity)
    private readonly otpRepo: Repository<OtpCodeEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
    @InjectRepository(TrustedDeviceEntity)
    private readonly trustedDeviceRepo: Repository<TrustedDeviceEntity>,
    @InjectRepository(ConsentEntity)
    private readonly consentRepo: Repository<ConsentEntity>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // 1. KHÁCH HÀNG (CUSTOMER) - R1-001..R1-004
  // =========================================================================

  /**
   * Đăng ký tài khoản khách hàng (R1-001)
   */
  async registerCustomer(dto: CustomerRegisterDto) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRegistrationsFromDevice = await this.otpRepo.count({
      where: {
        deviceId: dto.deviceId,
        purpose: OtpPurpose.VERIFY,
        createdAt: MoreThan(oneHourAgo),
      },
    });
    if (recentRegistrationsFromDevice >= AUTH_CONSTANTS.REGISTER_MAX_PER_HOUR) {
      throw new BadRequestException({
        code: AUTH_ERRORS.REGISTER_RATE_LIMITED,
        message: 'Đã vượt quá giới hạn 5 lần đăng ký trong 1 giờ trên thiết bị này',
      });
    }

    const existing = await this.userRepo.findOne({
      where: [{ phone: dto.phone }, ...(dto.email ? [{ email: dto.email }] : [])],
    });
    if (existing) {
      throw new ConflictException({
        code: AUTH_ERRORS.USER_EXISTS,
        message: 'Số điện thoại hoặc Email đã được đăng ký tài khoản',
      });
    }

    const passwordHash = CryptoUtil.hashPassword(dto.password);
    const otp = CryptoUtil.generateOtp(AUTH_CONSTANTS.OTP_LENGTH);
    const otpHash = CryptoUtil.sha256(otp);

    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(UserEntity, {
        phone: dto.phone,
        email: dto.email || null,
        passwordHash,
        role: UserRole.CUSTOMER,
        status: UserStatus.PENDING_VERIFY,
      });
      await manager.save(user);

      const profile = manager.create(CustomerProfileEntity, {
        userId: user.id,
        fullName: dto.fullName,
      });
      await manager.save(profile);

      const consent = manager.create(ConsentEntity, {
        userId: user.id,
        type: ConsentType.TERMS,
        version: '1.0',
        granted: true,
      });
      await manager.save(consent);

      const otpEntity = manager.create(OtpCodeEntity, {
        target: dto.phone,
        deviceId: dto.deviceId,
        purpose: OtpPurpose.VERIFY,
        codeHash: otpHash,
        expiresAt: new Date(Date.now() + AUTH_CONSTANTS.OTP_TTL_MINUTES * 60 * 1000),
      });
      await manager.save(otpEntity);

      this.logger.log(`[SMS OTP SIMULATION] Gửi OTP ${otp} tới số ${dto.phone}`);

      return {
        userId: user.id,
        message: 'Đăng ký thành công, vui lòng nhập mã OTP để kích hoạt tài khoản',
        otpPreview: process.env.NODE_ENV !== 'production' ? otp : undefined,
      };
    });
  }

  /**
   * Đăng nhập khách hàng với cơ chế tách kênh (9.1), khóa brute-force và kiểm tra 2FA
   */
  async loginCustomer(dto: CustomerLoginDto, ip: string = '127.0.0.1') {
    const identifier = (dto.identifier || dto.phone || '').trim();
    if (!identifier) {
      throw new BadRequestException('Vui lòng nhập số điện thoại hoặc email đăng nhập');
    }

    const user = await this.userRepo.findOne({
      where: [{ phone: identifier }, { email: identifier }],
    });

    if (!user) {
      throw new UnauthorizedException({
        code: AUTH_ERRORS.INVALID_CREDENTIALS,
        message: 'Tài khoản hoặc mật khẩu không chính xác',
      });
    }

    // 1. Tách kênh theo 9.1: Khách hàng không được đăng nhập bằng tài khoản STORE_USER
    if (user.role === UserRole.STORE_USER) {
      throw new ForbiddenException({
        code: AUTH_ERRORS.WRONG_CHANNEL,
        message: 'Tài khoản đối tác cửa hàng vui lòng đăng nhập trên cổng Web quản trị',
      });
    }

    // 2. Kiểm tra trạng thái khóa brute-force
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      throw new ForbiddenException({
        code: AUTH_ERRORS.LOCKED,
        message: `Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${minutesLeft} phút`,
      });
    }

    // 3. Kiểm tra kích hoạt OTP
    if (user.status === UserStatus.PENDING_VERIFY) {
      throw new ForbiddenException({
        code: AUTH_ERRORS.PENDING_VERIFY,
        message: 'Tài khoản chưa được kích hoạt mã OTP. Vui lòng hoàn tất xác thực OTP',
      });
    }

    this.assertActiveUser(user);

    // 4. So khớp mật khẩu an toàn
    const isPasswordValid = CryptoUtil.verifyPassword(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= AUTH_CONSTANTS.LOGIN_MAX_WRONG) {
        user.lockedUntil = new Date(Date.now() + AUTH_CONSTANTS.LOGIN_LOCK_MINUTES * 60 * 1000);
      }
      await this.userRepo.save(user);

      throw new UnauthorizedException({
        code: AUTH_ERRORS.INVALID_CREDENTIALS,
        message: `Sai mật khẩu. Bạn còn ${Math.max(
          0,
          AUTH_CONSTANTS.LOGIN_MAX_WRONG - user.failedLoginCount,
        )} lần thử`,
      });
    }

    // Đặt lại số lần sai khi đăng nhập đúng
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await this.userRepo.save(user);

    // 5. Kiểm tra 2FA (R1-013)
    if (user.twoFactorEnabled) {
      const isTrusted = await this.trustedDeviceRepo.findOne({
        where: {
          userId: user.id,
          deviceId: dto.deviceId,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!isTrusted) {
        // Sinh OTP 2FA và yêu cầu bước tiếp theo
        const otp = CryptoUtil.generateOtp(AUTH_CONSTANTS.OTP_LENGTH);
        const otpEntity = this.otpRepo.create({
          target: user.phone || user.email || user.id,
          purpose: OtpPurpose.TWO_FA,
          codeHash: CryptoUtil.sha256(otp),
          expiresAt: new Date(Date.now() + AUTH_CONSTANTS.OTP_TTL_MINUTES * 60 * 1000),
        });
        await this.otpRepo.save(otpEntity);

        this.logger.log(`[2FA OTP SIMULATION] Mã xác thực 2FA: ${otp}`);

        return {
          twoFactorRequired: true,
          target: user.phone || user.email,
          message: 'Vui lòng xác thực mã 2FA gửi về số điện thoại / email của bạn',
          otpPreview: process.env.NODE_ENV !== 'production' ? otp : undefined,
        };
      }
    }

    // 6. Cấp Access Token và Refresh Token
    return this.issueTokens(user, dto.deviceId, dto.deviceName, ip);
  }

  /**
   * Đăng nhập/Đăng ký khách hàng bằng Google ID token (xác thực qua OAuth2Client.verifyIdToken,
   * find-or-create user theo email rồi cấp token giống loginCustomer).
   */
  async loginWithGoogle(dto: GoogleLoginDto, ip: string = '127.0.0.1') {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new UnauthorizedException(
        'Đăng nhập Google chưa được cấu hình. Vui lòng dùng số điện thoại/mật khẩu.',
      );
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let payload: TokenPayload | undefined;
    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      throw new UnauthorizedException('Mã xác thực Google không hợp lệ hoặc đã hết hạn');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('Không lấy được email từ tài khoản Google');
    }

    let user = await this.userRepo.findOne({ where: { email: payload.email } });

    if (user && user.role === UserRole.STORE_USER) {
      throw new ForbiddenException({
        code: AUTH_ERRORS.WRONG_CHANNEL,
        message: 'Tài khoản đối tác cửa hàng vui lòng đăng nhập trên cổng Web quản trị',
      });
    }

    if (!user) {
      user = await this.dataSource.transaction(async (manager) => {
        const newUser = manager.create(UserEntity, {
          email: payload.email,
          passwordHash: CryptoUtil.hashPassword(CryptoUtil.generateRandomToken()),
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        });
        await manager.save(newUser);

        const profile = manager.create(CustomerProfileEntity, {
          userId: newUser.id,
          fullName: payload.name || payload.email!.split('@')[0],
        });
        await manager.save(profile);

        return newUser;
      });
    }

    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      throw new ForbiddenException({
        code: AUTH_ERRORS.LOCKED,
        message: `Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${minutesLeft} phút`,
      });
    }

    return this.issueTokens(user, dto.deviceId, dto.deviceName, ip);
  }

  // =========================================================================
  // 2. CỬA HÀNG (STORE & PARTNER) - R2-001..R2-004, VC-01
  // =========================================================================

  /**
   * Đăng ký đối tác cửa hàng (R2-001, VC-01 khởi tạo Basic)
   */
  async registerStore(dto: StoreRegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException({
        code: AUTH_ERRORS.USER_EXISTS,
        message: 'Email cửa hàng đã được sử dụng',
      });
    }

    const passwordHash = CryptoUtil.hashPassword(dto.password);
    const otp = CryptoUtil.generateOtp(AUTH_CONSTANTS.OTP_LENGTH);
    const otpHash = CryptoUtil.sha256(otp);

    return this.dataSource.transaction(async (manager) => {
      // 1. Tạo tài khoản User
      const user = manager.create(UserEntity, {
        email: dto.email,
        passwordHash,
        role: UserRole.STORE_USER,
        status: UserStatus.PENDING_VERIFY,
      });
      await manager.save(user);

      // 2. Tạo cửa hàng
      const store = manager.create(StoreEntity, {
        ownerUserId: user.id,
        name: dto.storeName,
        address: dto.storeAddress,
        phone: dto.storePhone,
        status: StoreStatus.PENDING_VERIFY,
        trialUsed: false,
      });
      await manager.save(store);

      // 3. Tạo quyền thành viên Chủ quán (OWNER)
      const member = manager.create(StoreMemberEntity, {
        storeId: store.id,
        userId: user.id,
        permission: StorePermission.OWNER,
        status: StoreMemberStatus.ACTIVE,
      });
      await manager.save(member);

      // 4. Khởi tạo thuê bao BASIC mặc định (VC-01)
      const subscription = manager.create(SubscriptionEntity, {
        storeId: store.id,
        plan: SubscriptionPlan.BASIC,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: SubscriptionStatus.ACTIVE,
        trialUsed: false,
      });
      await manager.save(subscription);

      // 5. Khởi tạo cấu hình tiệm mặc định
      const settings = manager.create(StoreSettingsEntity, {
        storeId: store.id,
      });
      await manager.save(settings);

      // 6. Gửi OTP xác thực email
      const otpEntity = manager.create(OtpCodeEntity, {
        target: dto.email,
        purpose: OtpPurpose.VERIFY,
        codeHash: otpHash,
        expiresAt: new Date(Date.now() + AUTH_CONSTANTS.OTP_TTL_MINUTES * 60 * 1000),
      });
      await manager.save(otpEntity);

      this.logger.log(`[EMAIL OTP SIMULATION] Gửi OTP ${otp} tới email ${dto.email}`);

      return {
        userId: user.id,
        storeId: store.id,
        message:
          'Đăng ký cửa hàng thành công, vui lòng xác minh email để kích hoạt 30 ngày Dùng thử Pro (VC-01)',
        otpPreview: process.env.NODE_ENV !== 'production' ? otp : undefined,
      };
    });
  }

  /**
   * Xác minh email cửa hàng và kích hoạt gói dùng thử 30 ngày Pro (VC-01)
   */
  async verifyStoreEmail(dto: VerifyOtpDto) {
    await this.verifyOtp(dto);

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, { where: { email: dto.target } });
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      const store = await manager.findOne(StoreEntity, {
        where: { ownerUserId: user.id },
      });
      if (!store) {
        throw new NotFoundException('Không tìm thấy thông tin cửa hàng');
      }

      store.status = StoreStatus.ACTIVE;

      const subscription = await manager.findOne(SubscriptionEntity, {
        where: { storeId: store.id },
      });

      // Kích hoạt dùng thử 1 tháng nếu chưa dùng (VC-01)
      if (subscription && !subscription.trialUsed) {
        subscription.plan = SubscriptionPlan.TRIAL;
        subscription.periodStart = new Date();
        subscription.periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        subscription.trialUsed = true;
        subscription.status = SubscriptionStatus.ACTIVE;
        await manager.save(subscription);

        store.trialUsed = true;
      }

      await manager.save(store);

      return {
        success: true,
        message: 'Xác minh email thành công! Gói dùng thử 30 ngày Pro đã được kích hoạt (VC-01)',
      };
    });
  }

  /**
   * Đăng nhập cổng quản trị cửa hàng với cơ chế tách kênh (9.1) và kiểm tra 2FA (R1-013)
   */
  async loginStore(dto: StoreLoginDto, ip: string = '127.0.0.1') {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: AUTH_ERRORS.INVALID_CREDENTIALS,
        message: 'Email hoặc mật khẩu không chính xác',
      });
    }

    // 1. Tách kênh theo 9.1: Khách hàng không được đăng nhập trên Web quản trị
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException({
        code: AUTH_ERRORS.WRONG_CHANNEL,
        message: 'Tài khoản khách hàng vui lòng đăng nhập trên ứng dụng di động',
      });
    }

    // 2. Khóa brute-force
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      throw new ForbiddenException({
        code: AUTH_ERRORS.LOCKED,
        message: `Tài khoản bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${minutesLeft} phút`,
      });
    }

    // 3. Trạng thái kích hoạt
    if (user.status === UserStatus.PENDING_VERIFY) {
      throw new ForbiddenException({
        code: AUTH_ERRORS.PENDING_VERIFY,
        message: 'Tài khoản chưa xác minh email. Vui lòng xác minh để tiếp tục',
      });
    }

    this.assertActiveUser(user);

    // 4. Mật khẩu
    const isPasswordValid = CryptoUtil.verifyPassword(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= AUTH_CONSTANTS.LOGIN_MAX_WRONG) {
        user.lockedUntil = new Date(Date.now() + AUTH_CONSTANTS.LOGIN_LOCK_MINUTES * 60 * 1000);
      }
      await this.userRepo.save(user);

      throw new UnauthorizedException({
        code: AUTH_ERRORS.INVALID_CREDENTIALS,
        message: 'Email hoặc mật khẩu không chính xác',
      });
    }

    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await this.userRepo.save(user);

    // 5. Kiểm tra 2FA nếu tài khoản bật xác thực 2 bước (R1-013)
    if (user.twoFactorEnabled) {
      const isTrusted = await this.trustedDeviceRepo.findOne({
        where: {
          userId: user.id,
          deviceId: dto.deviceId,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!isTrusted) {
        const otpTarget = user.email || user.phone || user.id;
        if (dto.otpCode?.trim()) {
          await this.verifyOtp({
            target: otpTarget,
            code: dto.otpCode.trim(),
            purpose: OtpPurpose.TWO_FA,
          });
        } else {
          const otp = CryptoUtil.generateOtp(AUTH_CONSTANTS.OTP_LENGTH);
          const otpEntity = this.otpRepo.create({
            target: otpTarget,
            purpose: OtpPurpose.TWO_FA,
            codeHash: CryptoUtil.sha256(otp),
            expiresAt: new Date(Date.now() + AUTH_CONSTANTS.OTP_TTL_MINUTES * 60 * 1000),
          });
          await this.otpRepo.save(otpEntity);

          this.logger.log(`[STORE/ADMIN 2FA OTP SIMULATION] Mã xác thực 2FA: ${otp}`);

          return {
            twoFactorRequired: true,
            target: user.email || user.phone,
            message: 'Vui lòng xác thực mã 2FA gửi về email / số điện thoại của bạn',
            otpPreview: process.env.NODE_ENV !== 'production' ? otp : undefined,
          };
        }
      }
    }

    // 6. Lấy cửa hàng liên kết (nếu là STORE_USER)
    const member = await this.storeMemberRepo.findOne({
      where: { userId: user.id },
    });

    return this.issueTokens(
      user,
      dto.deviceId,
      dto.deviceName,
      ip,
      member?.storeId,
      member?.permission,
    );
  }

  /**
   * Đăng nhập dành riêng cho Platform Super Admin (chặn STORE_USER và CUSTOMER từ tầng Backend)
   */
  async loginAdmin(dto: StoreLoginDto, ip: string = '127.0.0.1') {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: AUTH_ERRORS.INVALID_CREDENTIALS,
        message: 'Email hoặc mật khẩu không chính xác',
      });
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: AUTH_ERRORS.WRONG_CHANNEL,
        message: 'Tài khoản này không có quyền truy cập Super Admin',
      });
    }

    return this.loginStore(dto, ip);
  }

  // =========================================================================
  // 3. XÁC THỰC OTP & PHIÊN ĐĂNG NHẬP (OTP, REFRESH, SESSIONS)
  // =========================================================================

  /**
   * Xác thực mã OTP (BR-002)
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const otpEntity = await this.otpRepo.findOne({
      where: {
        target: dto.target,
        purpose: dto.purpose,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpEntity || otpEntity.usedAt) {
      throw new BadRequestException({
        code: AUTH_ERRORS.OTP_INVALID,
        message: 'Mã OTP không hợp lệ hoặc đã qua sử dụng',
      });
    }

    if (new Date() > new Date(otpEntity.expiresAt)) {
      throw new BadRequestException({
        code: AUTH_ERRORS.OTP_EXPIRED,
        message: 'Mã OTP đã hết thời hạn 5 phút (BR-002)',
      });
    }

    if (otpEntity.wrongCount >= AUTH_CONSTANTS.OTP_MAX_WRONG) {
      throw new BadRequestException({
        code: AUTH_ERRORS.OTP_LOCKED,
        message: 'Mã OTP đã bị khóa do nhập sai quá 5 lần (BR-002)',
      });
    }

    const inputHash = CryptoUtil.sha256(dto.code);
    if (inputHash !== otpEntity.codeHash) {
      otpEntity.wrongCount += 1;
      await this.otpRepo.save(otpEntity);
      throw new BadRequestException({
        code: AUTH_ERRORS.OTP_INVALID,
        message: `Mã OTP không chính xác. Bạn còn ${
          AUTH_CONSTANTS.OTP_MAX_WRONG - otpEntity.wrongCount
        } lần thử`,
      });
    }

    otpEntity.usedAt = new Date();
    await this.otpRepo.save(otpEntity);

    // Kích hoạt trạng thái người dùng nếu là VERIFY
    if (dto.purpose === OtpPurpose.VERIFY) {
      await this.userRepo.update([{ phone: dto.target }, { email: dto.target }], {
        status: UserStatus.ACTIVE,
      });
    }

    return {
      success: true,
      message: 'Xác thực mã OTP thành công',
    };
  }

  /**
   * Gửi lại mã OTP có giới hạn tần suất 3 lần/giờ (BR-002)
   */
  async resendOtp(dto: ResendOtpDto) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtpsCount = await this.otpRepo.count({
      where: {
        target: dto.target,
        purpose: dto.purpose,
        createdAt: MoreThan(oneHourAgo),
      },
    });

    if (recentOtpsCount >= AUTH_CONSTANTS.OTP_RESEND_MAX_HOURS) {
      throw new BadRequestException({
        code: AUTH_ERRORS.OTP_RATE_LIMITED,
        message: 'Đã vượt quá giới hạn 3 lần gửi lại OTP trong 1 giờ (BR-002)',
      });
    }

    const otp = CryptoUtil.generateOtp(AUTH_CONSTANTS.OTP_LENGTH);
    const otpEntity = this.otpRepo.create({
      target: dto.target,
      purpose: dto.purpose,
      codeHash: CryptoUtil.sha256(otp),
      expiresAt: new Date(Date.now() + AUTH_CONSTANTS.OTP_TTL_MINUTES * 60 * 1000),
    });
    await this.otpRepo.save(otpEntity);

    this.logger.log(`[RESEND OTP SIMULATION] Gửi lại OTP ${otp} tới ${dto.target}`);

    return {
      success: true,
      message: 'Đã gửi lại mã OTP thành công',
      otpPreview: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * Làm mới Access Token bằng Refresh Token (R1-004, R2-003)
   */
  async refreshAccessToken(dto: RefreshTokenDto) {
    const tokenHash = CryptoUtil.sha256(dto.refreshToken);

    const tokenRecord = await this.refreshTokenRepo.findOne({
      where: {
        tokenHash,
      },
    });

    if (!tokenRecord || tokenRecord.revokedAt) {
      throw new UnauthorizedException({
        code: AUTH_ERRORS.TOKEN_REVOKED,
        message: 'Phiên đăng nhập đã hết hạn hoặc bị thu hồi',
      });
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      throw new UnauthorizedException({
        code: AUTH_ERRORS.TOKEN_EXPIRED,
        message: 'Refresh token đã hết hạn',
      });
    }

    const user = await this.userRepo.findOne({ where: { id: tokenRecord.userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Người dùng không còn hoạt động');
    }

    tokenRecord.lastUsedAt = new Date();
    await this.refreshTokenRepo.save(tokenRecord);

    let storeId: string | undefined;
    let permission: string | undefined;

    if (user.role === UserRole.STORE_USER) {
      const member = await this.storeMemberRepo.findOne({
        where: { userId: user.id },
      });
      storeId = member?.storeId;
      permission = member?.permission;
    }

    const payload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
      storeId,
      permission,
      deviceId: tokenRecord.deviceId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: AUTH_CONSTANTS.JWT_ACCESS_EXPIRES_IN,
    });

    return { accessToken };
  }

  /**
   * Đăng xuất và thu hồi Refresh Token trên thiết bị hiện tại
   */
  async logout(userId?: string, deviceId?: string, authorization?: string) {
    let effectiveUserId = userId?.trim();
    let effectiveDeviceId = deviceId?.trim();

    if (authorization?.startsWith('Bearer ')) {
      const rawToken = authorization.slice(7).trim();
      if (rawToken && typeof (this.jwtService as { verify?: unknown }).verify === 'function') {
        try {
          const decoded = (
            this.jwtService as unknown as {
              verify: (
                token: string,
                options: { secret: string; ignoreExpiration: boolean },
              ) => { sub?: string; deviceId?: string };
            }
          ).verify(rawToken, {
            secret: AUTH_CONSTANTS.JWT_SECRET,
            ignoreExpiration: true,
          });
          if (effectiveUserId && decoded.sub && effectiveUserId !== decoded.sub) {
            throw new ForbiddenException('Không được phép đăng xuất phiên của tài khoản khác');
          }
          effectiveUserId = decoded.sub || effectiveUserId;
          effectiveDeviceId = effectiveDeviceId || decoded.deviceId;
        } catch (err) {
          if (err instanceof ForbiddenException) {
            throw err;
          }
          // Nếu truyền Bearer token sai chữ ký và không có cặp định danh hợp lệ thì từ chối
          if (!effectiveUserId || !effectiveDeviceId) {
            throw new UnauthorizedException('Token đăng xuất không hợp lệ');
          }
        }
      }
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      effectiveUserId || '',
    );
    if (
      !isUuid ||
      effectiveUserId === '00000000-0000-0000-0000-000000000001' ||
      !effectiveDeviceId ||
      effectiveDeviceId === 'default-device'
    ) {
      throw new UnauthorizedException('Thiếu thông tin phiên thiết bị hợp lệ để đăng xuất');
    }

    await this.refreshTokenRepo.update(
      { userId: effectiveUserId, deviceId: effectiveDeviceId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return { success: true, message: 'Đăng xuất thành công' };
  }

  private assertActiveUser(user: UserEntity) {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException({
        code: AUTH_ERRORS.LOCKED,
        message: 'Tài khoản đã bị khóa hoặc không còn hoạt động',
      });
    }
  }

  // =========================================================================
  // 4. BẢO MẬT: ĐỔI MẬT KHẨU, QUÊN MẬT KHẨU & 2FA (BR-003, R1-013)
  // =========================================================================

  /**
   * Đổi mật khẩu và thu hồi các phiên đăng nhập khác (BR-003)
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const isMatch = CryptoUtil.verifyPassword(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    user.passwordHash = CryptoUtil.hashPassword(dto.newPassword);
    await this.userRepo.save(user);

    // BR-003: Thu hồi toàn bộ Refresh Token của các thiết bị khác
    await this.refreshTokenRepo.update({ userId }, { revokedAt: new Date() });

    return {
      success: true,
      message:
        'Đổi mật khẩu thành công. Các phiên đăng nhập trên thiết bị khác đã được thu hồi (BR-003)',
    };
  }

  /**
   * Yêu cầu đặt lại mật khẩu quên (gửi OTP)
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({
      where: [{ phone: dto.target }, { email: dto.target }],
    });

    if (!user) {
      // Để tránh enumeration attack, vẫn báo thành công giả định
      return {
        success: true,
        message: 'Nếu tài khoản tồn tại, mã OTP đặt lại mật khẩu đã được gửi',
      };
    }

    const otp = CryptoUtil.generateOtp(AUTH_CONSTANTS.OTP_LENGTH);
    const otpEntity = this.otpRepo.create({
      target: dto.target,
      purpose: OtpPurpose.RESET,
      codeHash: CryptoUtil.sha256(otp),
      expiresAt: new Date(Date.now() + AUTH_CONSTANTS.OTP_TTL_MINUTES * 60 * 1000),
    });
    await this.otpRepo.save(otpEntity);

    this.logger.log(`[RESET PASSWORD OTP SIMULATION] Mã OTP đặt lại mật khẩu: ${otp}`);

    return {
      success: true,
      message: 'Mã OTP đặt lại mật khẩu đã được gửi',
      otpPreview: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * Đặt lại mật khẩu bằng mã OTP (BR-003)
   */
  async resetPassword(dto: ResetPasswordDto) {
    await this.verifyOtp({
      target: dto.target,
      code: dto.otpCode,
      purpose: OtpPurpose.RESET,
    });

    const user = await this.userRepo.findOne({
      where: [{ phone: dto.target }, { email: dto.target }],
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    user.passwordHash = CryptoUtil.hashPassword(dto.newPassword);
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await this.userRepo.save(user);

    // BR-003: Thu hồi toàn bộ token đăng nhập
    await this.refreshTokenRepo.update({ userId: user.id }, { revokedAt: new Date() });

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới',
    };
  }

  /**
   * Danh sách phiên đăng nhập (R1-014)
   */
  async getSessions(userId: string) {
    return this.refreshTokenRepo.find({
      where: {
        userId,
        expiresAt: MoreThan(new Date()),
      },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Xóa / Thu hồi phiên đăng nhập cụ thể (R1-014)
   */
  async revokeSession(userId: string, sessionId: string) {
    await this.refreshTokenRepo.update({ id: sessionId, userId }, { revokedAt: new Date() });
    return { success: true, message: 'Đã thu hồi phiên đăng nhập' };
  }

  /**
   * Bật / Tắt xác thực 2 bước 2FA (R1-013)
   */
  async toggle2fa(userId: string, dto: Enable2faDto) {
    const isEnabled = dto.enabled ?? dto.enable ?? true;
    await this.userRepo.update(userId, {
      twoFactorEnabled: isEnabled,
    });
    return {
      success: true,
      twoFactorEnabled: isEnabled,
      message: isEnabled ? 'Đã bật xác thực 2 bước (2FA)' : 'Đã tắt xác thực 2 bước',
    };
  }

  // =========================================================================
  // TIỆN ÍCH CẤP TOKEN (TOKEN ISSUANCE)
  // =========================================================================

  private async issueTokens(
    user: UserEntity,
    deviceId: string,
    deviceName?: string,
    ip: string = '127.0.0.1',
    storeId?: string,
    permission?: string,
  ) {
    const payload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
      storeId,
      permission,
      deviceId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: AUTH_CONSTANTS.JWT_ACCESS_EXPIRES_IN,
    });

    const refreshTokenPlain = CryptoUtil.generateRandomToken();
    const tokenHash = CryptoUtil.sha256(refreshTokenPlain);

    const refreshTokenEntity = this.refreshTokenRepo.create({
      userId: user.id,
      deviceId,
      deviceName: deviceName || null,
      ip,
      tokenHash,
      expiresAt: new Date(
        Date.now() + AUTH_CONSTANTS.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      ),
      lastUsedAt: new Date(),
    });
    await this.refreshTokenRepo.save(refreshTokenEntity);

    // Ghi nhận thiết bị tin cậy nếu có 2FA
    const trustedExpires = new Date(
      Date.now() + AUTH_CONSTANTS.TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.trustedDeviceRepo.save({
      userId: user.id,
      deviceId,
      expiresAt: trustedExpires,
    });

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        storeId,
        permission,
      },
    };
  }
}
