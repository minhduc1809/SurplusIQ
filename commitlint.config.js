/**
 * SurplusIQ Commitlint Configuration
 * Tuân thủ quy chuẩn rule.md
 * Định dạng: <type>(<scope>): <mô tả>
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // Tính năng mới
        'update', // Cập nhật luồng nghiệp vụ / cấu hình hiện có
        'fix', // Sửa lỗi
        'refactor', // Tái cấu trúc mã nguồn
        'test', // Kiểm thử
        'docs', // Tài liệu / spec / kế hoạch
        'chore', // Công việc hạ tầng / bảo trì
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'app', // Mobile App Android (Kotlin, Jetpack Compose)
        'web', // Web Dashboard (React, Vite)
        'back', // Backend API (NestJS, PostgreSQL, BullMQ)
        'core', // Thư viện lõi (@surplusiq/core)
        'simulation', // Hệ thống mô phỏng benchmark
        'infra', // Docker, CI/CD, Scripts
        'all', // Toàn cục / tài liệu chung
      ],
    ],
    'scope-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-case': [0], // Cho phép viết tiếng Việt hoặc tiếng Anh tự do
  },
};
