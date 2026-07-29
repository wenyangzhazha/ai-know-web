package com.example.aikb.service;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.splitter.DocumentByParagraphSplitter;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddingService {

    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;

    @Value("${app.document.chunk-size:800}")
    private int chunkSize;

    @Value("${app.document.chunk-overlap:100}")
    private int chunkOverlap;

    public List<TextSegment> splitDocument(Document document) {
        DocumentByParagraphSplitter splitter = new DocumentByParagraphSplitter(
                chunkSize, chunkOverlap);
        return splitter.split(document);
    }

    public void embedAndStore(List<TextSegment> segments,
                              Long knowledgeBaseId,
                              Long documentId,
                              Map<String, String> baseMetadata) {
        for (int i = 0; i < segments.size(); i++) {
            TextSegment segment = segments.get(i);
            dev.langchain4j.data.document.Metadata meta = segment.metadata().copy();
            meta.put("knowledge_base_id", String.valueOf(knowledgeBaseId));
            meta.put("document_id", String.valueOf(documentId));
            meta.put("chunk_index", String.valueOf(i));
            if (baseMetadata != null) {
                baseMetadata.forEach(meta::put);
            }

            TextSegment enrichedSegment = TextSegment.from(segment.text(), meta);
            Embedding embedding = embeddingModel.embed(segment.text()).content();
            embeddingStore.add(embedding, enrichedSegment);
        }
        log.info("Embedded and stored {} segments for document {}", segments.size(), documentId);
    }

    public Embedding embedQuery(String query) {
        return embeddingModel.embed(query).content();
    }

    public void removeEmbeddings(String documentId) {
        embeddingStore.removeAll(
                dev.langchain4j.store.embedding.filter.MetadataFilterBuilder
                        .metadataKey("document_id")
                        .isEqualTo(documentId));
        log.info("Removed embeddings for document {}", documentId);
    }
}
