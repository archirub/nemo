import {
  mdDatingPickingFromDatabase,
  mdFriendPickingFromDatabase,
} from "./../../../../src/app/shared/interfaces/match-data.model";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  registerSwipeChoicesRequest,
  uidChoiceMap,
  mdFromDatabase,
  SwipeMode,
  piStorage,
  SwipeUserInfo,
} from "../../../../src/app/shared/interfaces/index";
import {
  profileSnapshot,
  createDatingChatDocumentsREAD,
  createDatingChatDocumentsWRITE,
  handleDatingYesChoicesREAD,
  handleDatingYesChoicesWRITE,
  uidDocRefMapDating,
} from "./dating-mode";
import {
  createFriendChatDocumentsREAD,
  createFriendChatDocumentsWRITE,
  handleFriendYesChoicesREAD,
  handleFriendYesChoicesWRITE,
  uidDocRefMapFriend,
} from "./friend-mode";
import { runWeakUserIdentityCheck } from "../../supporting-functions/user-validation/user.checker";
import { sanitizeData } from "../../supporting-functions/data-validation/main";
import {
  emptyCollectionError,
  inexistentDocumentError,
  invalidDocumentError,
} from "../../supporting-functions/error-handling/generic-errors";

export const registerSwipeChoices = functions
  .region("europe-west2")
  .https.onCall(async (request: registerSwipeChoicesRequest, context) => {
    runWeakUserIdentityCheck(context);

    const currentUserID = context?.auth?.uid as string;

    const sanitizedRequest = sanitizeData(
      "registerSwipeChoices",
      request
    ) as registerSwipeChoicesRequest;

    const choices: uidChoiceMap[] = sanitizedRequest.choices;

    await admin.firestore().runTransaction(async (transaction) => {
      const targetMatchData = (await transaction.get(
        admin.firestore().collection("matchData").doc(currentUserID)
      )) as FirebaseFirestore.DocumentSnapshot<mdFromDatabase>;

      if (!targetMatchData.exists)
        inexistentDocumentError("matchData", targetMatchData.id, currentUserID);

      const swipeMode = targetMatchData.data()?.swipeMode;

      if (!swipeMode)
        invalidDocumentError("matchData", "swipeMode", targetMatchData.id, currentUserID);

      const date = admin.firestore.Timestamp.fromDate(new Date());

      const { yes, no, superLike } = separateChoices(choices);
      const thereAreLikedUsers = yes.length > 0 || superLike.length > 0;
      const thereAreDislikedUsers = no.length > 0;

      // GENERIC READS (here regardless of swipe mode)

      const incrementCountsReadReturn = await incrementCountsREAD(
        transaction,
        currentUserID,
        [...(superLike || []), ...(yes || [])],
        no
      );

      // DATING MODE HANDLING
      if (swipeMode === "dating") {
        let handleDatingYesChoicesReadReturn: {
          notMatchedYesUsers: uidDocRefMapDating[];
          notMatchedSuperUsers: uidDocRefMapDating[];
          matchedUsers: uidDocRefMapDating[];
        } | null = null;
        let createDatingChatDocumentsReadReturn: {
          targetUserProfile: profileSnapshot;
          matchedUserProfiles: profileSnapshot[];
        } | null = null;

        // DATING READS

        if (thereAreLikedUsers) {
          handleDatingYesChoicesReadReturn = await handleDatingYesChoicesREAD(
            transaction,
            currentUserID,
            yes,
            superLike,
            date
          );

          const matchedUsers = handleDatingYesChoicesReadReturn.matchedUsers.map(
            (mu) => mu.uid
          );

          const thereAreMatchedUsers = matchedUsers.length > 0;

          if (thereAreMatchedUsers) {
            createDatingChatDocumentsReadReturn = await createDatingChatDocumentsREAD(
              transaction,
              currentUserID,
              matchedUsers
            );
          }
        }

        // DATING WRITES

        const targetMatchDataDatingRef = admin
          .firestore()
          .collection("matchData")
          .doc(currentUserID)
          .collection("pickingData")
          .doc(
            "dating"
          ) as FirebaseFirestore.DocumentReference<mdDatingPickingFromDatabase>;
        const targetMatchDataMainRef = admin
          .firestore()
          .collection("matchData")
          .doc(currentUserID) as FirebaseFirestore.DocumentReference<mdFromDatabase>;

        if (handleDatingYesChoicesReadReturn)
          handleDatingYesChoicesWRITE(
            transaction,
            targetMatchDataMainRef,
            targetMatchDataDatingRef,
            currentUserID,
            handleDatingYesChoicesReadReturn.notMatchedYesUsers,
            handleDatingYesChoicesReadReturn.notMatchedSuperUsers,
            handleDatingYesChoicesReadReturn.matchedUsers
          );

        if (createDatingChatDocumentsReadReturn)
          createDatingChatDocumentsWRITE(
            transaction,
            createDatingChatDocumentsReadReturn.targetUserProfile,
            createDatingChatDocumentsReadReturn.matchedUserProfiles
          );

        // FRIEND MODE HANDLING
      } else if (swipeMode === "friend") {
        let handleFriendYesChoicesReadReturn: {
          notMatchedYesUsers: uidDocRefMapFriend[];
          matchedUsers: uidDocRefMapFriend[];
        } | null = null;
        let createFriendChatDocumentsReadReturn: {
          targetUserProfile: profileSnapshot;
          matchedUserProfiles: profileSnapshot[];
        } | null = null;

        // FRIEND READS

        if (thereAreLikedUsers) {
          handleFriendYesChoicesReadReturn = await handleFriendYesChoicesREAD(
            transaction,
            currentUserID,
            yes,
            date
          );

          const matchedUsers = handleFriendYesChoicesReadReturn.matchedUsers.map(
            (mu) => mu.uid
          );

          const thereAreMatchedUsers = matchedUsers.length > 0;

          if (thereAreMatchedUsers) {
            createFriendChatDocumentsReadReturn = await createFriendChatDocumentsREAD(
              transaction,
              currentUserID,
              matchedUsers
            );
          }
        }

        // FRIEND WRITES

        const targetMatchDataFriendRef = admin
          .firestore()
          .collection("matchData")
          .doc(currentUserID)
          .collection("pickingData")
          .doc(
            "friend"
          ) as FirebaseFirestore.DocumentReference<mdFriendPickingFromDatabase>;
        const targetMatchDataMainRef = admin
          .firestore()
          .collection("matchData")
          .doc(currentUserID) as FirebaseFirestore.DocumentReference<mdFromDatabase>;

        if (handleFriendYesChoicesReadReturn)
          handleFriendYesChoicesWRITE(
            transaction,
            targetMatchDataMainRef,
            targetMatchDataFriendRef,
            currentUserID,
            handleFriendYesChoicesReadReturn.notMatchedYesUsers,
            handleFriendYesChoicesReadReturn.matchedUsers
          );

        if (createFriendChatDocumentsReadReturn)
          createDatingChatDocumentsWRITE(
            transaction,
            createFriendChatDocumentsReadReturn.targetUserProfile,
            createFriendChatDocumentsReadReturn.matchedUserProfiles
          );
      }

      // REMAINING WRITES (which don't depend on friend vs dating mode)

      if (thereAreDislikedUsers)
        UpdateNoChoicesWRITE(
          transaction,
          targetMatchData.ref,
          swipeMode as SwipeMode,
          no,
          date
        );

      incrementCountsWRITE(
        transaction,
        incrementCountsReadReturn,
        [...(superLike || []), ...(yes || [])],
        no
      );
    });
  });

function separateChoices(choices: uidChoiceMap[]): {
  yes: string[];
  no: string[];
  superLike: string[];
} {
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

function UpdateNoChoicesWRITE(
  transaction: FirebaseFirestore.Transaction,
  targetMatchDataMainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  swipeMode: SwipeMode,
  uids: string[],
  date: admin.firestore.Timestamp
) {
  const uidDateMaps: {
    uid: string;
    dateMap: { exists: true; date: admin.firestore.Timestamp };
  }[] = uids.map((uid) => {
    return { uid: uid, dateMap: { exists: true, date } };
  });

  if (uids.length > 0) {
    if (swipeMode === "dating") {
      uidDateMaps.forEach((uidref) => {
        transaction.update(targetMatchDataMainRef, {
          [`dislikedUsers.${uidref.uid}`]: uidref.dateMap,
        });
      });
    } else if (swipeMode === "friend") {
      uidDateMaps.forEach((uidref) => {
        transaction.update(targetMatchDataMainRef, {
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

async function incrementCountsREAD(
  transaction: FirebaseFirestore.Transaction,
  currentuid: string,
  yesAndSuper: string[],
  no: string[]
): Promise<
  FirebaseFirestore.QuerySnapshot<{
    [uid: string]: SwipeUserInfo;
  }>
> {
  const piStorageDocs = (await transaction.get(
    admin
      .firestore()
      .collection("piStorage")
      .where("uids", "array-contains-any", [...(yesAndSuper || []), ...(no || [])])
  )) as FirebaseFirestore.QuerySnapshot<{ [uid: string]: SwipeUserInfo }>;

  if (piStorageDocs.empty) emptyCollectionError("piStorage", currentuid);

  return piStorageDocs;
}

/** Only used for dating mode (at least for now) since dating mode is the only
 * thing that uses PI
 */
function incrementCountsWRITE(
  transaction: FirebaseFirestore.Transaction,
  piStorageDocs: FirebaseFirestore.QuerySnapshot<{
    [uid: string]: SwipeUserInfo;
  }>,
  yesAndSuper: string[],
  no: string[]
) {
  piStorageDocs.docs.forEach((piStorageDoc) => {
    const piData = piStorageDoc.data();
    yesAndSuper.forEach((uid_) => {
      if (piData.hasOwnProperty(uid_)) {
        transaction.update(piStorageDoc.ref, {
          [`${uid_}.seenCount`]: admin.firestore.FieldValue.increment(1),
          [`${uid_}.likeCount`]: admin.firestore.FieldValue.increment(1),
        });
      }
    });

    no.forEach((uid_) => {
      if (piData.hasOwnProperty(uid_)) {
        transaction.update(piStorageDoc.ref, {
          [`${uid_}.seenCount`]: admin.firestore.FieldValue.increment(1),
        });
      }
    });
  });
}
