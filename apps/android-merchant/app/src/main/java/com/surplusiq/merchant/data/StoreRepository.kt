package com.surplusiq.merchant.data

import com.google.gson.Gson
import retrofit2.Response

/** Bọc Retrofit response thành Result + copy lỗi thân thiện (đồng bộ rule với web api.ts). */
class StoreRepository(private val api: StoreApiService) {

    suspend fun login(email: String, password: String, deviceId: String) =
        runCatchingCall { api.login(LoginRequest(email, password, deviceId)) }

    suspend fun registerStore(request: StoreRegisterRequest) = runCatchingCall { api.registerStore(request) }

    suspend fun verifyStoreEmail(email: String, code: String) =
        runCatchingCall { api.verifyStoreEmail(VerifyOtpRequest(email, code, "VERIFY")) }

    suspend fun resendVerifyOtp(email: String) = runCatchingCall { api.resendOtp(ResendOtpRequest(email, "VERIFY")) }

    suspend fun forgotPassword(email: String) = runCatchingCall { api.forgotPassword(ForgotPasswordRequest(email)) }

    suspend fun resetPassword(email: String, otpCode: String, newPassword: String) =
        runCatchingCall { api.resetPassword(ResetPasswordRequest(email, otpCode, newPassword)) }

    suspend fun changePassword(userId: String, currentPassword: String, newPassword: String) =
        runCatchingCall { api.changePassword(userId, ChangePasswordRequest(currentPassword, newPassword)) }


    suspend fun getReportsOverview(start: String, end: String) = runCatchingCall { api.getReportsOverview(start, end) }
    suspend fun getFinanceSummary(start: String, end: String) = runCatchingCall { api.getFinanceSummary(start, end) }
    suspend fun getRescueTimeline() = runCatchingCall { api.getRescueTimeline() }
    suspend fun refreshRescueTimeline() = runCatchingCall { api.refreshRescueTimeline() }
    suspend fun getRescueLot(lotId: String) = runCatchingCall { api.getRescueLot(lotId) }
    suspend fun rescueLotAction(lotId: String, body: Map<String, Any>) = runCatchingCall { api.rescueLotAction(lotId, java.util.UUID.randomUUID().toString(), body) }
    suspend fun getRaw(path: String) = runCatchingCall { api.getRaw(path.trimStart('/')) }
    suspend fun postRaw(path: String) = runCatchingCall { api.postRaw(path.trimStart('/')) }
    suspend fun getRescuePools() = runCatchingCall { api.getRescuePools() }
    suspend fun createRescuePool(body: Map<String, Any>) = runCatchingCall { api.createRescuePool(body) }
    suspend fun getRescuePool(id: String) = runCatchingCall { api.getRescuePool(id) }
    suspend fun getRescuePoolReport(id: String) = runCatchingCall { api.getRescuePoolReport(id) }
    suspend fun openRescuePool(id: String) = runCatchingCall { api.openRescuePool(id) }
    suspend fun closePoolRegistration(id: String, reason: String) = runCatchingCall { api.closePoolRegistration(id, mapOf("reason" to reason)) }
    suspend fun closeRescuePool(id: String, reason: String, outcome: String) =
        runCatchingCall { api.closeRescuePool(id, mapOf("reason" to reason, "outcome" to outcome)) }
    suspend fun supplyPoolOffer(id: String, body: Map<String, Any>) = runCatchingCall { api.supplyPoolOffer(id, body) }
    suspend fun getRescuePoolOffers() = runCatchingCall { api.getOffers(null, "OPEN", null, 1, 100) }
    suspend fun getBridgeTransfers() = runCatchingCall { api.getBridgeTransfers() }
    suspend fun getBridgeEligibleOffers() = runCatchingCall { api.getBridgeEligibleOffers() }
    suspend fun createBridgeTransfer(body: Map<String, Any>) =
        runCatchingCall { api.createBridgeTransfer(java.util.UUID.randomUUID().toString(), body) }
    suspend fun getBridgeTransfer(id: String) = runCatchingCall { api.getBridgeTransfer(id) }
    suspend fun getBridgeMatches(id: String) = runCatchingCall { api.getBridgeMatches(id) }
    suspend fun sendBridgeTransfer(id: String, recipientOrgId: String) =
        runCatchingCall { api.sendBridgeTransfer(id, mapOf("recipientOrgId" to recipientOrgId)) }
    suspend fun rotateBridgeLink(id: String) = runCatchingCall { api.rotateBridgeLink(id) }
    suspend fun confirmBridgeAgreement(id: String, responsible: String) =
        runCatchingCall { api.confirmBridgeAgreement(id, mapOf("storeResponsibleName" to responsible)) }
    suspend fun confirmBridgeHandover(id: String, body: Map<String, Any>) = runCatchingCall { api.confirmBridgeHandover(id, body) }
    suspend fun failBridgeTransfer(id: String, reason: String) = runCatchingCall { api.failBridgeTransfer(id, mapOf("reason" to reason)) }
    suspend fun cancelBridgeTransfer(id: String, reason: String) = runCatchingCall { api.cancelBridgeTransfer(id, mapOf("reason" to reason)) }
    suspend fun getBridgeReport() = runCatchingCall { api.getBridgeReport() }
    suspend fun getLabScenarios() = runCatchingCall { api.getLabScenarios() }

    suspend fun getLabScenario(id: String) = runCatchingCall { api.getLabScenario(id) }

    suspend fun createLabScenario(request: LabCreateScenario) = runCatchingCall { api.createLabScenario(request) }

    suspend fun createLabVersion(scenarioId: String, request: LabVersionParams) = runCatchingCall { api.createLabVersion(scenarioId, request) }

    suspend fun runLabVersion(id: String) = runCatchingCall { api.runLabVersion(id) }

    suspend fun applyLabVersion(id: String, request: LabApplyRequest) = runCatchingCall { api.applyLabVersion(id, request) }

    suspend fun getLabObservation(id: String) = runCatchingCall { api.getLabObservation(id) }

    suspend fun compareLabVersions(versionIds: List<String>) = runCatchingCall { api.compareLabVersions(LabCompareRequest(versionIds)) }

    suspend fun getPromotions() = runCatchingCall { api.getPromotions() }

    suspend fun createPromotion(request: CreatePromotionRequest) = runCatchingCall { api.createPromotion(request) }

    suspend fun updatePromotion(id: String, request: UpdatePromotionRequest) = runCatchingCall { api.updatePromotion(id, request) }

    suspend fun setPromotionStatus(id: String, status: String) = runCatchingCall { api.setPromotionStatus(id, UpdatePromotionStatusRequest(status)) }

    suspend fun getCampaigns() = runCatchingCall { api.getCampaigns() }

    suspend fun createCampaign(request: CreateCampaignRequest) = runCatchingCall { api.createCampaign(request) }

    suspend fun updateCampaign(id: String, request: UpdateCampaignRequest) = runCatchingCall { api.updateCampaign(id, request) }

    suspend fun getCampaignAnalytics(id: String) = runCatchingCall { api.getCampaignAnalytics(id) }

    suspend fun getItemReports(start: String, end: String) = runCatchingCall { api.getItemReports(start, end) }

    suspend fun getHourlyDistribution(start: String, end: String) = runCatchingCall { api.getHourlyDistribution(start, end) }

    suspend fun getPricingEfficacy() = runCatchingCall { api.getPricingEfficacy() }

    suspend fun comparePeriods(request: ComparePeriodsRequest) = runCatchingCall { api.comparePeriods(request) }

    suspend fun getPublicImpactLink() = runCatchingCall { api.getPublicImpactLink() }

    suspend fun getReconciliation() = runCatchingCall { api.getReconciliation() }

    suspend fun getStatement(id: String) = runCatchingCall { api.getStatement(id) }

    suspend fun getStatementCsv(id: String) = runCatchingCall { api.getStatementCsv(id) }

    suspend fun getDailyOverview() = runCatchingCall { api.getDailyOverview() }

    suspend fun getTodayTasks() = runCatchingCall { api.getTodayTasks() }

    suspend fun updateTaskReminders(request: UpdateTaskRemindersRequest) = runCatchingCall { api.updateTaskReminders(request) }

    suspend fun getNotifications(limit: Int = 50) = runCatchingCall { api.getNotifications(limit) }

    suspend fun markNotificationRead(id: String) = runCatchingCall { api.markNotificationRead(id) }

    suspend fun markAllNotificationsRead() = runCatchingCall { api.markAllNotificationsRead() }

    // --- Danh mục món ---

    suspend fun getItems(
        search: String? = null,
        category: String? = null,
        status: String? = null,
        sortBy: String? = null,
        sortOrder: String? = null,
        page: Int = 1,
        limit: Int = 20
    ) = runCatchingCall { api.getItems(search?.ifBlank { null }, category, status, sortBy, sortOrder, page, limit) }

    /** Tra cứu id -> món (kể cả đã lưu trữ) để hiện tên món trên danh sách suất. */
    // shortcut: chỉ lấy 100 món đầu (giới hạn MAX_PAGE_SIZE backend); tải thêm trang khi quán có >100 món.
    suspend fun getItemLookup(): Result<Map<String, ItemDto>> =
        getItems(status = "ALL", sortBy = "name", sortOrder = "ASC", limit = 100).map { r -> r.data.associateBy { it.id } }

    suspend fun updateTrustpass(id: String, request: TrustpassRequest) = runCatchingCall { api.updateTrustpass(id, request) }

    suspend fun getTrustpassHistory(id: String) = runCatchingCall { api.getTrustpassHistory(id) }

    suspend fun uploadImage(file: okhttp3.MultipartBody.Part) = runCatchingCall { api.uploadImage(file) }

    suspend fun getLegalOverview() = runCatchingCall { api.getLegalOverview() }

    suspend fun saveLegalProfile(request: LegalProfileRequest) = runCatchingCall { api.saveLegalProfile(request) }

    suspend fun uploadContract(file: okhttp3.MultipartBody.Part) = runCatchingCall { api.uploadContract(file) }

    suspend fun getSupportTickets() = runCatchingCall { api.getSupportTickets() }

    suspend fun createSupportTicket(subject: String, message: String, category: String, attachments: List<String> = emptyList()) =
        runCatchingCall { api.createSupportTicket(CreateTicketRequest(subject, message, category, attachments)) }

    suspend fun getSupportTicket(id: String) = runCatchingCall { api.getSupportTicket(id) }

    suspend fun sendSupportMessage(id: String, message: String, attachments: List<String> = emptyList()) =
        runCatchingCall { api.sendSupportMessage(id, SupportMessageRequest(message, attachments)) }

    suspend fun closeSupportTicket(id: String) = runCatchingCall { api.closeSupportTicket(id) }

    suspend fun getItem(id: String) = runCatchingCall { api.getItem(id) }

    suspend fun createItem(request: ItemRequest) = runCatchingCall { api.createItem(request) }

    suspend fun updateItem(id: String, request: ItemRequest) = runCatchingCall { api.updateItem(id, request) }

    suspend fun archiveItem(id: String) = runCatchingCall { api.archiveItem(id) }

    suspend fun restoreItem(id: String) = runCatchingCall { api.restoreItem(id) }

    suspend fun importItemsCsv(items: List<ItemRequest>) = runCatchingCall { api.importItemsCsv(ImportCsvRequest(items)) }

    suspend fun getDataQualityWarnings() = runCatchingCall { api.getDataQualityWarnings() }

    suspend fun batchUpdateItems(request: BatchUpdateItemsRequest) = runCatchingCall { api.batchUpdateItems(request) }

    // --- Suất và tồn kho ---

    suspend fun getOffers(date: String?, status: String? = null, itemId: String? = null, page: Int = 1, limit: Int = 50) =
        runCatchingCall { api.getOffers(date, status, itemId, page, limit) }

    suspend fun getOffer(id: String) = runCatchingCall { api.getOffer(id) }

    suspend fun createOffer(request: CreateOfferRequest) = runCatchingCall { api.createOffer(request) }

    suspend fun updateOffer(id: String, request: UpdateOfferRequest) = runCatchingCall { api.updateOffer(id, request) }

    suspend fun adjustStock(id: String, request: AdjustStockRequest) = runCatchingCall { api.adjustStock(id, request) }

    suspend fun closeOffer(id: String, request: OfferReasonRequest) = runCatchingCall { api.closeOffer(id, request) }

    suspend fun cancelOffer(id: String, request: OfferReasonRequest) = runCatchingCall { api.cancelOffer(id, request) }

    suspend fun getOfferHistory(id: String) = runCatchingCall { api.getOfferHistory(id) }

    suspend fun cloneYesterday(request: CloneYesterdayRequest) = runCatchingCall { api.cloneYesterday(request) }

    suspend fun getForecasts(targetDate: String) = runCatchingCall { api.getForecasts(targetDate) }

    suspend fun getSurpriseBags() = runCatchingCall { api.getSurpriseBags() }

    suspend fun createSurpriseBag(request: CreateSurpriseBagRequest) = runCatchingCall { api.createSurpriseBag(request) }

    suspend fun getDonationSuggestions() = runCatchingCall { api.getDonationSuggestions() }

    // --- Dự báo và định giá ---

    suspend fun overrideForecast(id: String, quantity: Int, reason: String?) =
        runCatchingCall { api.overrideForecast(id, OverrideForecastRequest(quantity, reason)) }

    suspend fun logDailyActual(request: DailyActualRequest) = runCatchingCall { api.logDailyActual(request) }

    suspend fun getSpecialEvents() = runCatchingCall { api.getSpecialEvents() }

    suspend fun createSpecialEvent(request: CreateSpecialEventRequest) = runCatchingCall { api.createSpecialEvent(request) }

    suspend fun deleteSpecialEvent(id: String) = runCatchingCall { api.deleteSpecialEvent(id) }

    suspend fun getPricingProposals() = runCatchingCall { api.getPricingProposals() }

    suspend fun proposePrice(offerId: String) = runCatchingCall { api.proposePrice(offerId) }

    suspend fun acceptPriceProposal(id: String) = runCatchingCall { api.acceptPriceProposal(id) }

    suspend fun rejectPriceProposal(id: String) = runCatchingCall { api.rejectPriceProposal(id) }

    // --- Đơn và nhận hàng ---

    suspend fun getOrders(status: String?, date: String? = null, page: Int = 1, limit: Int = 20) =
        runCatchingCall { api.getOrders(status, date, page, limit) }

    suspend fun getOrder(id: String) = runCatchingCall { api.getOrder(id) }

    suspend fun cancelOrder(id: String, reason: String) = runCatchingCall { api.cancelOrder(id, CancelOrderRequest(reason)) }

    suspend fun verifyPickup(backupCode: String) = runCatchingCall { api.verifyPickup(VerifyPickupRequest(backupCode = backupCode)) }

    suspend fun verifyPickupToken(token: String) = runCatchingCall { api.verifyPickup(VerifyPickupRequest(token = token)) }

    suspend fun verifyProxyCode(code: String) = runCatchingCall { api.verifyProxyCode(VerifyProxyCodeRequest(code)) }

    suspend fun getPickupSchedule() = runCatchingCall { api.getPickupSchedule() }

    suspend fun getComplaints(status: String? = null) = runCatchingCall { api.getComplaints(status) }

    suspend fun getComplaint(id: String) = runCatchingCall { api.getComplaint(id) }

    suspend fun resolveComplaint(id: String, refundAmount: Long?, note: String?) =
        runCatchingCall { api.resolveComplaint(id, ResolveComplaintRequest(refundAmount, note?.ifBlank { null })) }

    suspend fun rejectComplaint(id: String, reason: String) = runCatchingCall { api.rejectComplaint(id, RejectComplaintRequest(reason)) }

    suspend fun extendComplaint(id: String) = runCatchingCall { api.extendComplaint(id) }

    suspend fun getReviews(rating: Int?, hasReply: Boolean?) = runCatchingCall { api.getReviews(rating, hasReply) }

    suspend fun replyReview(id: String, reply: String) = runCatchingCall { api.replyReview(id, ReplyReviewRequest(reply)) }

    // --- Hồ sơ & vận hành ---

    suspend fun getStoreProfile() = runCatchingCall { api.getStoreProfile() }

    suspend fun updateStoreProfile(request: UpdateStoreProfileRequest) = runCatchingCall { api.updateStoreProfile(request) }

    suspend fun pauseToday() = runCatchingCall { api.pauseToday() }

    suspend fun resumeToday() = runCatchingCall { api.resumeToday() }

    suspend fun getClosures() = runCatchingCall { api.getClosures() }

    suspend fun createClosure(request: CreateClosureRequest) = runCatchingCall { api.createClosure(request) }

    suspend fun deleteClosure(id: String) = runCatchingCall { api.deleteClosure(id) }

    suspend fun exportOrders(fromDate: String?, toDate: String?) = runCatchingCall { api.exportOrders(fromDate, toDate) }

    suspend fun exportAccounting(fromDate: String?, toDate: String?) = runCatchingCall { api.exportAccounting(fromDate, toDate) }

    suspend fun getStoreSettings(storeId: String) = runCatchingCall { api.getStoreSettings() }

    suspend fun updateStoreSettings(storeId: String, isPro: Boolean, request: UpdateStoreSettingsRequest) =
        runCatchingCall { api.updateStoreSettings(request) }

    suspend fun getStoreSettingsHistory(storeId: String) = runCatchingCall { api.getStoreSettingsHistory() }

    suspend fun getAuditLogs(action: String?, from: String?, to: String?, page: Int, actorId: String? = null) =
        runCatchingCall { api.getAuditLogs(action, from, to, page, actorId = actorId) }

    suspend fun aiChat(message: String, conversationId: String?) = runCatchingCall { api.aiChat(AiChatRequest(message, conversationId)) }

    suspend fun getAiConversations() = runCatchingCall { api.getAiConversations() }

    suspend fun getAiConversation(id: String) = runCatchingCall { api.getAiConversation(id) }

    suspend fun deleteAiConversation(id: String) = runCatchingCall { api.deleteAiConversation(id) }

    suspend fun deleteAllAiConversations() = runCatchingCall { api.deleteAllAiConversations() }

    suspend fun aiWeeklySummary() = runCatchingCall { api.aiWeeklySummary() }

    suspend fun aiFeedback(logId: String, helpful: Boolean) = runCatchingCall { api.aiFeedback(AiFeedbackRequest(logId, if (helpful) "HELPFUL" else "UNHELPFUL")) }

    suspend fun getAiLogs(page: Int) = runCatchingCall { api.getAiLogs(page) }

    suspend fun getAnomalies() = runCatchingCall { api.getAnomalies() }

    suspend fun getActionCards() = runCatchingCall { api.getActionCards() }

    suspend fun applyActionCard(id: String) = runCatchingCall { api.applyActionCard(id) }

    suspend fun dismissActionCard(id: String) = runCatchingCall { api.dismissActionCard(id) }

    suspend fun getAiConfig() = runCatchingCall { api.getAiConfig() }

    suspend fun updateAiConfig(config: AiConfigDto) = runCatchingCall { api.updateAiConfig(config) }

    suspend fun getAnomalyWhy(date: String) = runCatchingCall { api.getAnomalyWhy(date) }

    suspend fun getSegmentConfig() = runCatchingCall { api.getSegmentConfig() }

    suspend fun updateSegmentConfig(config: SegmentConfigDto) = runCatchingCall { api.updateSegmentConfig(config) }

    suspend fun getCustomerDetail(id: String) = runCatchingCall { api.getCustomerDetail(id) }

    suspend fun getCustomers() = runCatchingCall { api.getCustomers() }

    suspend fun saveCustomerNote(id: String, note: String) = runCatchingCall { api.saveCustomerNote(id, CustomerNoteRequest(note)) }

    suspend fun getSegments() = runCatchingCall { api.getSegments() }

    suspend fun getFrequentNoShow() = runCatchingCall { api.getFrequentNoShow() }

    suspend fun getFavoritesCount() = runCatchingCall { api.getFavoritesCount() }

    // --- Gói dịch vụ ---

    suspend fun getSubscription() = runCatchingCall { api.getSubscription() }

    suspend fun getPlanCatalog() = runCatchingCall { api.getPlanCatalog() }

    suspend fun getQuotas() = runCatchingCall { api.getQuotas() }

    suspend fun upgradeSubscription() = runCatchingCall { api.upgradeSubscription() }

    suspend fun renewSubscription() = runCatchingCall { api.renewSubscription() }

    suspend fun downgradeSubscription() = runCatchingCall { api.downgradeSubscription() }

    suspend fun getInvoices() = runCatchingCall { api.getInvoices() }

    suspend fun getInvoicePdf(id: String) = runCatchingCall { api.getInvoicePdf(id) }
}

suspend fun <T> runCatchingCall(call: suspend () -> Response<T>): Result<T> {
    return try {
        val response = call()
        val body = response.body()
        if (response.isSuccessful && body != null) {
            Result.success(body)
        } else {
            Result.failure(Exception(friendlyMessage(response.code(), response.errorBody()?.string())))
        }
    } catch (e: Exception) {
        Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
    }
}

private fun friendlyMessage(status: Int, errorBody: String?): String {
    val serverMessage = parseServerMessage(errorBody)
    if (serverMessage != null) return serverMessage
    return when (status) {
        400 -> "Yêu cầu không hợp lệ, vui lòng kiểm tra lại thông tin."
        401 -> "Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục."
        403 -> "Bạn không có quyền thực hiện hành động này."
        404 -> "Không tìm thấy dữ liệu bạn yêu cầu."
        409 -> "Dữ liệu đã thay đổi, vui lòng tải lại."
        429 -> "Bạn đang thao tác quá nhanh, vui lòng thử lại sau một chút."
        in 500..599 -> "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
        else -> "Không thể hoàn tất yêu cầu."
    }
}

private fun parseServerMessage(errorBody: String?): String? {
    if (errorBody.isNullOrBlank()) return null
    return try {
        val parsed = Gson().fromJson(errorBody, ApiErrorBody::class.java)
        when (val msg = parsed.message) {
            is String -> msg
            is List<*> -> msg.firstOrNull()?.toString()
            else -> null
        }
    } catch (_: Exception) {
        null
    }
}
