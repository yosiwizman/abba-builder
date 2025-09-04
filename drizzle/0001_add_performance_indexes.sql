-- Migration: Add performance indexes
-- Generated: 2025-09-04
-- Purpose: Improve query performance by adding indexes on foreign keys and frequently queried columns

-- Apps table indexes
CREATE INDEX IF NOT EXISTS idx_apps_github_repo ON apps(github_repo);
CREATE INDEX IF NOT EXISTS idx_apps_created_at ON apps(created_at);
CREATE INDEX IF NOT EXISTS idx_apps_supabase_project_id ON apps(supabase_project_id);
CREATE INDEX IF NOT EXISTS idx_apps_neon_project_id ON apps(neon_project_id);
CREATE INDEX IF NOT EXISTS idx_apps_vercel_project_id ON apps(vercel_project_id);

-- Chats table indexes
CREATE INDEX IF NOT EXISTS idx_chats_app_id ON chats(app_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
CREATE INDEX IF NOT EXISTS idx_chats_app_id_created_at ON chats(app_id, created_at);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_approval_state ON messages(approval_state);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON messages(chat_id, created_at);

-- Versions table indexes
CREATE INDEX IF NOT EXISTS idx_versions_app_id ON versions(app_id);
CREATE INDEX IF NOT EXISTS idx_versions_created_at ON versions(created_at);
CREATE INDEX IF NOT EXISTS idx_versions_commit_hash ON versions(commit_hash);

-- Language models table indexes
CREATE INDEX IF NOT EXISTS idx_language_models_builtin_provider_id ON language_models(builtin_provider_id);
CREATE INDEX IF NOT EXISTS idx_language_models_custom_provider_id ON language_models(custom_provider_id);
CREATE INDEX IF NOT EXISTS idx_language_models_api_name ON language_models(api_name);

-- Language model providers table indexes
CREATE INDEX IF NOT EXISTS idx_language_model_providers_name ON language_model_providers(name);
