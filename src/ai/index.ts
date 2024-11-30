import { openai } from "@ai-sdk/openai";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";
import { jobSearchMiddleware } from "./job-search-middleware";

export const customModel = wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: jobSearchMiddleware,
});
