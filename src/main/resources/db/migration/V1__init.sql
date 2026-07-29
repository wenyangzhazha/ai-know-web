CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_bases (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
    id                BIGSERIAL PRIMARY KEY,
    knowledge_base_id BIGINT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    title             VARCHAR(500) NOT NULL,
    file_name         VARCHAR(500) NOT NULL,
    file_type         VARCHAR(50)  NOT NULL,
    file_size         BIGINT       NOT NULL,
    file_path         VARCHAR(1000),
    status            VARCHAR(20)  NOT NULL DEFAULT 'UPLOADED',
    chunk_count       INT          NOT NULL DEFAULT 0,
    error_message     TEXT,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_documents_kb_id ON documents(knowledge_base_id);
CREATE INDEX idx_documents_status ON documents(status);

CREATE TABLE document_chunks (
    id          BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content     TEXT   NOT NULL,
    chunk_index INT    NOT NULL,
    token_count INT,
    metadata    JSONB,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);
CREATE INDEX idx_chunks_doc_id ON document_chunks(document_id);

CREATE TABLE vector_store (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id          BIGINT NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
    knowledge_base_id BIGINT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    embedding         vector(1536),
    metadata          JSONB,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vector_kb_id ON vector_store(knowledge_base_id);
CREATE INDEX idx_vector_embedding ON vector_store USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);

CREATE TABLE chat_sessions (
    id                BIGSERIAL PRIMARY KEY,
    knowledge_base_id BIGINT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    title             VARCHAR(500),
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_sessions_kb_id ON chat_sessions(knowledge_base_id);

CREATE TABLE chat_messages (
    id          BIGSERIAL PRIMARY KEY,
    session_id  BIGINT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL,
    content     TEXT NOT NULL,
    sources     JSONB,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_session_id ON chat_messages(session_id);
