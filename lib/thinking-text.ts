export function splitThinkingBlocks(input: string) {
  let text = input || '';
  const thinking: string[] = [];

  const extract = (startToken: string, endTokens: string[]) => {
    let start = text.indexOf(startToken);
    while (start !== -1) {
      const innerStart = start + startToken.length;
      const closing = endTokens
        .map((token) => ({ token, index: text.indexOf(token, innerStart) }))
        .filter((item) => item.index !== -1)
        .sort((a, b) => a.index - b.index)[0];

      if (closing) {
        const inner = text.slice(innerStart, closing.index).trim();
        if (inner) thinking.push(inner);
        text = `${text.slice(0, start)}${text.slice(closing.index + closing.token.length)}`;
      } else {
        const inner = text.slice(innerStart).trim();
        if (inner) thinking.push(inner);
        text = text.slice(0, start);
      }

      start = text.indexOf(startToken);
    }
  };

  extract('<think>', ['</think>', '/think']);
  extract('/think', ['/think']);

  return {
    text: text.trim(),
    thinking: thinking.join('\n\n').trim(),
  };
}

export function stripThinkingBlocks(input: string) {
  return splitThinkingBlocks(input).text;
}
