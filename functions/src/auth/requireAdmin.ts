import {getFirestore} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";

/**
 * Verifies that the current user is an admin.
 * @param {string | undefined} uid Firebase user ID.
 * @return {Promise<void>} Resolves when the user is an admin.
 */
export async function requireAdmin(
  uid?: string
): Promise<void> {
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in."
    );
  }

  const db = getFirestore();

  const memberRef = db.doc(
    `businesses/mila-cleaning-tracker/members/${uid}`
  );

  const memberSnapshot = await memberRef.get();

  if (
    !memberSnapshot.exists ||
    memberSnapshot.data()?.role !== "admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Only admins can use the assistant."
    );
  }
}
