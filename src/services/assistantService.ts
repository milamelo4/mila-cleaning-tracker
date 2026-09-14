import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

type AskAssistantResponse = {
  answer: string;
};

const askMilaAssistant = httpsCallable<
  { question: string },
  AskAssistantResponse
>(functions, "askMilaAssistant");

export async function askAssistant(question: string) {
  const result = await askMilaAssistant({ question });

  return result.data.answer;
}