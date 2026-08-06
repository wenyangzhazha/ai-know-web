package com.example.aikb.config;

import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Duration;

@Configuration
public class LangChain4jConfig {

    private static final String DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

    @Value("${langchain4j.open-ai.chat-model.api-key}")
    private String chatApiKey;

    @Value("${langchain4j.open-ai.chat-model.model-name:deepseek-chat}")
    private String chatModelName;

    @Value("${langchain4j.open-ai.chat-model.temperature:0.7}")
    private double temperature;

    @Value("${langchain4j.open-ai.chat-model.max-tokens:2048}")
    private int maxTokens;

    @Value("${langchain4j.open-ai.chat-model.timeout:120s}")
    private Duration chatTimeout;

    @Value("${langchain4j.open-ai.chat-model.max-retries:2}")
    private int chatMaxRetries;

    @Value("${langchain4j.open-ai.embedding-model.api-key}")
    private String embeddingApiKey;

    @Value("${langchain4j.open-ai.embedding-model.model-name:text-embedding-3-small}")
    private String embeddingModelName;

    @Value("${langchain4j.open-ai.embedding-model.timeout:60s}")
    private Duration embeddingTimeout;

    @Value("${langchain4j.open-ai.embedding-model.max-retries:2}")
    private int embeddingMaxRetries;

    @Bean
    public ChatLanguageModel chatLanguageModel() {
        return OpenAiChatModel.builder()
                .baseUrl(DEEPSEEK_BASE_URL)
                .apiKey(chatApiKey)
                .modelName(chatModelName)
                .temperature(temperature)
                .maxTokens(maxTokens)
                .timeout(chatTimeout)
                .maxRetries(chatMaxRetries)
                .build();
    }

    @Bean
    public EmbeddingModel embeddingModel() {
        return OpenAiEmbeddingModel.builder()
                .baseUrl(DEEPSEEK_BASE_URL)
                .apiKey(embeddingApiKey)
                .modelName(embeddingModelName)
                .timeout(embeddingTimeout)
                .maxRetries(embeddingMaxRetries)
                .build();
    }
}