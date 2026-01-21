import { Injectable, OnModuleInit } from "@nestjs/common";
import * as path from "path";

// web-tree-sitter types
type Language = any;
type SyntaxNode = any;
type Tree = any;
type ParserType = any;

export interface ParsedChunk {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  chunkType: "function" | "class" | "method" | "module" | "imports" | "other";
  name?: string;
  language: string;
}

interface ASTNode {
  type: string;
  name?: string;
  startLine: number;
  endLine: number;
  content: string;
}

// Map file extensions to language names
const EXTENSION_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
};

// Node types to extract for each language
const EXTRACTABLE_NODES: Record<string, string[]> = {
  typescript: [
    "function_declaration",
    "arrow_function",
    "method_definition",
    "class_declaration",
    "interface_declaration",
    "type_alias_declaration",
    "export_statement",
    "lexical_declaration",
  ],
  tsx: [
    "function_declaration",
    "arrow_function",
    "method_definition",
    "class_declaration",
    "interface_declaration",
    "type_alias_declaration",
    "export_statement",
    "lexical_declaration",
  ],
  javascript: [
    "function_declaration",
    "arrow_function",
    "method_definition",
    "class_declaration",
    "export_statement",
    "lexical_declaration",
  ],
  python: [
    "function_definition",
    "class_definition",
    "decorated_definition",
  ],
  go: [
    "function_declaration",
    "method_declaration",
    "type_declaration",
  ],
  rust: [
    "function_item",
    "impl_item",
    "struct_item",
    "enum_item",
    "trait_item",
  ],
};

@Injectable()
export class ParserService implements OnModuleInit {
  private Parser: any = null;
  private parser: ParserType | null = null;
  private languages: Map<string, Language> = new Map();
  private initialized = false;

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      // Dynamic import for web-tree-sitter
      const TreeSitter = await import("web-tree-sitter");
      this.Parser = TreeSitter.default;

      await this.Parser.init();
      this.parser = new this.Parser();

      // Load all language WASM files
      const wasmDir = path.join(__dirname, "wasm");
      const languageFiles: [string, string][] = [
        ["typescript", "tree-sitter-typescript.wasm"],
        ["tsx", "tree-sitter-tsx.wasm"],
        ["javascript", "tree-sitter-javascript.wasm"],
        ["python", "tree-sitter-python.wasm"],
        ["go", "tree-sitter-go.wasm"],
        ["rust", "tree-sitter-rust.wasm"],
      ];

      for (const [langName, wasmFile] of languageFiles) {
        try {
          const wasmPath = path.join(wasmDir, wasmFile);
          const language = await this.Parser.Language.load(wasmPath);
          this.languages.set(langName, language);
        } catch (error) {
          console.warn(`Failed to load ${langName} parser:`, error);
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize tree-sitter:", error);
    }
  }

  /**
   * Detect language from file extension
   */
  detectLanguage(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    return EXTENSION_MAP[ext] || null;
  }

  /**
   * Check if a language is supported
   */
  isSupported(language: string): boolean {
    return this.languages.has(language);
  }

  /**
   * Parse files into smart chunks using tree-sitter AST
   */
  async parseFiles(files: { path: string; content: string }[]): Promise<ParsedChunk[]> {
    await this.initialize();

    const allChunks: ParsedChunk[] = [];

    for (const file of files) {
      const language = this.detectLanguage(file.path);

      if (language && this.isSupported(language)) {
        const chunks = await this.parseFileWithAST(file.path, file.content, language);
        allChunks.push(...chunks);
      } else {
        // Fallback to line-based chunking for unsupported languages
        const chunks = this.fallbackChunking(file.path, file.content);
        allChunks.push(...chunks);
      }
    }

    return allChunks;
  }

  /**
   * Parse a single file using tree-sitter AST
   */
  private async parseFileWithAST(
    filePath: string,
    content: string,
    language: string,
  ): Promise<ParsedChunk[]> {
    if (!this.parser) {
      return this.fallbackChunking(filePath, content);
    }

    const lang = this.languages.get(language);
    if (!lang) {
      return this.fallbackChunking(filePath, content);
    }

    this.parser.setLanguage(lang);
    const tree: Tree = this.parser.parse(content);
    const rootNode = tree.rootNode;

    // Extract relevant AST nodes
    const nodes = this.extractNodes(rootNode, content, language);

    // Apply smart chunking strategy
    const chunks = this.smartChunk(nodes, filePath, content, language);

    return chunks;
  }

  /**
   * Extract relevant AST nodes from the tree
   */
  private extractNodes(
    rootNode: SyntaxNode,
    content: string,
    language: string,
  ): ASTNode[] {
    const nodes: ASTNode[] = [];
    const extractableTypes = EXTRACTABLE_NODES[language] || [];

    const traverse = (node: SyntaxNode) => {
      if (extractableTypes.includes(node.type)) {
        const name = this.extractNodeName(node, language);
        nodes.push({
          type: node.type,
          name,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          content: content.slice(node.startIndex, node.endIndex),
        });
      } else {
        // Traverse children
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (child) traverse(child);
        }
      }
    };

    traverse(rootNode);
    return nodes;
  }

  /**
   * Extract the name of a node (function name, class name, etc.)
   */
  private extractNodeName(node: SyntaxNode, language: string): string | undefined {
    // Try common name patterns
    const nameNode =
      node.childForFieldName?.("name") ||
      node.childForFieldName?.("declarator")?.childForFieldName?.("name");

    if (nameNode) {
      return nameNode.text;
    }

    // Language-specific fallbacks
    if (language === "python" || language === "go") {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child?.type === "identifier") {
          return child.text;
        }
      }
    }

    return undefined;
  }

  /**
   * Apply smart chunking strategy based on node sizes
   */
  private smartChunk(
    nodes: ASTNode[],
    filePath: string,
    content: string,
    language: string,
  ): ParsedChunk[] {
    const chunks: ParsedChunk[] = [];
    const lines = content.split("\n");

    // If no nodes extracted, fall back to line-based
    if (nodes.length === 0) {
      return this.fallbackChunking(filePath, content);
    }

    // Sort nodes by start line
    nodes.sort((a, b) => a.startLine - b.startLine);

    // Handle imports/header content (before first node)
    const firstNodeStart = nodes[0].startLine;
    if (firstNodeStart > 1) {
      const headerContent = lines.slice(0, firstNodeStart - 1).join("\n").trim();
      if (headerContent.length > 0) {
        chunks.push({
          filePath,
          content: headerContent,
          startLine: 1,
          endLine: firstNodeStart - 1,
          chunkType: "imports",
          language,
        });
      }
    }

    // Group small nodes, keep medium as-is, split large ones
    const SMALL_THRESHOLD = 500; // characters
    const LARGE_THRESHOLD = 2000; // characters

    let smallBuffer: ASTNode[] = [];
    let smallBufferSize = 0;

    const flushSmallBuffer = () => {
      if (smallBuffer.length === 0) return;

      const combined = smallBuffer
        .map((n) => n.content)
        .join("\n\n");

      chunks.push({
        filePath,
        content: combined,
        startLine: smallBuffer[0].startLine,
        endLine: smallBuffer[smallBuffer.length - 1].endLine,
        chunkType: "other",
        name: smallBuffer.length === 1 ? smallBuffer[0].name : undefined,
        language,
      });

      smallBuffer = [];
      smallBufferSize = 0;
    };

    for (const node of nodes) {
      const nodeSize = node.content.length;

      if (nodeSize < SMALL_THRESHOLD) {
        // Small: group together
        if (smallBufferSize + nodeSize > LARGE_THRESHOLD) {
          flushSmallBuffer();
        }
        smallBuffer.push(node);
        smallBufferSize += nodeSize;
      } else if (nodeSize <= LARGE_THRESHOLD) {
        // Medium: keep as single chunk
        flushSmallBuffer();
        chunks.push({
          filePath,
          content: node.content,
          startLine: node.startLine,
          endLine: node.endLine,
          chunkType: this.nodeTypeToChunkType(node.type),
          name: node.name,
          language,
        });
      } else {
        // Large: split at logical boundaries
        flushSmallBuffer();
        const splitChunks = this.splitLargeNode(node, filePath, language);
        chunks.push(...splitChunks);
      }
    }

    flushSmallBuffer();

    return chunks;
  }

  /**
   * Split large nodes at logical boundaries
   */
  private splitLargeNode(
    node: ASTNode,
    filePath: string,
    language: string,
  ): ParsedChunk[] {
    const chunks: ParsedChunk[] = [];
    const lines = node.content.split("\n");
    const MAX_CHUNK_SIZE = 1500;
    const OVERLAP_LINES = 3;

    let currentChunk = "";
    let chunkStartLine = node.startLine;
    let lineIndex = 0;

    // Include function/class signature in each chunk
    const signatureLines: string[] = [];
    for (const line of lines) {
      signatureLines.push(line);
      if (line.includes("{") || line.includes(":")) {
        break;
      }
      if (signatureLines.length >= 3) break;
    }
    const signature = signatureLines.join("\n");

    for (const line of lines) {
      const potentialChunk = currentChunk + (currentChunk ? "\n" : "") + line;

      if (potentialChunk.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({
          filePath,
          content: currentChunk,
          startLine: chunkStartLine,
          endLine: node.startLine + lineIndex - 1,
          chunkType: this.nodeTypeToChunkType(node.type),
          name: node.name,
          language,
        });

        // Start new chunk with overlap and signature context
        const overlapLines = currentChunk.split("\n").slice(-OVERLAP_LINES);
        currentChunk = `// ... continued from ${node.name || "above"}\n${signature}\n// ...\n${overlapLines.join("\n")}\n${line}`;
        chunkStartLine = node.startLine + Math.max(0, lineIndex - OVERLAP_LINES);
      } else {
        currentChunk = potentialChunk;
      }

      lineIndex++;
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        filePath,
        content: currentChunk,
        startLine: chunkStartLine,
        endLine: node.endLine,
        chunkType: this.nodeTypeToChunkType(node.type),
        name: node.name,
        language,
      });
    }

    return chunks;
  }

  /**
   * Map AST node types to chunk types
   */
  private nodeTypeToChunkType(
    nodeType: string,
  ): "function" | "class" | "method" | "module" | "imports" | "other" {
    if (nodeType.includes("function") || nodeType.includes("arrow")) {
      return "function";
    }
    if (nodeType.includes("class") || nodeType.includes("struct") || nodeType.includes("impl")) {
      return "class";
    }
    if (nodeType.includes("method")) {
      return "method";
    }
    if (nodeType.includes("interface") || nodeType.includes("type") || nodeType.includes("trait")) {
      return "module";
    }
    return "other";
  }

  /**
   * Fallback to line-based chunking for unsupported languages
   */
  private fallbackChunking(filePath: string, content: string): ParsedChunk[] {
    const chunks: ParsedChunk[] = [];
    const maxChunkSize = 1500;
    const lines = content.split("\n");

    // Detect language from extension or default to "other"
    const language = this.detectLanguage(filePath) || "other";

    // For small files, keep as single chunk
    if (content.length <= maxChunkSize) {
      chunks.push({
        filePath,
        content,
        startLine: 1,
        endLine: lines.length,
        chunkType: "other",
        language,
      });
      return chunks;
    }

    // Split larger files into overlapping chunks
    let currentChunk = "";
    let chunkStartLine = 1;
    let currentLine = 1;

    for (const line of lines) {
      const potentialChunk = currentChunk + (currentChunk ? "\n" : "") + line;

      if (potentialChunk.length > maxChunkSize && currentChunk) {
        chunks.push({
          filePath,
          content: currentChunk,
          startLine: chunkStartLine,
          endLine: currentLine - 1,
          chunkType: "other",
          language,
        });

        // Start new chunk with overlap
        const overlapLines = currentChunk.split("\n").slice(-3);
        currentChunk = overlapLines.join("\n") + "\n" + line;
        chunkStartLine = Math.max(1, currentLine - 3);
      } else {
        currentChunk = potentialChunk;
      }

      currentLine++;
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        filePath,
        content: currentChunk,
        startLine: chunkStartLine,
        endLine: lines.length,
        chunkType: "other",
        language,
      });
    }

    return chunks;
  }
}
