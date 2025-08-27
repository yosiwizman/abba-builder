import React, { useState } from "react";
import { usePrompts } from "@/hooks/usePrompts";
import {
  CreatePromptDialog,
  CreateOrEditPromptDialog,
} from "@/components/CreatePromptDialog";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { GitHubLauncher } from "@/components/GitHubLauncher";
import { AppGallery } from "@/components/AppGallery";
import KnowledgeHub from "@/components/KnowledgeHub";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LibraryPage() {
  const { prompts, isLoading, createPrompt, updatePrompt, deletePrompt } =
    usePrompts();
  const [activeTab, setActiveTab] = useState("apps");

  return (
    <div className="min-h-screen px-8 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Library</h1>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="knowledge">Knowledge Hub</TabsTrigger>
              <TabsTrigger value="apps">App Gallery</TabsTrigger>
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
              <TabsTrigger value="github">GitHub Launcher</TabsTrigger>
            </TabsList>

            <TabsContent value="prompts">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Prompts</h2>
                <CreatePromptDialog onCreatePrompt={createPrompt} />
              </div>

              {isLoading ? (
                <div>Loading...</div>
              ) : prompts.length === 0 ? (
                <div className="text-muted-foreground">
                  No prompts yet. Create one to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {prompts.map((p) => (
                    <PromptCard
                      key={p.id}
                      prompt={p}
                      onUpdate={updatePrompt}
                      onDelete={deletePrompt}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="apps">
              <AppGallery />
            </TabsContent>

            <TabsContent value="github">
              <GitHubLauncher />
            </TabsContent>

            <TabsContent value="knowledge" className="h-full">
              <KnowledgeHub />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function PromptCard({
  prompt,
  onUpdate,
  onDelete,
}: {
  prompt: {
    id: number;
    title: string;
    description: string | null;
    content: string;
  };
  onUpdate: (p: {
    id: number;
    title: string;
    description?: string;
    content: string;
  }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  return (
    <div
      data-testid="prompt-card"
      className="border rounded-lg p-4 bg-(--background-lightest) min-w-80"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{prompt.title}</h3>
            {prompt.description && (
              <p className="text-sm text-muted-foreground">
                {prompt.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <CreateOrEditPromptDialog
              mode="edit"
              prompt={prompt}
              onUpdatePrompt={onUpdate}
            />
            <DeleteConfirmationDialog
              itemName={prompt.title}
              itemType="Prompt"
              onDelete={() => onDelete(prompt.id)}
            />
          </div>
        </div>
        <pre className="text-sm whitespace-pre-wrap bg-transparent border rounded p-2 max-h-48 overflow-auto">
          {prompt.content}
        </pre>
      </div>
    </div>
  );
}
