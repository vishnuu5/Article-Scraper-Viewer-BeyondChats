import { generateText } from "ai";

export const summarizeArticle = async (content) => {
  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `Summarize the following article content in 3-5 sentences:\n\n${content}`,
    });
    return text;
  } catch (error) {
    console.error("LLM error:", error.message);
    return "Summary unavailable.";
  }
};
