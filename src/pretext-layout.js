import {
  layoutNextLine,
  prepareWithSegments,
} from "@chenglou/pretext";
import {
  prepareRichInline,
  walkRichInlineLineRanges,
} from "@chenglou/pretext/rich-inline";

const DESKTOP_FONT = '600 15px Arial, "Apple SD Gothic Neo", sans-serif';
const COMPACT_FONT = '600 13px Arial, "Apple SD Gothic Neo", sans-serif';
const EVIDENCE_FONT = '600 11px Arial, "Apple SD Gothic Neo", sans-serif';
const EVIDENCE_COMPACT_FONT = '600 10px Arial, "Apple SD Gothic Neo", sans-serif';
const evidencePreparedCache = new Map();
const statementPreparedCache = new Map();

function getCachedPrepared(cache, key, create) {
  const found = cache.get(key);
  if (found) return found;
  if (cache.size >= 64) cache.clear();
  const prepared = create();
  cache.set(key, prepared);
  return prepared;
}

export function layoutEvidenceFlow(evidence, containerWidth) {
  const compact = containerWidth < 500;
  const padding = compact ? 13 : 18;
  const lineHeight = compact ? 17 : 19;
  const coreSize = compact ? 48 : 58;
  const coreTop = compact ? 19 : 16;
  const coreLeft = Math.round((containerWidth - coreSize) / 2);
  const gap = compact ? 9 : 12;
  const font = compact ? EVIDENCE_COMPACT_FONT : EVIDENCE_FONT;
  const text = evidence
    .map((item) => `[${item.label}] ${item.text}`)
    .join("  ·  ");
  const prepared = getCachedPrepared(
    evidencePreparedCache,
    `${font}::${text}`,
    () => prepareWithSegments(text, font, { wordBreak: "keep-all" }),
  );
  const lines = [];
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let exhausted = false;

  for (let row = 0; row < 6 && !exhausted; row += 1) {
    const y = 12 + row * lineHeight;
    const intersectsCore = y + lineHeight > coreTop && y < coreTop + coreSize;
    const slots = intersectsCore
      ? [
          { x: padding, width: Math.max(46, coreLeft - gap - padding) },
          {
            x: coreLeft + coreSize + gap,
            width: Math.max(46, containerWidth - padding - (coreLeft + coreSize + gap)),
          },
        ]
      : [{ x: padding, width: Math.max(92, containerWidth - padding * 2) }];

    for (const slot of slots) {
      const line = layoutNextLine(prepared, cursor, slot.width);
      if (!line) {
        exhausted = true;
        break;
      }
      lines.push({
        text: line.text,
        x: slot.x,
        y,
        width: Math.ceil(line.width),
        slotWidth: slot.width,
      });
      cursor = line.end;
    }
  }

  return {
    lines,
    lineCount: lines.length,
    fontSize: compact ? 10 : 11,
    core: { left: coreLeft, top: coreTop, size: coreSize },
  };
}

export function layoutStatementChips(statements, containerWidth) {
  const compact = containerWidth < 500;
  const sidePadding = compact ? 16 : 24;
  const lineHeight = compact ? 66 : 72;
  const visualGap = compact ? 8 : 12;
  const chromeWidth = compact ? 58 : 66;
  const font = compact ? COMPACT_FONT : DESKTOP_FONT;
  const layoutWidth = Math.max(240, containerWidth - sidePadding * 2);

  const items = statements.map((statement) => ({
      text: statement.text,
      font,
      break: "never",
      extraWidth: chromeWidth + visualGap,
    }));
  const prepared = getCachedPrepared(
    statementPreparedCache,
    `${font}::${chromeWidth + visualGap}::${statements.map((statement) => statement.text).join("\u0000")}`,
    () => prepareRichInline(items),
  );

  const lines = [];
  walkRichInlineLineRanges(prepared, layoutWidth, (line) => lines.push(line));

  const totalContentHeight = Math.max(1, lines.length) * lineHeight;
  const top = Math.max(22, (226 - totalContentHeight) / 2);
  const positions = new Array(statements.length);

  lines.forEach((line, lineIndex) => {
    const occupied = line.fragments.reduce(
      (sum, fragment) => sum + fragment.gapBefore + fragment.occupiedWidth,
      0,
    );
    let x = sidePadding + Math.max(0, (layoutWidth - occupied) / 2);

    line.fragments.forEach((fragment) => {
      x += fragment.gapBefore;
      positions[fragment.itemIndex] = {
        x,
        y: top + lineIndex * lineHeight,
        width: Math.max(148, fragment.occupiedWidth - visualGap),
      };
      x += fragment.occupiedWidth;
    });
  });

  return {
    positions,
    lineCount: lines.length,
    fontSize: compact ? 13 : 15,
    measuredWidth: Math.round(layoutWidth),
  };
}
