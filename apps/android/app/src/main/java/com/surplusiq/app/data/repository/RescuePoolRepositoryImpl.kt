package com.surplusiq.app.data.repository

import com.google.gson.JsonParser
import com.surplusiq.app.data.remote.api.RescuePoolApiService
import com.surplusiq.app.data.remote.dto.ConfirmPoolOfferRequest
import com.surplusiq.app.data.remote.dto.RegisterDemandRequest
import com.surplusiq.app.data.remote.dto.RescuePoolDto
import com.surplusiq.app.data.remote.dto.WithdrawDemandRequest
import com.surplusiq.app.domain.model.RescuePool
import com.surplusiq.app.domain.model.RescuePoolOffer
import com.surplusiq.app.domain.model.RescuePoolOrderResult
import com.surplusiq.app.domain.model.RescuePoolRegistration
import com.surplusiq.app.domain.repository.RescuePoolRepository
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

/** Không giả lập dữ liệu khi lỗi - trạng thái luôn lấy từ server (backend là nguồn sự thật). */
@Singleton
class RescuePoolRepositoryImpl @Inject constructor(
    private val api: RescuePoolApiService
) : RescuePoolRepository {

    override suspend fun listPools(serviceArea: String?): Result<List<RescuePool>> =
        call({ api.listPools(serviceArea?.takeIf { it.isNotBlank() }) }) { list -> list.map { it.toDomain() } }

    override suspend fun getPool(poolId: String): Result<RescuePool> =
        call({ api.getPool(poolId) }) { it.toDomain() }

    override suspend fun register(
        poolId: String,
        quantity: Int,
        budgetMax: Int?,
        pickupStart: String?,
        pickupEnd: String?
    ): Result<RescuePool> =
        call({ api.register(poolId, RegisterDemandRequest(quantity, budgetMax, pickupStart, pickupEnd)) }) { it.toDomain() }

    override suspend fun updateRegistration(
        poolId: String,
        quantity: Int,
        budgetMax: Int?,
        pickupStart: String?,
        pickupEnd: String?
    ): Result<RescuePool> =
        call({ api.updateRegistration(poolId, RegisterDemandRequest(quantity, budgetMax, pickupStart, pickupEnd)) }) { it.toDomain() }

    override suspend fun withdraw(poolId: String, reason: String): Result<RescuePool> =
        call({ api.withdraw(poolId, WithdrawDemandRequest(reason)) }) { it.toDomain() }

    override suspend fun confirmOffer(poolId: String, offerVersion: Int): Result<RescuePoolOrderResult> =
        call({ api.confirmOffer(poolId, ConfirmPoolOfferRequest(offerVersion)) }) { body ->
            val order = body.order ?: throw IllegalStateException("Máy chủ không trả về đơn hàng")
            RescuePoolOrderResult(
                orderId = order.id,
                orderCode = order.code,
                message = body.message ?: "Đã tạo đơn chính thức."
            )
        }

    private suspend fun <T, R> call(request: suspend () -> Response<T>, map: (T) -> R): Result<R> {
        return try {
            val response = request()
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Result.success(map(body))
            } else {
                Result.failure(Exception(serverMessage(response.errorBody()?.string(), response.code())))
            }
        } catch (e: java.io.IOException) {
            Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại.", e))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /** Thông điệp nghiệp vụ của server (409 đề nghị hết hạn/đã đổi/hết suất...) quan trọng với khách - hiển thị nguyên văn. */
    private fun serverMessage(body: String?, code: Int): String {
        val parsed = runCatching {
            val msg = JsonParser.parseString(body ?: "").asJsonObject.get("message")
            when {
                msg == null || msg.isJsonNull -> null
                msg.isJsonArray -> msg.asJsonArray.joinToString("\n") { it.asString }
                else -> msg.asString
            }
        }.getOrNull()
        return parsed ?: when (code) {
            401 -> "Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục."
            404 -> "Không tìm thấy đợt Mua chung theo đợt."
            in 500..599 -> "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
            else -> "Không thể hoàn tất yêu cầu ($code)."
        }
    }

    private fun RescuePoolDto.toDomain() = RescuePool(
        id = id,
        storeName = storeName ?: "Cửa hàng",
        title = poolTitle ?: "Đợt Mua chung theo đợt",
        targetCategory = targetCategory ?: "",
        serviceArea = serviceArea ?: "",
        registrationOpenAt = registrationOpenAt,
        registrationCloseAt = registrationCloseAt,
        confirmDeadlineAt = confirmDeadlineAt,
        minimumDemand = minimumDemand,
        maximumSupply = maximumSupply,
        targetBudgetMin = targetBudgetMin,
        targetBudgetMax = targetBudgetMax,
        pickupWindowStart = pickupWindowStart,
        pickupWindowEnd = pickupWindowEnd,
        endCondition = endCondition ?: "",
        status = poolStatus ?: "OPEN",
        cancellationReason = cancellationReason,
        expectedQuantity = expectedQuantity,
        canRegister = canRegister,
        offer = offer?.let {
            RescuePoolOffer(
                offerVersion = it.offerVersion,
                proposedPrice = it.proposedPrice,
                offeredQuantity = it.offeredQuantity,
                remainingQuantity = it.remainingQuantity,
                pickupStart = it.pickupStart,
                pickupEnd = it.pickupEnd,
                offerExpiryAt = it.offerExpiryAt,
                canConfirm = it.canConfirm
            )
        },
        myRegistration = myRegistration?.let {
            RescuePoolRegistration(
                id = it.id,
                status = it.registrationStatus ?: "ACTIVE",
                requestedQuantity = it.requestedQuantity,
                budgetMax = it.budgetMax,
                preferredPickupStart = it.preferredPickupStart,
                linkedOrderId = it.linkedOrderId
            )
        }
    )
}
