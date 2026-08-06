package com.example.aikb.controller;

import com.example.aikb.model.dto.ApiResponse;
import com.example.aikb.model.entity.KnowledgeBase;
import com.example.aikb.repository.KnowledgeBaseRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/knowledge-bases")
@RequiredArgsConstructor
public class KnowledgeBaseController {
    private final KnowledgeBaseRepository kbRepository;

    @PostMapping
    public ApiResponse<KnowledgeBase> create(@RequestBody @Valid CreateRequest req) {
        KnowledgeBase kb = KnowledgeBase.builder().name(req.name()).description(req.description()).build();
        return ApiResponse.success(kbRepository.save(kb));
    }

    @GetMapping
    public ApiResponse<List<KnowledgeBase>> list() {
        return ApiResponse.success(kbRepository.findAll());
    }

    @GetMapping("/{id}")
    public ApiResponse<KnowledgeBase> get(@PathVariable Long id) {
        return kbRepository.findById(id).map(ApiResponse::success).orElseThrow(() -> new RuntimeException("Knowledge base not found: " + id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        kbRepository.deleteById(id);
        return ApiResponse.success(null);
    }

    public record CreateRequest(@NotBlank String name, String description) {
    }
}
