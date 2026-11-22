
import {HttpsError} from "firebase-functions/v2/https";
import OpenAI from "openai";

import type {HistoryMessage} from "../types/business";

import {requireAdmin} from "../auth/requireAdmin";
import {getUtahDateKey} from "../utils/dateUtils";
import {loadBusinessData} from "./loadBusinessData";
import {buildBusinessMetrics} from "./buildBusinessMetrics";
import {
  buildAssistantInput,
  buildAssistantInstructions,
} from "./assistantPrompt";

type AskMilaAssistantData = {
  question?: unknown;
  history?: unknown;
};

type HandleAskMilaAssistantParams = {
  uid?: string;
  data: AskMilaAssistantData;
  apiKey: string;
};

/**
 * Handles a Mila Assistant request.
 * @param {HandleAskMilaAssistantParams} params Request data.
 * @return {Promise<{answer: string}>} Assistant response.
 */
export async function handleAskMilaAssistant({
  uid,
  data,
  apiKey,
}: HandleAskMilaAssistantParams): Promise<{
  answer: string;
}> {
  await requireAdmin(uid);

  const question = data?.question;

  const history =
    Array.isArray(data?.history) ?
      data.history :
      [];

  const safeHistory = history
    .filter(
      (message: HistoryMessage) =>
        message &&
        (
          message.role === "user" ||
          message.role === "assistant"
        ) &&
        typeof message.content === "string"
    )
    .slice(-12)
    .map(
      (message: HistoryMessage) => ({
        role:
          message.role as
            "user" | "assistant",
        content:
          (message.content as string)
            .slice(0, 5000),
      })
    );

  if (
    typeof question !== "string" ||
    question.trim().length === 0
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Please enter a question."
    );
  }

  const {
    clients,
    cleanings,
    payments,
    helpers,
  } = await loadBusinessData();

  const todayDate = getUtahDateKey();

  const businessMetrics = buildBusinessMetrics({
    clients,
    cleanings,
    payments,
    helpers,
    todayDate,
  });

  const openai = new OpenAI({
    apiKey,
  });

  const response =
    await openai.responses.create({
      model: "gpt-5.6-luna",

      instructions:
        buildAssistantInstructions(todayDate),

      input: buildAssistantInput({
        businessMetrics,
        clients,
        cleanings,
        payments,
        history: safeHistory,
        question,
      }),
    });

  return {
    answer: response.output_text,
  };
}
