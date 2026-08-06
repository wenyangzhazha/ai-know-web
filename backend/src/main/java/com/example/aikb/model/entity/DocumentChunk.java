package com.example.aikb.model.entity;
import jakarta.persistence.*; import lombok.*; import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes; import java.time.ZonedDateTime;
@Entity @Table(name = "document_chunks") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DocumentChunk {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "document_id", nullable = false) private Long documentId;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @Column(name = "chunk_index", nullable = false) private int chunkIndex;
    @Column(name = "token_count") private Integer tokenCount;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "JSONB") private String metadata;
    @Column(name = "created_at", nullable = false, updatable = false) private ZonedDateTime createdAt;
    @PrePersist protected void onCreate() { createdAt = ZonedDateTime.now(); }
}
