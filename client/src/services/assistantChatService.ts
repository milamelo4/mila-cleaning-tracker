import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
  writeBatch,
  addDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";

export type AssistantChat = {
  id: string;
  title: string;
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type AssistantChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Timestamp | null;
};

const chatsRef = collection(
  db,
  "businesses",
  "mila-cleaning-tracker",
  "assistantChats"
);

export async function createAssistantChat(
  firstQuestion: string
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const title =
    firstQuestion.length > 80
      ? `${firstQuestion.slice(0, 77)}...`
      : firstQuestion;

  const chatDoc = await addDoc(chatsRef, {
    title,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return chatDoc.id;
}

export async function getAssistantChats() {
  const chatsQuery = query(
    chatsRef,
    orderBy("updatedAt", "desc")
  );

  const snapshot = await getDocs(chatsQuery);

  return snapshot.docs.map((chatDoc) => {
    const data = chatDoc.data();

    return {
      id: chatDoc.id,
      title: data.title as string,
      createdBy: data.createdBy as string,
      createdAt:
        (data.createdAt as Timestamp) ?? null,
      updatedAt:
        (data.updatedAt as Timestamp) ?? null,
    };
  });
}

export async function getAssistantChatMessages(
  chatId: string
) {
  const messagesRef = collection(
    db,
    "businesses",
    "mila-cleaning-tracker",
    "assistantChats",
    chatId,
    "messages"
  );

  const messagesQuery = query(
    messagesRef,
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(messagesQuery);

  return snapshot.docs.map((messageDoc) => {
    const data = messageDoc.data();

    return {
      id: messageDoc.id,
      role: data.role as "user" | "assistant",
      content: data.content as string,
      createdAt:
        (data.createdAt as Timestamp) ?? null,
    };
  });
}

export async function addAssistantChatMessage(
  chatId: string,
  role: "user" | "assistant",
  content: string
) {
  const chatRef = doc(
    db,
    "businesses",
    "mila-cleaning-tracker",
    "assistantChats",
    chatId
  );

  const messagesRef = collection(
    chatRef,
    "messages"
  );

  const messageRef = doc(messagesRef);
  const batch = writeBatch(db);

  batch.set(messageRef, {
    role,
    content,
    createdAt: serverTimestamp(),
  });

  batch.update(chatRef, {
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function deleteAssistantChat(
  chatId: string
) {
  const chatRef = doc(
    db,
    "businesses",
    "mila-cleaning-tracker",
    "assistantChats",
    chatId
  );

  const messagesRef = collection(
    chatRef,
    "messages"
  );

  const messagesSnapshot =
    await getDocs(messagesRef);

  const batch = writeBatch(db);

  messagesSnapshot.docs.forEach((messageDoc) => {
    batch.delete(messageDoc.ref);
  });

  batch.delete(chatRef);

  await batch.commit();
}