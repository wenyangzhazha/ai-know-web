package com.example.aikb.service;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RAGResult {
    private String answer;
    private List<SourceInfo> sources;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SourceInfo {
        private Long documentId;
        private String documentTitle;
        private String content;
        private double score;
    }
}
