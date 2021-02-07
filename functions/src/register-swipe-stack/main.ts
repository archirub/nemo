import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  registerSwipeChoicesRequest,
  uidChoiceMap,
  mdFromDatabase,
  SwipeMode,
} from "../../../src/app/shared/interfaces/index";
import { createDatingChatDocuments, handleDatingYesChoices } from "./dating-mode";
import { createFriendChatDocuments, handleFriendYesChoices } from "./friend-mode";

export const registerSwipeChoices = functions
  .region("europe-west2")
  .https.onCall(async (dataRequest: registerSwipeChoicesRequest, context) => {
    if (!context.auth)
      throw new functions.https.HttpsError("unauthenticated", "User no autenticated.");
    const currentUserID: string = context.auth.uid;
    const choices: uidChoiceMap[] = dataRequest.choices;
    const targetMatchData = (await admin
      .firestore()
      .collection("matchData")
      .doc(currentUserID)
      .get()) as FirebaseFirestore.DocumentSnapshot<mdFromDatabase>;

    const swipeMode = targetMatchData.data()?.swipeMode || "";
    if (!["friend", "dating"].includes(swipeMode)) {
      throw new functions.https.HttpsError(
        "aborted",
        `swipeMode not recognized: ${swipeMode}`
      );
    }

    const batch = admin.firestore().batch();

    const date = admin.firestore.Timestamp.fromDate(new Date());

    const { yes, no, superLike } = separateChoices(choices);

    if (no.length > 0)
      handleNoChoices(batch, targetMatchData.ref, swipeMode as SwipeMode, no, date);

    try {
      // DATING MODE HANDLING
      if (swipeMode === "dating") {
        let matchedUsers: string[] | undefined;
        if (yes.length > 0 || superLike.length > 0) {
          matchedUsers = await handleDatingYesChoices(
            batch,
            targetMatchData.ref,
            currentUserID,
            yes,
            superLike,
            date
          );
        }

        await batch.commit();

        if (typeof matchedUsers !== "undefined" && matchedUsers.length > 0)
          await createDatingChatDocuments(currentUserID, matchedUsers);

        // FRIEND MODE HANDLING
      } else if (swipeMode === "friend") {
        let fmatchedUsers: string[] | undefined;
        if (yes.length > 0 || superLike.length > 0) {
          fmatchedUsers = await handleFriendYesChoices(
            batch,
            targetMatchData.ref,
            currentUserID,
            yes,
            date
          );
        }

        await batch.commit();

        if (typeof fmatchedUsers !== "undefined" && fmatchedUsers.length > 0)
          await createFriendChatDocuments(currentUserID, fmatchedUsers);
      }
    } catch (e) {
      throw new functions.https.HttpsError(
        "aborted",
        `error occured during handleYesChoices or while trying to commit the batch ${e}`
      );
    }
  });

function separateChoices(
  choices: uidChoiceMap[]
): { yes: string[]; no: string[]; superLike: string[] } {
  if (!choices) return { yes: [], no: [], superLike: [] };

  const yes: string[] = [];
  const no: string[] = [];
  const superLike: string[] = [];

  choices.forEach((choice) => {
    if (choice.choice === "yes") yes.push(choice.uid);
    else if (choice.choice === "no") no.push(choice.uid);
    else if (choice.choice === "super") superLike.push(choice.uid);
    else functions.logger.warn("Swipe choice not recognized:", choice.choice);
  });

  return { yes, no, superLike };
}

function handleNoChoices(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataMainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  swipeMode: SwipeMode,
  uids: string[],
  date: admin.firestore.Timestamp
) {
  // if (!uids || !batch || !targetMatchDataRef)
  //   throw new functions.https.HttpsError(
  //     "invalid-argument",
  //     "handleNoChoices could not be executed due to missing / invalid arguments."
  //   );
  const uidDateMaps: {
    uid: string;
    dateMap: { exists: true; date: admin.firestore.Timestamp };
  }[] = uids.map((uid) => {
    return { uid: uid, dateMap: { exists: true, date } };
  });

  if (uids.length > 0) {
    if (swipeMode === "dating") {
      uidDateMaps.forEach((uidref) => {
        batch.update(targetMatchDataMainRef, {
          [`dislikedUsers.${uidref.uid}`]: uidref.dateMap,
        });
      });
    } else if (swipeMode === "friend") {
      uidDateMaps.forEach((uidref) => {
        batch.update(targetMatchDataMainRef, {
          [`fdislikedUsers.${uidref.uid}`]: uidref.dateMap,
        });
      });
    }
  }
}

/**  ESSENTIAL FOR SORTING THE UIDS IN THE UIDS ARRAY IN CHAT DOCUMENTS
TO BE ABLE TO FIND THEM IN THE DATABASE */
export function sortUIDs(uids: string[]): string[] {
  return uids.sort((a, b) => ("" + a).localeCompare(b));
}
