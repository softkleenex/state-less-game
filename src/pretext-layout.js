import {
  prepareRichInline,
  walkRichInlineLineRanges,
} from "@chenglou/pretext/rich-inline";

const DESKTOP_FONT = '600 15px Arial, "Apple SD Gothic Neo", sans-serif';
const COMPACT_FONT = '600 13px Arial, "Apple SD Gothic Neo", sans-serif';

export function layoutStatementChips(statements, containerWidth) {
  const compact = containerWidth < 500;
  const sidePadding = compact ? 16 : 24;
  const lineHeight = compact ? 66 : 72;
  const visualGap = compact ? 8 : 12;
  const chromeWidth = compact ? 58 : 66;
  const font = compact ? COMPACT_FONT : DESKTOP_FONT;
  const layoutWidth = Math.max(240, containerWidth - sidePadding * 2);

  const prepared = prepareRichInline(
    statements.map((statement) => ({
      text: statement.text,
      font,
      break: "never",
      extraWidth: chromeWidth + visualGap,
    })),
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
