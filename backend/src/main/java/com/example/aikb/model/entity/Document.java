package com.example.aikb.model.entity;

import com.example.aikb.model.enums.DocumentStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

@Entity
@Table(name = "documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "knowledge_base_id", nullable = false)
    private Long knowledgeBaseId;
    @Column(nullable = false, length = 500)
    private String title;
    @Column(name = "file_name", nullable = false, length = 500)
    private String fileName;
    @Column(name = "file_type", nullable = false, length = 50)
    private String fileType;
    @Column(name = "file_size", nullable = false)
    private Long fileSize;
    @Column(name = "file_path", length = 1000)
    private String filePath;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentStatus status;
    @Column(name = "chunk_count", nullable = false)
    private int chunkCount;
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
        updatedAt = ZonedDateTime.now();
        if (status == null) status = DocumentStatus.UPLOADED;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
}
