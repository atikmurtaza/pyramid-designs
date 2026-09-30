// Version 1 deliberately supports plain paragraphs only; HTML is never interpreted.
export function narrativeDocument(paragraphs: string[]) {
  return { version: 1, type: "document", children: paragraphs.map((text) => ({
    type: "paragraph", children: [{ type: "text", text }],
  })) };
}

export function narrativeParagraphs(value: unknown): string[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const document = value as Record<string, unknown>;
  if (Object.keys(document).sort().join(",") !== "children,type,version" || document.version !== 1
    || document.type !== "document" || !Array.isArray(document.children) || document.children.length > 30) return null;
  const paragraphs: string[] = [];
  for (const paragraph of document.children) {
    if (!paragraph || Object.keys(paragraph).sort().join(",") !== "children,type" || paragraph.type !== "paragraph"
      || !Array.isArray(paragraph.children) || paragraph.children.length !== 1) return null;
    const text = paragraph.children[0];
    if (!text || Object.keys(text).sort().join(",") !== "text,type" || text.type !== "text" || typeof text.text !== "string"
      || !text.text.trim() || text.text.length > 2000 || text.text.includes("\u0000")) return null;
    paragraphs.push(text.text);
  }
  return paragraphs;
}

export function containsFixtureContent(value: unknown) {
  return /synthetic|fixture|prototype/i.test(JSON.stringify(value));
}
