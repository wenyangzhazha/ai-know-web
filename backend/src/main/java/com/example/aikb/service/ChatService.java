package com.example.aikb.service;

import com.example.aikb.model.dto.ChatRequest;
import com.example.aikb.model.dto.ChatResponse;
import com.example.aikb.model.entity.ChatMessage;
import com.example.aikb.model.entity.ChatSession;
import com.example.aikb.repository.ChatMessageRepository;
import com.example.aikb.repository.ChatSessionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final RAGService ragService;
    private final ObjectMapper objectMapper;

    @Transactional
    public ChatResponse chat(ChatRequest request) {
        ChatSession session = getOrCreateSession(request.getSessionId(), request.getKnowledgeBaseId());
        saveMessage(session.getId(), "user", request.getMessage(), null);

        RAGResult ragResult = ragService.answer(request.getMessage(), request.getKnowledgeBaseId());

        List<ChatResponse.SourceInfo> sourceInfos = ragResult.getSources().stream()
                .map(s -> ChatResponse.SourceInfo.builder()
                        .documentId(s.getDocumentId())
                        .documentTitle(s.getDocumentTitle())
                        .content(s.getContent())
                        .score(s.getScore())
                        .build())
                .collect(Collectors.toList());

        String sourcesJson = serializeSources(sourceInfos);
        saveMessage(session.getId(), "assistant", ragResult.getAnswer(), sourcesJson);

        if (session.getTitle() == null) {
            session.setTitle(truncate(request.getMessage(), 100));
            sessionRepository.save(session);
        }

        return ChatResponse.builder()
                .sessionId(session.getId())
                .answer(ragResult.getAnswer())
                .sources(sourceInfos)
                .build();
    }

    public List<ChatMessage> getMessages(Long sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    public List<ChatSession> listSessions(Long kbId) {
        return sessionRepository.findByKnowledgeBaseIdOrderByUpdatedAtDesc(kbId);
    }

    private ChatSession getOrCreateSession(Long sessionId, Long kbId) {
        if (sessionId != null) {
            return sessionRepository.findById(sessionId)
                    .orElseGet(() -> createSession(kbId));
        }
        return createSession(kbId);
    }

    private ChatSession createSession(Long kbId) {
        ChatSession session = ChatSession.builder()
                .knowledgeBaseId(kbId)
                .build();
        return sessionRepository.save(session);
    }

    private void saveMessage(Long sessionId, String role, String content, String sources) {
        ChatMessage msg = ChatMessage.builder()
                .sessionId(sessionId)
                .role(role)
                .content(content)
                .sources(sources)
                .build();
        messageRepository.save(msg);
    }

    private String serializeSources(List<ChatResponse.SourceInfo> sources) {
        try {
            return objectMapper.writeValueAsString(sources);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize sources", e);
            return null;
        }
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}
