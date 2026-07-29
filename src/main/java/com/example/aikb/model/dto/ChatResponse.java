package com.example.aikb.model.dto;
import lombok.*; import java.util.List;
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatResponse {
    private Long sessionId; private String answer; private List<SourceInfo> sources;
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SourceInfo { private Long documentId; private String documentTitle; private String content; private double score; }
}
