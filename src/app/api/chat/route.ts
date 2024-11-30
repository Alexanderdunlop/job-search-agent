import { customModel } from "@/ai";
import { convertToCoreMessages, streamText } from "ai";

export async function POST(request: Request) {
  const { messages, selectedFilePathnames } = await request.json();

  const result = await streamText({
    model: customModel,
    system:
      "you are a friendly assistant! keep your responses concise and helpful.",
    messages: convertToCoreMessages(messages),
    experimental_providerMetadata: {
      files: {
        selection: selectedFilePathnames,
      },
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}
