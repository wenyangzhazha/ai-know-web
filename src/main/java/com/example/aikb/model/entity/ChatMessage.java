package com.example.aikb.model.entity;
import jakarta.persistence.*; import lombok.*; import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes; import java.time.ZonedDateTime;
@Entity @Table(name = "chat_messages") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "session_id", nullable = false) private Long sessionId;
    @Column(nullable = false, length = 20) private String role;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "JSONB") private String sources;
    @Column(name = "created_at", nullable = false, updatable = false) private ZonedDateTime createdAt;
    @PrePersist protected void onCreate() { createdAt = ZonedDateTime.now(); }
}
