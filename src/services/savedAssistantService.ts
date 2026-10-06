import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";

export type SavedAssistantAnswer = {
  id: string;
  question: string;
  answer: string;
  savedAt: Timestamp | null;
};

const savedAnswersRef = collection(
  db,
  "businesses",
  "mila-cleaning-tracker",
  "savedAssistantAnswers"
);

export async function saveAssistantAnswer(
  question: string,
  answer: string
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  await addDoc(savedAnswersRef, {
    question,
    answer,
    savedBy: user.uid,
    savedAt: serverTimestamp(),
  });
}

export async function getSavedAssistantAnswers() {
  const savedQuery = query(
    savedAnswersRef,
    orderBy("savedAt", "desc")
  );

  const snapshot = await getDocs(savedQuery);

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      question: data.question as string,
      answer: data.answer as string,
      savedAt: (data.savedAt as Timestamp) ?? null,
    };
  });
}