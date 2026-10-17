package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.repository.AiRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatMessageUiModel(
    val sender: String, // "user" or "ai"
    val text: String,
    val recommendedDeals: List<Deal> = emptyList()
)

data class AiAssistantUiState(
    val messages: List<ChatMessageUiModel> = listOf(
        ChatMessageUiModel(
            sender = "ai",
            text = "Xin chào! Tôi là Trợ lý Cứu Món SaveBite AI. Bạn có thể hỏi tôi bất kỳ điều gì, ví dụ: 'Tìm bánh ngọt dưới 35k gần Quận 1 sau 19h' hoặc hỏi về thành phần dị ứng món ăn!"
        )
    ),
    val remainingQuota: Int = 28, // 30 queries/day per R1-082
    val isTyping: Boolean = false
)

@HiltViewModel
class AiAssistantViewModel @Inject constructor(
    private val aiRepository: AiRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AiAssistantUiState())
    val uiState: StateFlow<AiAssistantUiState> = _uiState.asStateFlow()

    fun sendMessage(userText: String, availableDeals: List<Deal>) {
        if (userText.isBlank() || _uiState.value.remainingQuota <= 0) return

        val userMessage = ChatMessageUiModel(sender = "user", text = userText.trim())
        val currentMessages = _uiState.value.messages.toMutableList().apply { add(userMessage) }

        _uiState.value = _uiState.value.copy(
            messages = currentMessages,
            isTyping = true
        )

        viewModelScope.launch {
            val result = aiRepository.chatWithAi(
                message = userText.trim(),
                availableDeals = availableDeals
            )

            result.fold(
                onSuccess = { response ->
                    val aiMessage = ChatMessageUiModel(
                        sender = "ai",
                        text = response.reply,
                        recommendedDeals = response.recommendedDeals
                    )
                    _uiState.value = _uiState.value.copy(
                        messages = _uiState.value.messages + aiMessage,
                        remainingQuota = response.remainingQuota,
                        isTyping = false
                    )
                },
                onFailure = {
                    val fallbackMessage = ChatMessageUiModel(
                        sender = "ai",
                        text = "Tôi đã tìm kiếm các món Cứu Món quanh bạn:",
                        recommendedDeals = availableDeals.take(2)
                    )
                    _uiState.value = _uiState.value.copy(
                        messages = _uiState.value.messages + fallbackMessage,
                        isTyping = false
                    )
                }
            )
        }
    }
}
