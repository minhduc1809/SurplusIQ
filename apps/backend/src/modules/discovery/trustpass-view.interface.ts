import {
  TrustpassInformationSource,
  TrustpassVerificationStatus,
} from '../../entities/catalog/item.entity';

/**
 * TrustPass (CM-C03): phân biệt rõ "chưa cung cấp" (null) với "không có" (mảng rỗng
 * khai báo rõ). `missingFields` liệt kê các trường chưa có dữ liệu để FE hiển thị
 * "Chưa được cung cấp" đúng BR-C03-02, không tự coi trường trống là không có dị ứng.
 */
export interface TrustpassView {
  itemId: string;
  ingredients: string | null;
  allergens: string[] | null;
  expiryAt: Date | null;
  pickupWindowNote: string;
  storageInstructions: string | null;
  informationSource: TrustpassInformationSource;
  verificationStatus: TrustpassVerificationStatus;
  versionNo: number;
  publishedAt: Date | null;
  reviewStatus: string;
  missingFields: string[];
}
