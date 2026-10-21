package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.data.remote.dto.AiConversationDto
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.repository.AiRepository
import com.surplusiq.app.ui.screens.ai.ChatMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AiUiState(
    // Danh sách các phiên hội thoại (K51)
    val conversations: List<AiConversationDto> = emptyList(),
    val isConversationsLoading: Boolean = false,
    val conversationsError: String? = null,
    // Phiên chat hiện tại
    val activeConversationId: String? = null,
    val activeConversationTitle: String? = null,
    val messages: List<ChatMessage> = listOf(
        ChatMessage(
            sender = "ai",
            text = "Xin chào! Tôi là Trợ lý Cứu Món. Mình có thể giúp bạn tìm suất cứu món quanh đây, so sánh giá, xem giờ nhận hàng và kiểm tra thành phần dị ứng của món ăn."
        )
    ),
    val isChatLoading: Boolean = false,
    val remainingQuota: Int = 28,
    // Cài đặt ghi nhớ ngữ cảnh (R1-091, K51)
    val rememberContext: Boolean = true,
    val isSettingUpdating: Boolean = false,
    val actionMessage: String? = null
)

@HiltViewModel
class AiViewModel @Inject constructor(
    private val aiRepository: AiRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AiUiState())
    val uiState: StateFlow<AiUiState> = _uiState.asStateFlow()

    init {
        loadMemorySetting()
    }

    fun loadConversations() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isConversationsLoading = true,
                conversationsError = null,
                actionMessage = null
            )
            aiRepository.getConversations().fold(
                onSuccess = { list ->
                    _uiState.value = _uiState.value.copy(
                        conversations = list,
                        isConversationsLoading = false
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isConversationsLoading = false,
                        conversationsError = error.localizedMessage ?: "Không thể tải lịch sử hội thoại"
                    )
                }
            )
        }
    }

    fun openConversation(conversationId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isChatLoading = true)
            aiRepository.getConversationMessages(conversationId).fold(
                onSuccess = { detail ->
                    val chatList = detail.messages.map { msg ->
                        ChatMessage(
                            sender = if (msg.sender.equals("USER", ignoreCase = true)) "user" else "ai",
                            text = msg.content
                        )
                    }
                    _uiState.value = _uiState.value.copy(
                        activeConversationId = detail.conversation.id,
                        activeConversationTitle = detail.conversation.title,
                        messages = if (chatList.isNotEmpty()) chatList else _uiState.value.messages,
                        isChatLoading = false
                    )
                },
                onFailure = {
                    _uiState.value = _uiState.value.copy(isChatLoading = false)
                }
            )
        }
    }

    fun startNewChat() {
        _uiState.value = _uiState.value.copy(
            activeConversationId = null,
            activeConversationTitle = null,
            messages = listOf(
                ChatMessage(
                    sender = "ai",
                    text = "Xin chào! Tôi là Trợ lý Cứu Món. Mình có thể giúp bạn tìm suất cứu món quanh đây, so sánh giá, xem giờ nhận hàng và kiểm tra thành phần dị ứng của món ăn."
                )
            )
        )
    }

    fun deleteConversation(conversationId: String) {
        viewModelScope.launch {
            val result = aiRepository.deleteConversation(conversationId)
            result.onSuccess {
                _uiState.value = _uiState.value.copy(
                    conversations = _uiState.value.conversations.filterNot { it.id == conversationId },
                    actionMessage = "Đã xóa phiên hội thoại"
                )
                if (_uiState.value.activeConversationId == conversationId) {
                    startNewChat()
                }
            }
        }
    }

    fun clearAllConversations() {
        viewModelScope.launch {
            val result = aiRepository.clearAllConversations()
            result.onSuccess {
                _uiState.value = _uiState.value.copy(
                    conversations = emptyList(),
                    actionMessage = "Đã xóa toàn bộ lịch sử hội thoại"
                )
                startNewChat()
            }
        }
    }

    fun loadMemorySetting() {
        viewModelScope.launch {
            aiRepository.getMemorySetting().onSuccess { remember ->
                _uiState.value = _uiState.value.copy(rememberContext = remember)
            }
        }
    }

    fun updateMemorySetting(rememberContext: Boolean) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSettingUpdating = true)
            aiRepository.updateMemorySetting(rememberContext).fold(
                onSuccess = { updated ->
                    _uiState.value = _uiState.value.copy(
                        rememberContext = updated,
                        isSettingUpdating = false,
                        actionMessage = if (updated) "Đã bật ghi nhớ ngữ cảnh" else "Đã tắt ghi nhớ ngữ cảnh"
                    )
                },
                onFailure = {
                    _uiState.value = _uiState.value.copy(isSettingUpdating = false)
                }
            )
        }
    }

    fun sendMessage(messageText: String, availableDeals: List<Deal>) {
        if (messageText.isBlank()) return
        val currentList = _uiState.value.messages.toMutableList()
        currentList.add(ChatMessage(sender = "user", text = messageText))
        _uiState.value = _uiState.value.copy(messages = currentList, isChatLoading = true)

        viewModelScope.launch {
            val result = aiRepository.chatWithAi(
                message = messageText,
                conversationId = _uiState.value.activeConversationId,
                availableDeals = availableDeals
            )
            result.fold(
                onSuccess = { res ->
                    val updated = _uiState.value.messages.toMutableList()
                    updated.add(
                        ChatMessage(
                            sender = "ai",
                            text = res.reply,
                            recommendedDeals = res.recommendedDeals
                        )
                    )
                    _uiState.value = _uiState.value.copy(
                        messages = updated,
                        isChatLoading = false,
                        activeConversationId = res.conversationId ?: _uiState.value.activeConversationId,
                        remainingQuota = res.remainingQuota
                    )
                },
                onFailure = { error ->
                    val updated = _uiState.value.messages.toMutableList()
                    updated.add(
                        ChatMessage(
                            sender = "ai",
                            text = "Xin lỗi, đã xảy ra lỗi: ${error.localizedMessage ?: "Vui lòng thử lại sau"}"
                        )
                    )
                    _uiState.value = _uiState.value.copy(messages = updated, isChatLoading = false)
                }
            )
        }
    }

    fun consumeActionMessage() {
        _uiState.value = _uiState.value.copy(actionMessage = null)
    }
}
