import { normalizePath } from "../../../shared/normalizePath";
import log from "electron-log";
import { SqlQuery } from "../../lib/schemas";

const logger = log.scope("abba_tag_parser");

export function getAbbaWriteTags(fullResponse: string): {
  path: string;
  content: string;
  description?: string;
}[] {
  const AbbaWriteRegex = /<dyad-write([^>]*)>([\s\S]*?)<\/dyad-write>/gi;
  const pathRegex = /path="([^"]+)"/;
  const descriptionRegex = /description="([^"]+)"/;

  let match;
  const tags: { path: string; content: string; description?: string }[] = [];

  while ((match = AbbaWriteRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1];
    let content = match[2].trim();

    const pathMatch = pathRegex.exec(attributesString);
    const descriptionMatch = descriptionRegex.exec(attributesString);

    if (pathMatch && pathMatch[1]) {
      const path = pathMatch[1];
      const description = descriptionMatch?.[1];

      const contentLines = content.split("\n");
      if (contentLines[0]?.startsWith("```")) {
        contentLines.shift();
      }
      if (contentLines[contentLines.length - 1]?.startsWith("```")) {
        contentLines.pop();
      }
      content = contentLines.join("\n");

      tags.push({ path: normalizePath(path), content, description });
    } else {
      logger.warn(
        "Found <dyad-write> tag without a valid 'path' attribute:",
        match[0],
      );
    }
  }
  return tags;
}

export function getAbbaRenameTags(fullResponse: string): {
  from: string;
  to: string;
}[] {
  const AbbaRenameRegex =
    /<dyad-rename from="([^"]+)" to="([^"]+)"[^>]*>([\s\S]*?)<\/dyad-rename>/g;
  let match;
  const tags: { from: string; to: string }[] = [];
  while ((match = AbbaRenameRegex.exec(fullResponse)) !== null) {
    tags.push({
      from: normalizePath(match[1]),
      to: normalizePath(match[2]),
    });
  }
  return tags;
}

export function getAbbaDeleteTags(fullResponse: string): string[] {
  const AbbaDeleteRegex =
    /<dyad-delete path="([^"]+)"[^>]*>([\s\S]*?)<\/dyad-delete>/g;
  let match;
  const paths: string[] = [];
  while ((match = AbbaDeleteRegex.exec(fullResponse)) !== null) {
    paths.push(normalizePath(match[1]));
  }
  return paths;
}

export function getAbbaAddDependencyTags(fullResponse: string): string[] {
  const AbbaAddDependencyRegex =
    /<dyad-add-dependency packages="([^"]+)">[^<]*<\/dyad-add-dependency>/g;
  let match;
  const packages: string[] = [];
  while ((match = AbbaAddDependencyRegex.exec(fullResponse)) !== null) {
    packages.push(...match[1].split(" "));
  }
  return packages;
}

export function getDyadChatSummaryTag(fullResponse: string): string | null {
  const dyadChatSummaryRegex =
    /<dyad-chat-summary>([\s\S]*?)<\/dyad-chat-summary>/g;
  const match = dyadChatSummaryRegex.exec(fullResponse);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

export function getAbbaExecuteSqlTags(fullResponse: string): SqlQuery[] {
  const AbbaExecuteSqlRegex =
    /<dyad-execute-sql([^>]*)>([\s\S]*?)<\/dyad-execute-sql>/g;
  const descriptionRegex = /description="([^"]+)"/;
  let match;
  const queries: { content: string; description?: string }[] = [];

  while ((match = AbbaExecuteSqlRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1] || "";
    let content = match[2].trim();
    const descriptionMatch = descriptionRegex.exec(attributesString);
    const description = descriptionMatch?.[1];

    // Handle markdown code blocks if present
    const contentLines = content.split("\n");
    if (contentLines[0]?.startsWith("```")) {
      contentLines.shift();
    }
    if (contentLines[contentLines.length - 1]?.startsWith("```")) {
      contentLines.pop();
    }
    content = contentLines.join("\n");

    queries.push({ content, description });
  }

  return queries;
}

export function getDyadCommandTags(fullResponse: string): string[] {
  const dyadCommandRegex =
    /<dyad-command type="([^"]+)"[^>]*><\/dyad-command>/g;
  let match;
  const commands: string[] = [];

  while ((match = dyadCommandRegex.exec(fullResponse)) !== null) {
    commands.push(match[1]);
  }

  return commands;
}




