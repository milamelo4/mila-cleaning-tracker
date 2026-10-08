import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type AskAssistantResponse = {
  answer: string;
};

type AskAssistantRequest = {
  question: string;
  history: AssistantHistoryMessage[];
};

const askMilaAssistant = httpsCallable<
  AskAssistantRequest,
  AskAssistantResponse
>(functions, "askMilaAssistant");

export async function askAssistant(
  question: string,
  history: AssistantHistoryMessage[] = []
) {
  const result = await askMilaAssistant({
    question,
    history,
  });

  return result.data.answer;
}