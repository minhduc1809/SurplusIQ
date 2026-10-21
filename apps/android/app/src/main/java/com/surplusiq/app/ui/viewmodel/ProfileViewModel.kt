package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.data.remote.dto.ConsentDto
import com.surplusiq.app.data.remote.dto.OrderLockStatusDto
import com.surplusiq.app.data.remote.dto.PaymentTransactionRecordDto
import com.surplusiq.app.data.remote.dto.RefundBankAccountDto
import com.surplusiq.app.domain.model.DietaryType
import com.surplusiq.app.domain.model.UserProfile
import com.surplusiq.app.domain.repository.AuthRepository
import com.surplusiq.app.domain.repository.MediaRepository
import com.surplusiq.app.domain.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val userProfile: UserProfile? = null,
    val favoriteStoreIds: Set<String> = emptySet(),
    val isLoading: Boolean = false,
    val isLoggedOut: Boolean = false,
    // Chỉnh sửa hồ sơ cá nhân (R1-006, K53)
    val isUpdatingProfile: Boolean = false,
    val updateProfileError: String? = null,
    val updateProfileSuccess: Boolean = false,
    val isUploadingAvatar: Boolean = false,
    val uploadAvatarError: String? = null,
    // GDPR / quyền riêng tư & dữ liệu (R1-011, R1-012, R1-017, R1-018, R1-019)
    val consents: List<ConsentDto> = emptyList(),
    val isConsentsLoading: Boolean = false,
    val consentsError: String? = null,
    val deleteRequestStatus: String? = null,
    val deleteRequestedAt: String? = null,
    val isAccountDeleteActionLoading: Boolean = false,
    val accountDeleteMessage: String? = null,
    val exportDownloadUrl: String? = null,
    val isExportLoading: Boolean = false,
    val exportMessage: String? = null,
    // R1-077: lịch sử thanh toán & hoàn tiền (K46)
    val transactions: List<PaymentTransactionRecordDto> = emptyList(),
    val isTransactionsLoading: Boolean = false,
    val transactionsError: String? = null,
    // R1-048, BR-020: trạng thái khóa đặt (K33)
    val orderLock: OrderLockStatusDto? = null,
    val isOrderLockLoading: Boolean = false,
    val orderLockError: String? = null,
    // R1-016: hồ sơ ăn uống & dị ứng (K58)
    val allergens: List<String> = emptyList(),
    val excludedItems: List<String> = emptyList(),
    val isDietaryLoading: Boolean = false,
    val dietaryError: String? = null,
    val isDietarySaving: Boolean = false,
    val dietarySaveSuccess: Boolean = false,
    // KX01: Tài khoản nhận hoàn tiền VietQR
    val refundBankAccount: RefundBankAccountDto? = null,
    val isBankLoading: Boolean = false,
    val bankError: String? = null,
    val isSavingBank: Boolean = false,
    val bankSuccess: Boolean = false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val authRepository: AuthRepository,
    private val mediaRepository: MediaRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState(isLoading = true))
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val profileResult = profileRepository.getProfile()
            val favoritesResult = profileRepository.getFavoriteStoreIds()

            val profile = profileResult.getOrNull()
            val favorites = favoritesResult.getOrDefault(emptySet())
            val accountStatus = profileRepository.getAccountStatus().getOrNull()

            _uiState.value = _uiState.value.copy(
                userProfile = profile,
                deleteRequestStatus = accountStatus?.status ?: _uiState.value.deleteRequestStatus,
                deleteRequestedAt = accountStatus?.deleteScheduledAt ?: accountStatus?.deleteRequestedAt,
                favoriteStoreIds = favorites,
                isLoading = false
            )
        }
    }

    fun loadDietaryProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isDietaryLoading = true, dietaryError = null, dietarySaveSuccess = false)
            val result = profileRepository.getDietaryProfile()
            result.fold(
                onSuccess = { dto ->
                    _uiState.value = _uiState.value.copy(
                        allergens = dto.allergens,
                        excludedItems = dto.excludedItems,
                        isDietaryLoading = false
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isDietaryLoading = false,
                        dietaryError = err.localizedMessage ?: "Không thể tải hồ sơ ăn uống"
                    )
                }
            )
        }
    }

    fun saveDietaryProfile(allergens: List<String>, excludedItems: List<String>, onComplete: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isDietarySaving = true, dietaryError = null, dietarySaveSuccess = false)
            val result = profileRepository.updateDietaryProfile(allergens, excludedItems)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        allergens = allergens,
                        excludedItems = excludedItems,
                        isDietarySaving = false,
                        dietarySaveSuccess = true
                    )
                    onComplete(true)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isDietarySaving = false,
                        dietaryError = err.localizedMessage ?: "Lỗi cập nhật hồ sơ ăn uống"
                    )
                    onComplete(false)
                }
            )
        }
    }

    fun updateDietaryPreferences(dietaryType: DietaryType, allergies: List<String>) {
        viewModelScope.launch {
            profileRepository.updateDietaryPreferences(dietaryType, allergies)
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.value = _uiState.value.copy(isLoggedOut = true)
        }
    }

    fun loadConsents() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isConsentsLoading = true, consentsError = null)
            val result = profileRepository.getConsents()
            result.fold(
                onSuccess = { list ->
                    _uiState.value = _uiState.value.copy(consents = list, isConsentsLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isConsentsLoading = false,
                        consentsError = err.localizedMessage ?: "Không thể tải lịch sử chấp thuận"
                    )
                }
            )
        }
    }

    fun requestAccountDelete(password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isAccountDeleteActionLoading = true, accountDeleteMessage = null)
            val result = profileRepository.requestAccountDelete(password)
            result.fold(
                onSuccess = { res ->
                    _uiState.value = _uiState.value.copy(
                        isAccountDeleteActionLoading = false,
                        deleteRequestStatus = res.status,
                        deleteRequestedAt = res.deleteRequestedAt,
                        accountDeleteMessage = res.message ?: "Đã ghi nhận yêu cầu xóa tài khoản."
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isAccountDeleteActionLoading = false,
                        accountDeleteMessage = err.localizedMessage ?: "Không thể gửi yêu cầu xóa tài khoản"
                    )
                }
            )
        }
    }

    fun cancelAccountDelete() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isAccountDeleteActionLoading = true, accountDeleteMessage = null)
            val result = profileRepository.cancelAccountDelete()
            result.fold(
                onSuccess = { res ->
                    _uiState.value = _uiState.value.copy(
                        isAccountDeleteActionLoading = false,
                        deleteRequestStatus = res.status,
                        deleteRequestedAt = null,
                        accountDeleteMessage = res.message ?: "Đã hủy yêu cầu xóa tài khoản."
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isAccountDeleteActionLoading = false,
                        accountDeleteMessage = err.localizedMessage ?: "Không thể hủy yêu cầu xóa tài khoản"
                    )
                }
            )
        }
    }

    fun loadTransactions() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isTransactionsLoading = true, transactionsError = null)
            profileRepository.getTransactions().fold(
                onSuccess = { list ->
                    _uiState.value = _uiState.value.copy(transactions = list, isTransactionsLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isTransactionsLoading = false,
                        transactionsError = err.localizedMessage ?: "Không thể tải lịch sử giao dịch"
                    )
                }
            )
        }
    }

    fun loadOrderLock() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isOrderLockLoading = true, orderLockError = null)
            profileRepository.getOrderLockStatus().fold(
                onSuccess = { lock ->
                    _uiState.value = _uiState.value.copy(orderLock = lock, isOrderLockLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isOrderLockLoading = false,
                        orderLockError = err.localizedMessage ?: "Không thể tải trạng thái khóa đặt"
                    )
                }
            )
        }
    }

    fun exportUserData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isExportLoading = true, exportMessage = null)
            val result = profileRepository.exportUserData()
            result.fold(
                onSuccess = { res ->
                    _uiState.value = _uiState.value.copy(
                        isExportLoading = false,
                        exportDownloadUrl = res.downloadUrl,
                        exportMessage = "Liên kết tải dữ liệu đã sẵn sàng, có hiệu lực ${res.expiresInHours} giờ."
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isExportLoading = false,
                        exportMessage = err.localizedMessage ?: "Không thể xuất dữ liệu cá nhân"
                    )
                }
            )
        }
    }

    /**
     * Chỉnh sửa thông tin hồ sơ khách hàng (R1-006, K53).
     * @param fullName Tên hiển thị (2 - 60 ký tự)
     * @param avatarUrl URL hoặc path ảnh đại diện
     * @param searchRadiusKm Bán kính tìm kiếm deal mặc định (0.5 - 10 km)
     */
    fun updateProfile(
        fullName: String,
        avatarUrl: String?,
        searchRadiusKm: Double,
        onComplete: (Boolean, String?) -> Unit = { _, _ -> }
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isUpdatingProfile = true,
                updateProfileError = null,
                updateProfileSuccess = false
            )
            val result = profileRepository.updateProfile(
                fullName = fullName.trim(),
                avatarUrl = avatarUrl,
                searchRadiusKm = searchRadiusKm
            )
            result.fold(
                onSuccess = { updatedProfile ->
                    _uiState.value = _uiState.value.copy(
                        userProfile = updatedProfile,
                        isUpdatingProfile = false,
                        updateProfileSuccess = true
                    )
                    onComplete(true, null)
                },
                onFailure = { err ->
                    val errorMsg = err.localizedMessage ?: "Cập nhật hồ sơ thất bại"
                    _uiState.value = _uiState.value.copy(
                        isUpdatingProfile = false,
                        updateProfileError = errorMsg
                    )
                    onComplete(false, errorMsg)
                }
            )
        }
    }

    /**
     * Tải ảnh đại diện lên server qua MediaRepository.
     */
    fun uploadAvatar(
        bytes: ByteArray,
        fileName: String = "avatar.jpg",
        mimeType: String = "image/jpeg",
        onComplete: (Boolean, String?) -> Unit
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isUploadingAvatar = true,
                uploadAvatarError = null
            )
            val result = mediaRepository.uploadImageBytes(bytes, fileName, mimeType)
            result.fold(
                onSuccess = { uploadedUrl ->
                    _uiState.value = _uiState.value.copy(isUploadingAvatar = false)
                    onComplete(true, uploadedUrl)
                },
                onFailure = { err ->
                    val errorMsg = err.localizedMessage ?: "Tải ảnh đại diện thất bại"
                    _uiState.value = _uiState.value.copy(
                        isUploadingAvatar = false,
                        uploadAvatarError = errorMsg
                    )
                    onComplete(false, errorMsg)
                }
            )
        }
    }

    /**
     * Tải thông tin tài khoản hoàn tiền VietQR (KX01)
     */
    fun loadRefundBankAccount() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isBankLoading = true, bankError = null, bankSuccess = false)
            val result = profileRepository.getRefundBankAccount()
            result.fold(
                onSuccess = { dto ->
                    _uiState.value = _uiState.value.copy(
                        refundBankAccount = dto,
                        isBankLoading = false
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        bankError = err.localizedMessage ?: "Không thể tải tài khoản hoàn tiền",
                        isBankLoading = false
                    )
                }
            )
        }
    }

    /**
     * Lưu thông tin tài khoản hoàn tiền VietQR (KX01)
     */
    fun saveRefundBankAccount(
        bankBin: String,
        bankName: String,
        accountNumber: String,
        accountHolder: String,
        onComplete: (Boolean, String?) -> Unit = { _, _ -> }
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSavingBank = true, bankError = null, bankSuccess = false)
            val result = profileRepository.updateRefundBankAccount(bankBin, bankName, accountNumber, accountHolder)
            result.fold(
                onSuccess = { dto ->
                    _uiState.value = _uiState.value.copy(
                        refundBankAccount = dto,
                        isSavingBank = false,
                        bankSuccess = true
                    )
                    onComplete(true, null)
                },
                onFailure = { err ->
                    val errorMsg = err.localizedMessage ?: "Cập nhật tài khoản hoàn tiền thất bại"
                    _uiState.value = _uiState.value.copy(
                        isSavingBank = false,
                        bankError = errorMsg
                    )
                    onComplete(false, errorMsg)
                }
            )
        }
    }

    fun resetBankSuccess() {
        _uiState.value = _uiState.value.copy(bankSuccess = false, bankError = null)
    }
}
