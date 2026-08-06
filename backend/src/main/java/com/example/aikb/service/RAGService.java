package com.example.aikb.service;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.input.Prompt;
import dev.langchain4j.model.input.PromptTemplate;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingSearchResult;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.filter.MetadataFilterBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RAGService {

    private final EmbeddingService embeddingService;
    private final EmbeddingStore<TextSegment> embeddingStore;
    private final ChatLanguageModel chatModel;

    @Value("${app.rag.top-k:5}")
    private int topK;

    @Value("${app.rag.score-threshold:0.5}")
    private double scoreThreshold;

    private static final String RAG_PROMPT = """
            You are a helpful AI assistant answering questions based on the provided context.
            Use only the information from the context to answer the question.
            If the context does not contain enough information, say so clearly.

            Context:
            {{context}}

            Question: {{question}}

            Answer:""";

    public RAGResult answer(String question, Long knowledgeBaseId) {
        Embedding queryEmbedding = embeddingService.embedQuery(question);

        EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
                .queryEmbedding(queryEmbedding)
                .maxResults(topK)
                .minScore(scoreThreshold)
                .filter(MetadataFilterBuilder.metadataKey("knowledge_base_id")
                        .isEqualTo(String.valueOf(knowledgeBaseId)))
                .build();

        EmbeddingSearchResult<TextSegment> result = embeddingStore.search(request);
        List<EmbeddingMatch<TextSegment>> matches = result.matches();

        if (matches.isEmpty()) {
            return RAGResult.builder()
                    .answer("No relevant information found in the knowledge base.")
                    .sources(Collections.emptyList())
                    .build();
        }

        String context = matches.stream()
                .map(m -> m.embedded().text())
                .collect(Collectors.joining("\n\n---\n\n"));

        PromptTemplate template = PromptTemplate.from(RAG_PROMPT);
        Map<String, Object> vars = new HashMap<>();
        vars.put("context", context);
        vars.put("question", question);
        Prompt prompt = template.apply(vars);

        String answer = chatModel.chat(prompt.text());

        List<RAGResult.SourceInfo> sources = matches.stream()
                .map(m -> RAGResult.SourceInfo.builder()
                        .documentId(extractLong(m.embedded().metadata(), "document_id"))
                        .documentTitle(m.embedded().metadata().getString("title"))
                        .content(truncate(m.embedded().text(), 200))
                        .score(m.score())
                        .build())
                .collect(Collectors.toList());

        return RAGResult.builder()
                .answer(answer)
                .sources(sources)
                .build();
    }

    private Long extractLong(dev.langchain4j.data.document.Metadata meta, String key) {
        try {
            String val = meta.getString(key);
            return val != null ? Long.parseLong(val) : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}
