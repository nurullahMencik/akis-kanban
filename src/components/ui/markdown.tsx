import { Fragment, type ReactNode } from "react";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; lines: string[] };

const UNORDERED = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^#{1,6}\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  const startsBlock = (line: string) => HEADING.test(line) || UNORDERED.test(line) || ORDERED.test(line) || QUOTE.test(line);

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: "heading", text: heading[1] ?? "" });
      index += 1;
      continue;
    }
    const listPattern = UNORDERED.test(line) ? UNORDERED : ORDERED.test(line) ? ORDERED : null;
    if (listPattern) {
      const items: string[] = [];
      while (index < lines.length && listPattern.test(lines[index] ?? "")) {
        items.push(listPattern.exec(lines[index] ?? "")?.[1] ?? "");
        index += 1;
      }
      blocks.push({ type: "list", ordered: listPattern === ORDERED, items });
      continue;
    }
    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && QUOTE.test(lines[index] ?? "")) {
        quoted.push(QUOTE.exec(lines[index] ?? "")?.[1] ?? "");
        index += 1;
      }
      blocks.push({ type: "quote", lines: quoted });
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && (lines[index] ?? "").trim() && !startsBlock(lines[index] ?? "")) {
      paragraph.push(lines[index] ?? "");
      index += 1;
    }
    blocks.push({ type: "paragraph", lines: paragraph });
  }
  return blocks;
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;

/** Inline markdown → React nodes. Only http(s) links are rendered; no raw HTML ever reaches the DOM. */
export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const [token] = match;
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const key = `${start}-${token.length}`;
    if (match[1]) nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (match[2]) nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (match[3]) nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    else if (match[4]) {
      const link = /^\[([^\]]+)\]\((.+)\)$/.exec(token);
      nodes.push(
        <a key={key} href={link?.[2]} target="_blank" rel="noopener noreferrer">
          {link?.[1]}
        </a>,
      );
    }
    last = start + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={`markdown text-sm leading-relaxed text-ink-2 ${className ?? ""}`}>
      {parseMarkdown(source).map((block, index) => {
        switch (block.type) {
          case "heading":
            return <h4 key={index}>{renderInline(block.text)}</h4>;
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </List>
            );
          }
          case "quote":
            return <blockquote key={index}>{renderInline(block.lines.join(" "))}</blockquote>;
          default:
            return (
              <p key={index}>
                {block.lines.map((line, lineIndex) => (
                  <Fragment key={lineIndex}>
                    {lineIndex > 0 ? <br /> : null}
                    {renderInline(line)}
                  </Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
