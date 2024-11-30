import { openai } from "@ai-sdk/openai";
import { Experimental_LanguageModelV1Middleware, generateObject } from "ai";
import { z } from "zod";

const searchParamsSchema = z.object({
  keywords: z.string(),
  location: z.string().optional(),
  jobType: z.enum(["full-time", "part-time", "contract", "any"]).optional(),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

const exampleJobs = [
  {
    title: "Senior Full Stack Engineer",
    company: "TechFlow Solutions",
    location: "San Francisco, CA (Hybrid)",
    description:
      "We're seeking an experienced full-stack engineer to join our product team. You'll work with React, Node.js, and GraphQL to build scalable features for our enterprise SaaS platform. Must have 5+ years of experience with modern JavaScript frameworks and a track record of building performant web applications.",
    salary: "$165,000 - $195,000",
    url: "https://techflow.careers/jobs/senior-fullstack-123",
  },
  {
    title: "Lead Software Engineer",
    company: "DataViz Inc",
    location: "San Francisco, CA (Remote Optional)",
    description:
      "Join our core engineering team building next-generation data visualization tools. Looking for someone with deep expertise in React, Node.js, and D3.js. You'll mentor junior developers and architect new features. Experience with real-time data processing and WebGL is a plus.",
    salary: "$180,000 - $220,000",
    url: "https://dataviz.io/careers/lead-engineer-sf",
  },
  {
    title: "Full Stack Developer",
    company: "FinTech Forward",
    location: "San Francisco, CA",
    description:
      "Fast-growing fintech startup seeking full stack developers to help build our consumer banking platform. Stack includes React, Node.js, Express, and PostgreSQL. Must have experience with financial compliance and security best practices. Knowledge of payment processing APIs preferred.",
    salary: "$155,000 - $185,000",
    url: "https://fintechforward.com/jobs/fullstack-dev-2024",
  },
  {
    title: "Senior Frontend Engineer",
    company: "CloudScale Systems",
    location: "San Francisco, CA (Hybrid)",
    description:
      "Looking for a frontend specialist with deep React expertise to join our cloud infrastructure team. You'll work on our customer-facing console and internal tools. Must have experience with state management, performance optimization, and building accessible interfaces.",
    salary: "$160,000 - $200,000",
    url: "https://cloudscale.jobs/frontend-eng-sf",
  },
];

// This is a simplified example using a hypothetical job search API
async function searchJobs(schema: SearchParams) {
  return exampleJobs.filter((job) => {
    if (schema.location && !job.location.includes(schema.location)) {
      return false;
    }
    return job;
  });
}

export const jobSearchMiddleware: Experimental_LanguageModelV1Middleware = {
  transformParams: async ({ params }) => {
    const { prompt: messages } = params;

    const recentMessage = messages.pop();

    if (!recentMessage || recentMessage.role !== "user") {
      if (recentMessage) {
        messages.push(recentMessage);
      }
      return params;
    }

    const lastUserMessageContent = recentMessage.content
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("\n");

    // Classify if the message is a job search query
    const { object: classification } = await generateObject({
      model: openai("gpt-4o-mini", { structuredOutputs: true }),
      output: "enum",
      enum: ["job_search", "other"],
      system: "classify if the user message is a job search query",
      prompt: lastUserMessageContent,
    });

    if (classification !== "job_search") {
      messages.push(recentMessage);
      return params;
    }

    // Extract search parameters from the user query
    const { object: searchParams } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: searchParamsSchema,
      system: "Extract job search parameters from the query",
      prompt: lastUserMessageContent,
    });

    // Search for jobs using the extracted parameters
    const jobs = await searchJobs(searchParams);

    // Add the job results to the message
    messages.push({
      role: "user",
      content: [
        ...recentMessage.content,
        {
          type: "text",
          text: "Here are some relevant job listings I found:",
        },
        ...jobs.map((job) => ({
          type: "text" as const,
          text: `
            Title: ${job.title}
            Company: ${job.company}
            Location: ${job.location}
            Salary: ${job.salary}
            Description: ${job.description}
            URL: ${job.url}
          `.trim(),
        })),
      ],
    });

    return { ...params, prompt: messages };
  },
};
