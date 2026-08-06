package com.example.aikb.controller;

import com.example.aikb.model.dto.ApiResponse;
import com.example.aikb.model.dto.ChatRequest;
import com.example.aikb.model.dto.ChatResponse;
import com.example.aikb.model.entity.ChatMessage;
import com.example.aikb.model.entity.ChatSession;
import com.example.aikb.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {
    private final ChatService chatService;

    @PostMapping("/chat")
    public ApiResponse<ChatResponse> chat(@RequestBody @Valid ChatRequest request) {
        return ApiResponse.success(chatService.chat(request));
    }

    @GetMapping("/sessions")
    public ApiResponse<List<ChatSession>> listSessions(@RequestParam Long knowledgeBaseId) {
        return ApiResponse.success(chatService.listSessions(knowledgeBaseId));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ApiResponse<List<ChatMessage>> getMessages(@PathVariable Long sessionId) {
        return ApiResponse.success(chatService.getMessages(sessionId));
    }
}
