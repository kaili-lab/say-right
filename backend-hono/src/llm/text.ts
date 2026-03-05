/**
 * LLM 文本解析工具。
 * WHAT: 从模型输出中提取首个 JSON 对象。
 * WHY: 兼容模型前后夹带解释文本的常见情况，保证上层结构化解析稳定。
 */
export class LLMTextParseError extends Error {}

export function extractFirstJsonObject(rawText: string) {
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new LLMTextParseError('no json object found');
  }

  const jsonText = rawText.slice(start, end + 1);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new LLMTextParseError('invalid json object');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMTextParseError('json payload must be an object');
  }

  return parsed as Record<string, unknown>;
}
