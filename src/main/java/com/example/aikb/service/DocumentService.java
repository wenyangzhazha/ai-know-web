package com.example.aikb.service;

import com.example.aikb.model.entity.Document;
import com.example.aikb.model.entity.DocumentChunk;
import com.example.aikb.model.enums.DocumentStatus;
import com.example.aikb.repository.DocumentChunkRepository;
import com.example.aikb.repository.DocumentRepository;
import com.example.aikb.repository.KnowledgeBaseRepository;
import dev.langchain4j.data.document.loader.FileSystemDocumentLoader;
import dev.langchain4j.data.segment.TextSegment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final KnowledgeBaseRepository kbRepository;
    private final EmbeddingService embeddingService;

    private static final String UPLOAD_DIR = "uploads/documents";

    @Transactional
    public Document uploadDocument(Long kbId, MultipartFile file) throws IOException {
        kbRepository.findById(kbId)
                .orElseThrow(() -> new RuntimeException("Knowledge base not found: " + kbId));

        String originalName = file.getOriginalFilename();
        String fileType = getFileExtension(originalName);

        Path uploadDir = Paths.get(UPLOAD_DIR);
        Files.createDirectories(uploadDir);
        String storedName = UUID.randomUUID() + "." + fileType;
        Path filePath = uploadDir.resolve(storedName);
        file.transferTo(filePath.toFile());

        Document doc = Document.builder()
                .knowledgeBaseId(kbId)
                .title(originalName != null ? originalName : "Untitled")
                .fileName(originalName)
                .fileType(fileType)
                .fileSize(file.getSize())
                .filePath(filePath.toString())
                .status(DocumentStatus.UPLOADED)
                .build();

        documentRepository.save(doc);
        log.info("Document uploaded: {} (id={}) to KB {}", originalName, doc.getId(), kbId);
        return doc;
    }

    @Async("documentProcessor")
    @Transactional
    public void processDocument(Long documentId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));

        try {
            doc.setStatus(DocumentStatus.PARSING);
            documentRepository.save(doc);

            Path filePath = Paths.get(doc.getFilePath());
            dev.langchain4j.data.document.Document langDoc =
                    FileSystemDocumentLoader.loadDocument(filePath,
                            new dev.langchain4j.data.document.parser.TextDocumentParser());

            doc.setStatus(DocumentStatus.CHUNKING);
            documentRepository.save(doc);

            List<TextSegment> segments = embeddingService.splitDocument(langDoc);
            List<DocumentChunk> chunks = new ArrayList<>();
            for (int i = 0; i < segments.size(); i++) {
                TextSegment seg = segments.get(i);
                DocumentChunk chunk = DocumentChunk.builder()
                        .documentId(documentId)
                        .content(seg.text())
                        .chunkIndex(i)
                        .tokenCount(estimateTokenCount(seg.text()))
                        .metadata(seg.metadata().toString())
                        .build();
                chunks.add(chunk);
            }
            chunkRepository.saveAll(chunks);
            doc.setChunkCount(chunks.size());

            doc.setStatus(DocumentStatus.EMBEDDING);
            documentRepository.save(doc);

            Map<String, String> baseMeta = new HashMap<>();
            baseMeta.put("file_name", doc.getFileName());
            baseMeta.put("title", doc.getTitle());
            embeddingService.embedAndStore(segments, doc.getKnowledgeBaseId(),
                    documentId, baseMeta);

            doc.setStatus(DocumentStatus.READY);
            documentRepository.save(doc);
            log.info("Document processing complete: {}", documentId);

        } catch (Exception e) {
            log.error("Document processing failed: {}", documentId, e);
            doc.setStatus(DocumentStatus.FAILED);
            doc.setErrorMessage(e.getMessage());
            documentRepository.save(doc);
        }
    }

    @Transactional
    public void deleteDocument(Long documentId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));

        embeddingService.removeEmbeddings(String.valueOf(documentId));
        chunkRepository.deleteByDocumentId(documentId);

        try {
            Files.deleteIfExists(Paths.get(doc.getFilePath()));
        } catch (IOException e) {
            log.warn("Failed to delete file: {}", doc.getFilePath(), e);
        }

        documentRepository.delete(doc);
        log.info("Document deleted: {}", documentId);
    }

    public List<Document> listDocuments(Long kbId) {
        return documentRepository.findByKnowledgeBaseId(kbId);
    }

    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) return "unknown";
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    }

    private int estimateTokenCount(String text) {
        return Math.max(1, text.length() / 4);
    }
}
