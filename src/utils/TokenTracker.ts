class TokenTracker {
  constructor(public totalTokens: number = 0, public batchTokens: number[] = []) {}

  addTokens(tokens: number): void {
    this.totalTokens += tokens;
    this.batchTokens.push(tokens);
  }

  getSummary(): { totalTokens: number; batchCount: number; batchTokens: number[] } {
    return {
      totalTokens: this.totalTokens,
      batchCount: this.batchTokens.length,
      batchTokens: this.batchTokens,
    };
  }
}

export default TokenTracker;