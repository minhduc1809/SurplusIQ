package com.surplusiq.merchant.data

// --- Rescue Bridge (CM-B03): cửa hàng bàn giao suất còn lại cho đơn vị tiếp nhận đã được duyệt. ---

/** transferStatus: DRAFT | SENT | ACCEPTED | REJECTED | AWAITING_HANDOVER | HANDED_OVER | PARTIAL | FAILED | CANCELLED. */
data class BridgeTransfer(
    val id: String,
    val offerId: String,
    val recipientOrgName: String? = null,
    val foodCategory: String,
    val quantityProposed: Int,
    val quantityAccepted: Int?,
    val quantityHandedOver: Int?,
    val reservedQuantity: Int,
    val availableAt: String,
    val handoverDeadline: String,
    val storageNotes: String,
    val transportResponsibility: String,
    val transferStatus: String,
    val agreedPickupAt: String?,
    val recipientResponsibleName: String?,
    val storeResponsibleName: String?,
    val recipientNote: String?,
    val senderConfirmedAt: String?,
    val senderConfirmedQuantity: Int?,
    val recipientConfirmedBy: String?,
    val recipientConfirmedAt: String?,
    val recipientConfirmedQuantity: Int?,
    val evidenceReference: String?,
    val isDisputed: Boolean,
    val disputeNote: String?,
    val failureReason: String?
)

data class BridgeRecipientOrg(
    val id: String,
    val name: String,
    val capacityNote: String?,
    val contactName: String? = null,
    val contactPhone: String? = null
)

data class BridgeOfferRef(val id: String, val itemName: String?, val pickupStart: String, val pickupEnd: String)
data class BridgeHistory(val action: String, val actorRole: String, val newValue: Map<String, Any?>?, val createdAt: String)

data class BridgeTransferDetail(
    val id: String,
    val foodCategory: String,
    val quantityProposed: Int,
    val quantityAccepted: Int?,
    val quantityHandedOver: Int?,
    val reservedQuantity: Int,
    val availableAt: String,
    val handoverDeadline: String,
    val storageNotes: String,
    val transportResponsibility: String,
    val transferStatus: String,
    val agreedPickupAt: String?,
    val recipientResponsibleName: String?,
    val storeResponsibleName: String?,
    val recipientNote: String?,
    val senderConfirmedAt: String?,
    val senderConfirmedQuantity: Int?,
    val recipientConfirmedBy: String?,
    val recipientConfirmedAt: String?,
    val recipientConfirmedQuantity: Int?,
    val evidenceReference: String?,
    val isDisputed: Boolean,
    val disputeNote: String?,
    val failureReason: String?,
    val recipientOrg: BridgeRecipientOrg?,
    val offer: BridgeOfferRef?,
    val evidenceRequired: Boolean,
    val allowedActions: List<String>,
    val history: List<BridgeHistory>
)

data class BridgeEligibleOffer(
    val offerId: String,
    val kind: String,
    val itemName: String?,
    val foodCategory: String?,
    val remainingQuantity: Int,
    val pickupStart: String,
    val pickupEnd: String,
    val lotExpiresAt: String,
    val suggested: Boolean
)

data class BridgeMatch(
    val id: String,
    val name: String,
    val serviceAreas: List<String>,
    val maxQuantityPerTransfer: Int,
    val receivingWindowStart: String?,
    val receivingWindowEnd: String?,
    val capacityNote: String?
)

data class BridgeMatches(val matches: List<BridgeMatch>, val message: String?)
data class BridgeResponseLink(val responseLink: String)

data class BridgeCount(val count: Int, val quantity: Int)
data class BridgeStatusCount(val status: String, val count: Int)
data class BridgeClosedReason(val status: String, val reason: String, val count: Int)
data class BridgeReport(
    val proposed: BridgeCount,
    val accepted: BridgeCount,
    val handedOver: BridgeCount,
    val shortfallQuantity: Int,
    val openDisputes: Int,
    val byStatus: List<BridgeStatusCount>,
    val closedReasons: List<BridgeClosedReason>,
    val note: String
)
