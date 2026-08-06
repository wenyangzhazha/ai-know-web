package com.example.aikb.controller;
import com.example.aikb.model.dto.ApiResponse; import com.example.aikb.model.entity.Document; import com.example.aikb.service.DocumentService;
import lombok.RequiredArgsConstructor; import org.springframework.http.HttpStatus; import org.springframework.web.bind.annotation.*; import org.springframework.web.multipart.MultipartFile;
import java.io.IOException; import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {
    private final DocumentService documentService;

    @PostMapping("/upload")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Document> upload(@RequestParam Long knowledgeBaseId, @RequestParam MultipartFile file) throws IOException {
        Document doc = documentService.uploadDocument(knowledgeBaseId, file);
        documentService.processDocument(doc.getId());
        return ApiResponse.success(doc);
    }

    @GetMapping
    public ApiResponse<List<Document>> list(@RequestParam Long knowledgeBaseId) {
        return ApiResponse.success(documentService.listDocuments(knowledgeBaseId));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        documentService.deleteDocument(id);
        return ApiResponse.success(null);
    }
}
