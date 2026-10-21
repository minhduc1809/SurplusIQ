package com.surplusiq.merchant.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.Part
import okhttp3.MultipartBody
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Url

interface StoreApiService {
    @POST("auth/store/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/store/register")
    suspend fun registerStore(@Body request: StoreRegisterRequest): Response<StoreRegisterResponse>

    @POST("auth/store/verify-email")
    suspend fun verifyStoreEmail(@Body request: VerifyOtpRequest): Response<MessageResponse>

    // Endpoint nằm dưới /customer nhưng logic không phân kênh (target + purpose).
    @POST("auth/customer/resend-otp")
    suspend fun resendOtp(@Body request: ResendOtpRequest): Response<MessageResponse>

    @POST("auth/password/forgot")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<MessageResponse>

    @POST("auth/password/reset")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<MessageResponse>

    // Backend đọc user từ header x-user-id, không từ JWT.
    @POST("auth/password/change")
    suspend fun changePassword(
        @Header("x-user-id") userId: String,
        @Body request: ChangePasswordRequest
    ): Response<MessageResponse>

    @POST("store/staff/accept-invite")
    suspend fun acceptInvite(@Body request: AcceptInviteRequest): Response<AcceptInviteResponse>

    @GET("store/daily-overview")
    suspend fun getDailyOverview(): Response<DailyOverviewDto>

    @GET("store/reports/overview")
    suspend fun getReportsOverview(@Query("startDate") startDate: String, @Query("endDate") endDate: String): Response<ReportsOverviewDto>

    @GET("store/rescue-timeline")
    suspend fun getRescueTimeline(): Response<RescueTimelineResponse>

    @POST("store/rescue-timeline/refresh")
    suspend fun refreshRescueTimeline(): Response<okhttp3.ResponseBody>

    @GET("store/rescue-timeline/{lotId}")
    suspend fun getRescueLot(@Path("lotId") lotId: String): Response<RescueLotDetail>

    @POST("store/rescue-timeline/{lotId}/action")
    suspend fun rescueLotAction(@Path("lotId") lotId: String, @Header("Idempotency-Key") key: String, @Body body: Map<String, @JvmSuppressWildcards Any>): Response<RescueActionResult>

    /** Gọi tiếp đường dẫn mà backend trả trong `next.path` (VD hành động Rescue Timeline). */
    @GET
    suspend fun getRaw(@Url path: String): Response<com.google.gson.JsonObject>

    @POST
    suspend fun postRaw(@Url path: String): Response<com.google.gson.JsonObject>

    @GET("store/rescue-pools")
    suspend fun getRescuePools(): Response<List<RescuePool>>

    @POST("store/rescue-pools")
    suspend fun createRescuePool(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<RescuePool>

    @GET("store/rescue-pools/{id}")
    suspend fun getRescuePool(@Path("id") id: String): Response<RescuePoolDetail>

    @GET("store/rescue-pools/{id}/report")
    suspend fun getRescuePoolReport(@Path("id") id: String): Response<RescuePoolReport>

    @PATCH("store/rescue-pools/{id}/open")
    suspend fun openRescuePool(@Path("id") id: String): Response<okhttp3.ResponseBody>

    @POST("store/rescue-pools/{id}/close-registration")
    suspend fun closePoolRegistration(@Path("id") id: String, @Body body: Map<String, String>): Response<okhttp3.ResponseBody>

    @POST("store/rescue-pools/{id}/close")
    suspend fun closeRescuePool(@Path("id") id: String, @Body body: Map<String, String>): Response<okhttp3.ResponseBody>

    @PATCH("store/rescue-pools/{id}/supply-offer")
    suspend fun supplyPoolOffer(@Path("id") id: String, @Body body: Map<String, @JvmSuppressWildcards Any>): Response<okhttp3.ResponseBody>

    @GET("store/rescue-bridge/transfers")
    suspend fun getBridgeTransfers(): Response<List<BridgeTransfer>>

    @GET("store/rescue-bridge/eligible-offers")
    suspend fun getBridgeEligibleOffers(): Response<List<BridgeEligibleOffer>>

    @POST("store/rescue-bridge/transfers")
    suspend fun createBridgeTransfer(@Header("Idempotency-Key") key: String, @Body body: Map<String, @JvmSuppressWildcards Any>): Response<BridgeTransfer>

    @GET("store/rescue-bridge/transfers/{id}")
    suspend fun getBridgeTransfer(@Path("id") id: String): Response<BridgeTransferDetail>

    @GET("store/rescue-bridge/transfers/{id}/matches")
    suspend fun getBridgeMatches(@Path("id") id: String): Response<BridgeMatches>

    @POST("store/rescue-bridge/transfers/{id}/send")
    suspend fun sendBridgeTransfer(@Path("id") id: String, @Body body: Map<String, String>): Response<BridgeResponseLink>

    @POST("store/rescue-bridge/transfers/{id}/response-link")
    suspend fun rotateBridgeLink(@Path("id") id: String): Response<BridgeResponseLink>

    @POST("store/rescue-bridge/transfers/{id}/confirm-agreement")
    suspend fun confirmBridgeAgreement(@Path("id") id: String, @Body body: Map<String, String>): Response<okhttp3.ResponseBody>

    @POST("store/rescue-bridge/transfers/{id}/confirm-handover")
    suspend fun confirmBridgeHandover(@Path("id") id: String, @Body body: Map<String, @JvmSuppressWildcards Any>): Response<okhttp3.ResponseBody>

    @POST("store/rescue-bridge/transfers/{id}/fail")
    suspend fun failBridgeTransfer(@Path("id") id: String, @Body body: Map<String, String>): Response<okhttp3.ResponseBody>

    @POST("store/rescue-bridge/transfers/{id}/cancel")
    suspend fun cancelBridgeTransfer(@Path("id") id: String, @Body body: Map<String, String>): Response<okhttp3.ResponseBody>

    @GET("store/rescue-bridge/report")
    suspend fun getBridgeReport(): Response<BridgeReport>

    @GET("store/tasks/today")
    suspend fun getTodayTasks(): Response<TodayTasksResponse>

    @PUT("store/tasks/reminders")
    suspend fun updateTaskReminders(@Body request: UpdateTaskRemindersRequest): Response<MessageResponse>

    @GET("store/notifications")
    suspend fun getNotifications(@Query("limit") limit: Int = 50): Response<NotificationsResponse>

    @PATCH("store/notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): Response<NotificationDto>

    @PATCH("store/notifications/read-all")
    suspend fun markAllNotificationsRead(): Response<MessageResponse>

    // --- Danh mục món (catalog.controller.ts) ---

    /** status: ACTIVE | ARCHIVED | ALL; sortBy: name | createdAt | originalPrice; sortOrder: ASC | DESC */
    @GET("store/items")
    suspend fun getItems(
        @Query("search") search: String?,
        @Query("category") category: String?,
        @Query("status") status: String?,
        @Query("sortBy") sortBy: String?,
        @Query("sortOrder") sortOrder: String?,
        @Query("page") page: Int,
        @Query("limit") limit: Int
    ): Response<ItemsResponse>

    @PATCH("store/items/{id}/trustpass")
    suspend fun updateTrustpass(@Path("id") id: String, @Body request: TrustpassRequest): Response<ItemDto>

    @GET("store/items/{id}/trustpass-history")
    suspend fun getTrustpassHistory(@Path("id") id: String): Response<List<TrustpassHistoryRow>>

    @GET("store/legal-profile")
    suspend fun getLegalOverview(): Response<LegalOverviewDto>

    @PUT("store/legal-profile")
    suspend fun saveLegalProfile(@Body body: LegalProfileRequest): Response<LegalProfileDto>

    @Multipart
    @POST("store/contract")
    suspend fun uploadContract(@Part file: MultipartBody.Part): Response<ContractDto>

    @Multipart
    @POST("store/uploads/image")
    suspend fun uploadImage(@Part file: MultipartBody.Part): Response<UploadResult>

    @GET("store/support-tickets")
    suspend fun getSupportTickets(): Response<List<SupportTicketDto>>

    @POST("store/support-tickets")
    suspend fun createSupportTicket(@Body request: CreateTicketRequest): Response<SupportTicketDto>

    @GET("store/support-tickets/{id}")
    suspend fun getSupportTicket(@Path("id") id: String): Response<SupportDetailResponse>

    @POST("store/support-tickets/{id}/messages")
    suspend fun sendSupportMessage(@Path("id") id: String, @Body request: SupportMessageRequest): Response<SupportMessageDto>

    @POST("store/support-tickets/{id}/close")
    suspend fun closeSupportTicket(@Path("id") id: String): Response<SupportTicketDto>

    @GET("store/items/{id}")
    suspend fun getItem(@Path("id") id: String): Response<ItemDto>

    @POST("store/items")
    suspend fun createItem(@Body request: ItemRequest): Response<ItemDto>

    @PATCH("store/items/{id}")
    suspend fun updateItem(@Path("id") id: String, @Body request: ItemRequest): Response<ItemDto>

    @POST("store/items/{id}/archive")
    suspend fun archiveItem(@Path("id") id: String): Response<ItemDto>

    @POST("store/items/{id}/restore")
    suspend fun restoreItem(@Path("id") id: String): Response<ItemDto>

    @POST("store/items/import-csv")
    suspend fun importItemsCsv(@Body request: ImportCsvRequest): Response<CsvImportSummaryDto>

    @GET("store/items/data-quality-warnings")
    suspend fun getDataQualityWarnings(): Response<DataQualityResponse>

    @POST("store/items/batch-update")
    suspend fun batchUpdateItems(@Body request: BatchUpdateItemsRequest): Response<BatchUpdateItemsResponse>

    // --- Suất và tồn kho (offers.controller.ts) ---

    @GET("store/offers")
    suspend fun getOffers(
        @Query("date") date: String?,
        @Query("status") status: String? = null,
        @Query("itemId") itemId: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<OffersResponse>

    @GET("store/offers/{id}")
    suspend fun getOffer(@Path("id") id: String): Response<OfferDto>

    @POST("store/offers")
    suspend fun createOffer(@Body request: CreateOfferRequest): Response<OfferDto>

    @PATCH("store/offers/{id}")
    suspend fun updateOffer(@Path("id") id: String, @Body request: UpdateOfferRequest): Response<OfferDto>

    @POST("store/offers/{id}/adjust-stock")
    suspend fun adjustStock(@Path("id") id: String, @Body request: AdjustStockRequest): Response<OfferDto>

    @POST("store/offers/{id}/close")
    suspend fun closeOffer(@Path("id") id: String, @Body request: OfferReasonRequest): Response<OfferDto>

    @POST("store/offers/{id}/cancel")
    suspend fun cancelOffer(@Path("id") id: String, @Body request: OfferReasonRequest): Response<OfferDto>

    @GET("store/offers/{id}/history")
    suspend fun getOfferHistory(@Path("id") id: String): Response<List<OfferEventDto>>

    @POST("store/offers/clone-yesterday")
    suspend fun cloneYesterday(@Body request: CloneYesterdayRequest): Response<CloneSummaryDto>

    @GET("store/forecast")
    suspend fun getForecasts(@Query("targetDate") targetDate: String): Response<List<ForecastDto>>

    @GET("store/marketing/surprise-bags")
    suspend fun getSurpriseBags(): Response<List<SurpriseBagDto>>

    @POST("store/marketing/surprise-bags")
    suspend fun createSurpriseBag(@Body request: CreateSurpriseBagRequest): Response<CreateSurpriseBagResponse>

    @GET("store/donations/suggestions")
    suspend fun getDonationSuggestions(): Response<DonationSuggestionsResponse>

    // --- Dự báo và định giá (decisions.controller.ts) ---

    @POST("store/forecast/{id}/override")
    suspend fun overrideForecast(@Path("id") id: String, @Body request: OverrideForecastRequest): Response<ForecastDto>

    @POST("store/forecast/actuals")
    suspend fun logDailyActual(@Body request: DailyActualRequest): Response<DailyActualDto>

    @GET("store/special-events")
    suspend fun getSpecialEvents(): Response<List<SpecialEventDto>>

    @POST("store/special-events")
    suspend fun createSpecialEvent(@Body request: CreateSpecialEventRequest): Response<SpecialEventDto>

    @DELETE("store/special-events/{id}")
    suspend fun deleteSpecialEvent(@Path("id") id: String): Response<MessageResponse>

    @GET("store/decisions/pricing/proposals")
    suspend fun getPricingProposals(): Response<List<PriceProposalDto>>

    @POST("store/decisions/pricing/propose/{offerId}")
    suspend fun proposePrice(@Path("offerId") offerId: String): Response<ProposeResultDto>

    @POST("store/decisions/pricing/proposals/{id}/accept")
    suspend fun acceptPriceProposal(@Path("id") id: String): Response<MessageResponse>

    @POST("store/decisions/pricing/proposals/{id}/reject")
    suspend fun rejectPriceProposal(@Path("id") id: String): Response<MessageResponse>

    // --- Đơn và nhận hàng (store-orders.controller.ts, store-pickups.controller.ts) ---

    /** Backend chỉ lọc status + date (theo createdAt, UTC) + phân trang; search/fromDate/toDate bị bỏ qua. */
    @GET("store/orders")
    suspend fun getOrders(
        @Query("status") status: String? = null,
        @Query("date") date: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<OrdersResponse>

    @GET("store/orders/{id}")
    suspend fun getOrder(@Path("id") id: String): Response<OrderDto>

    @POST("store/orders/{id}/cancel")
    suspend fun cancelOrder(@Path("id") id: String, @Body request: CancelOrderRequest): Response<OrderDto>

    @POST("store/pickups/verify")
    suspend fun verifyPickup(@Body request: VerifyPickupRequest): Response<VerifyPickupResponse>

    @POST("store/pickups/verify-proxy-code")
    suspend fun verifyProxyCode(@Body request: VerifyProxyCodeRequest): Response<VerifyPickupResponse>

    @GET("store/pickup-schedule")
    suspend fun getPickupSchedule(): Response<List<PickupSlotDto>>

    @GET("store/complaints")
    suspend fun getComplaints(@Query("status") status: String? = null): Response<List<ComplaintDto>>

    @GET("store/complaints/{id}")
    suspend fun getComplaint(@Path("id") id: String): Response<ComplaintDetailResponse>

    @POST("store/complaints/{id}/resolve")
    suspend fun resolveComplaint(@Path("id") id: String, @Body request: ResolveComplaintRequest): Response<ComplaintDto>

    @POST("store/complaints/{id}/reject")
    suspend fun rejectComplaint(@Path("id") id: String, @Body request: RejectComplaintRequest): Response<ComplaintDto>

    @POST("store/complaints/{id}/extend")
    suspend fun extendComplaint(@Path("id") id: String): Response<ComplaintDto>

    @GET("store/reviews")
    suspend fun getReviews(
        @Query("rating") rating: Int? = null,
        @Query("hasReply") hasReply: Boolean? = null
    ): Response<List<ReviewDto>>

    @POST("store/reviews/{id}/reply")
    suspend fun replyReview(@Path("id") id: String, @Body request: ReplyReviewRequest): Response<ReviewDto>

    // --- Hồ sơ & vận hành (store-operations.controller.ts) ---

    @GET("store/profile")
    suspend fun getStoreProfile(): Response<StoreProfileResponse>

    @PUT("store/profile")
    suspend fun updateStoreProfile(@Body request: UpdateStoreProfileRequest): Response<StoreDto>

    @POST("store/pause-today")
    suspend fun pauseToday(): Response<MessageResponse>

    @POST("store/resume-today")
    suspend fun resumeToday(): Response<MessageResponse>

    @GET("store/closures")
    suspend fun getClosures(): Response<List<StoreClosureDto>>

    @POST("store/closures")
    suspend fun createClosure(@Body request: CreateClosureRequest): Response<StoreClosureDto>

    @DELETE("store/closures/{id}")
    suspend fun deleteClosure(@Path("id") id: String): Response<MessageResponse>

    @GET("store/rescue-lab/scenarios")
    suspend fun getLabScenarios(): Response<List<LabScenario>>

    @GET("store/rescue-lab/scenarios/{id}")
    suspend fun getLabScenario(@Path("id") id: String): Response<LabScenario>

    @POST("store/rescue-lab/scenarios")
    suspend fun createLabScenario(@Body request: LabCreateScenario): Response<LabVersion>

    @POST("store/rescue-lab/scenarios/{id}/versions")
    suspend fun createLabVersion(@Path("id") id: String, @Body request: LabVersionParams): Response<LabVersion>

    @POST("store/rescue-lab/versions/{id}/run")
    suspend fun runLabVersion(@Path("id") id: String): Response<LabVersion>

    @POST("store/rescue-lab/versions/{id}/apply")
    suspend fun applyLabVersion(@Path("id") id: String, @Body request: LabApplyRequest): Response<LabVersion>

    @GET("store/rescue-lab/versions/{id}/observation")
    suspend fun getLabObservation(@Path("id") id: String): Response<LabObservation>

    @POST("store/rescue-lab/compare")
    suspend fun compareLabVersions(@Body request: LabCompareRequest): Response<LabCompareResult>

    @GET("store/marketing/promotions")
    suspend fun getPromotions(): Response<List<PromotionDto>>

    @POST("store/marketing/promotions")
    suspend fun createPromotion(@Body request: CreatePromotionRequest): Response<PromotionDto>

    @PATCH("store/marketing/promotions/{id}")
    suspend fun updatePromotion(@Path("id") id: String, @Body request: UpdatePromotionRequest): Response<PromotionDto>

    @PATCH("store/marketing/promotions/{id}/status")
    suspend fun setPromotionStatus(@Path("id") id: String, @Body request: UpdatePromotionStatusRequest): Response<PromotionDto>

    @GET("store/marketing/campaigns")
    suspend fun getCampaigns(): Response<List<CampaignDto>>

    @POST("store/marketing/campaigns")
    suspend fun createCampaign(@Body request: CreateCampaignRequest): Response<CampaignDto>

    @PATCH("store/marketing/campaigns/{id}")
    suspend fun updateCampaign(@Path("id") id: String, @Body request: UpdateCampaignRequest): Response<CampaignDto>

    @GET("store/marketing/campaigns/{id}/analytics")
    suspend fun getCampaignAnalytics(@Path("id") id: String): Response<CampaignAnalyticsDto>

    @GET("store/reports/items")
    suspend fun getItemReports(@Query("startDate") startDate: String, @Query("endDate") endDate: String): Response<ItemReportsResponse>

    @GET("store/reports/hourly-distribution")
    suspend fun getHourlyDistribution(@Query("startDate") startDate: String, @Query("endDate") endDate: String): Response<HourlyDistributionResponse>

    @GET("store/reports/pricing-efficacy")
    suspend fun getPricingEfficacy(): Response<PricingEfficacyDto>

    @POST("store/reports/compare-periods")
    suspend fun comparePeriods(@Body request: ComparePeriodsRequest): Response<ComparePeriodsResponse>

    @POST("store/reports/public-impact-link")
    suspend fun getPublicImpactLink(): Response<PublicImpactLinkResponse>

    @GET("store/reports/reconciliation")
    suspend fun getReconciliation(): Response<ReconciliationResponse>

    @GET("store/statements/{id}")
    suspend fun getStatement(@Path("id") id: String): Response<StatementDetailResponse>

    @GET("store/statements/{id}/csv")
    suspend fun getStatementCsv(@Path("id") id: String): Response<StatementCsvResponse>

    @GET("store/export/orders")
    suspend fun exportOrders(@Query("fromDate") fromDate: String?, @Query("toDate") toDate: String?): Response<ExportResponse>

    @GET("store/export/accounting")
    suspend fun exportAccounting(@Query("fromDate") fromDate: String?, @Query("toDate") toDate: String?): Response<ExportResponse>

    // Cửa hàng và gói Pro do backend suy ra từ JWT; không gửi x-store-id / x-is-pro.
    @GET("store/settings")
    suspend fun getStoreSettings(): Response<StoreSettingsDto>

    @PUT("store/settings")
    suspend fun updateStoreSettings(
        @Body request: UpdateStoreSettingsRequest
    ): Response<StoreSettingsDto>

    @GET("store/settings/history")
    suspend fun getStoreSettingsHistory(): Response<List<SettingsHistoryDto>>

    @GET("store/audit-logs")
    suspend fun getAuditLogs(
        @Query("action") action: String?,
        @Query("from") from: String?,
        @Query("to") to: String?,
        @Query("page") page: Int,
        @Query("limit") limit: Int = 20,
        @Query("actorId") actorId: String? = null
    ): Response<AuditLogsResponse>

    @POST("store/ai/chat")
    suspend fun aiChat(@Body request: AiChatRequest): Response<AiChatResponse>

    @GET("store/ai/conversations")
    suspend fun getAiConversations(): Response<List<AiConversationDto>>

    @GET("store/ai/conversations/{id}")
    suspend fun getAiConversation(@Path("id") id: String): Response<AiConversationDetail>

    @DELETE("store/ai/conversations/{id}")
    suspend fun deleteAiConversation(@Path("id") id: String): Response<Map<String, Any?>>

    @DELETE("store/ai/conversations")
    suspend fun deleteAllAiConversations(): Response<Map<String, Any?>>

    @POST("store/ai/weekly-summary")
    suspend fun aiWeeklySummary(): Response<AiWeeklySummary>

    @POST("store/ai/feedback")
    suspend fun aiFeedback(@Body request: AiFeedbackRequest): Response<Map<String, Any?>>

    @GET("store/ai/logs")
    suspend fun getAiLogs(@Query("page") page: Int = 1): Response<AiLogsResponse>

    @GET("store/anomalies")
    suspend fun getAnomalies(): Response<AnomaliesResponse>

    @GET("store/action-cards")
    suspend fun getActionCards(): Response<List<ActionCardDto>>

    @POST("store/action-cards/{id}/apply")
    suspend fun applyActionCard(@Path("id") id: String): Response<MessageResponse>

    @POST("store/action-cards/{id}/dismiss")
    suspend fun dismissActionCard(@Path("id") id: String): Response<MessageResponse>

    @GET("store/ai/config")
    suspend fun getAiConfig(): Response<AiConfigDto>

    @PUT("store/ai/config")
    suspend fun updateAiConfig(@Body request: AiConfigDto): Response<AiConfigDto>

    @GET("store/anomalies/why")
    suspend fun getAnomalyWhy(@Query("date") date: String): Response<AnomalyWhyResponse>

    @GET("store/marketing/segment-config")
    suspend fun getSegmentConfig(): Response<SegmentConfigDto>

    @PUT("store/marketing/segment-config")
    suspend fun updateSegmentConfig(@Body request: SegmentConfigDto): Response<SegmentConfigDto>

    @GET("store/customers/{id}/detail")
    suspend fun getCustomerDetail(@Path("id") id: String): Response<CustomerDetailDto>

    @GET("store/customers")
    suspend fun getCustomers(): Response<List<StoreCustomerDto>>

    @POST("store/customers/{id}/notes")
    suspend fun saveCustomerNote(@Path("id") id: String, @Body request: CustomerNoteRequest): Response<CustomerNoteRequest>

    @GET("store/marketing/segments")
    suspend fun getSegments(): Response<SegmentsResponse>

    @GET("store/marketing/frequent-noshow")
    suspend fun getFrequentNoShow(): Response<FrequentNoShowResponse>

    @GET("store/favorites-count")
    suspend fun getFavoritesCount(): Response<FavoritesCountResponse>

    @GET("store/staff")
    suspend fun getStaff(): Response<StaffListResponse>

    @POST("store/staff/invitations")
    suspend fun inviteStaff(@Body request: InviteStaffRequest): Response<InviteStaffResponse>

    @PATCH("store/staff/{id}")
    suspend fun updateStaff(@Path("id") id: String, @Body request: UpdateStaffRequest): Response<StaffMemberDto>

    @DELETE("store/staff/{id}")
    suspend fun removeStaff(@Path("id") id: String): Response<MessageResponse>

    // --- Gói dịch vụ (subscriptions.controller.ts) ---

    @GET("store/subscription/current")
    suspend fun getSubscription(): Response<SubscriptionDto>

    @GET("store/subscription/catalog")
    suspend fun getPlanCatalog(): Response<PlanCatalogDto>

    @GET("store/subscription/quotas")
    suspend fun getQuotas(): Response<Map<String, QuotaDto>>

    @POST("store/subscription/upgrade")
    suspend fun upgradeSubscription(): Response<SubscriptionDto>

    @POST("store/subscription/renew")
    suspend fun renewSubscription(): Response<SubscriptionDto>

    @POST("store/subscription/downgrade")
    suspend fun downgradeSubscription(): Response<SubscriptionDto>

    @GET("store/subscription/invoices")
    suspend fun getInvoices(): Response<List<InvoiceDto>>

    @GET("store/subscription/invoices/{id}/pdf")
    suspend fun getInvoicePdf(@Path("id") id: String): Response<InvoicePdfResponse>
}
