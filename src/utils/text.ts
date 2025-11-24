function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  if (!text) {
    return [];
  }

  const textLength = text.length;

  if (textLength <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentPosition = 0;

  while (currentPosition < textLength) {
    const endPosition = Math.min(currentPosition + chunkSize, textLength);
    const chunk = text.slice(currentPosition, endPosition);
    chunks.push(chunk);
    currentPosition += chunkSize - overlap;

    if (currentPosition >= textLength - overlap && endPosition === textLength) {
      break;
    }
  }

  return chunks;
}

export { chunkText };
