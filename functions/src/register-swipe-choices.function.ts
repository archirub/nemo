import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  registerSwipeChoicesRequest,
  uidChoiceMap,
  matchDataFromDatabase,
  profileFromDatabase,
  userSnippet,
  chatFromDatabase,
} from "../../src/app/shared/interfaces/index";

export const registerSwipeChoices = functions
  .region("europe-west2")
  .https.onCall(async (dataRequest: registerSwipeChoicesRequest, context) => {
    if (!context.auth)
      throw new functions.https.HttpsError("unauthenticated", "User no autenticated.");
    const currentUserID: string = context.auth.uid;
    const choices: uidChoiceMap[] = dataRequest.choices;
    const targetMatchDataRef = admin
      .firestore()
      .collection("matchData")
      .doc(currentUserID);
    const batch = admin.firestore().batch();

    const { yes, no, superLike } = separateChoices(choices);

    if (no.length > 0) handleNoChoices(batch, targetMatchDataRef, no);

    try {
      let matchedUsers: string[] | undefined;
      if (yes.length > 0 || superLike.length > 0) {
        matchedUsers = await handleYesChoices(
          batch,
          targetMatchDataRef,
          currentUserID,
          yes,
          superLike
        );
      }

      await batch.commit();

      if (typeof matchedUsers !== "undefined" && matchedUsers.length > 0)
        await createChatDocuments(currentUserID, matchedUsers);
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
  targetMatchDataRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
  uids: string[]
) {
  if (!uids || !batch || !targetMatchDataRef)
    throw new functions.https.HttpsError(
      "invalid-argument",
      "handleNoChoices could not be executed due to missing / invalid arguments."
    );

  if (uids.length > 0) {
    batch.update(targetMatchDataRef, {
      dislikedUsers: admin.firestore.FieldValue.arrayUnion(...uids),
    });
  }
}

/** returns an array of the uids of the users who matched */
async function handleYesChoices(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
  targetuid: string,
  yesuids: string[],
  superuids: string[]
): Promise<string[]> {
  if (!targetuid || !yesuids || !superuids || !batch || !targetMatchDataRef)
    throw new functions.https.HttpsError(
      "invalid-argument",
      "handleNoChoices could not be executed due to missing / invalid arguments."
    );

  const notMatchedYesUsers: string[] = [];
  const notMatchedSuperUsers: string[] = [];
  const matchedUsers: {
    uid: string;
    ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  }[] = [];

  const alluids: string[] = yesuids.concat(superuids);

  try {
    await Promise.all(
      alluids.map(async (uid) => {
        const s = await admin.firestore().collection("matchData").doc(uid).get();
        if (!s.exists)
          return functions.logger.warn("matchData doc doesn't exist for", uid);

        const matchData = s.data() as matchDataFromDatabase;

        // Check whether targetID is in user's liked or superliked array
        let uidIndex: number = matchData.likedUsers.indexOf(targetuid);
        uidIndex =
          uidIndex === -1 ? matchData.superLikedUsers.indexOf(targetuid) : uidIndex;

        // If targetID is, then add to match otherwise add to like or super
        if (uidIndex !== -1) {
          matchedUsers.push({ uid, ref: s.ref });
        } else {
          // If other's ID was from normal likes, add them there, otherwise add to super
          if (superuids.indexOf(uid) === -1) {
            notMatchedYesUsers.push(uid);
          } else {
            notMatchedSuperUsers.push(uid);
          }
        }
      })
    );

    handleNotMatchUsers(
      batch,
      targetMatchDataRef,
      notMatchedYesUsers,
      notMatchedSuperUsers
    );

    handleMatchUsers(batch, targetMatchDataRef, targetuid, matchedUsers);

    return matchedUsers.map((map) => map.uid);
  } catch (e) {
    throw new functions.https.HttpsError(
      "internal",
      `Could not handle yes choices of ${targetuid}: ${e}`
    );
  }
}

interface uidDocrefMap {
  uid: string;
  ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
}

function handleMatchUsers(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
  targetuid: string,
  uidRefs: uidDocrefMap[]
) {
  if (!batch || !targetMatchDataRef || !targetuid || !uidRefs || uidRefs.length < 1)
    throw new functions.https.HttpsError(
      "internal",
      "Missing parameter in handleMatchUsers"
    );
  // In here you need to add id to both users matchedUsers arrays,
  // You need to remove uid from the non target user's likedUsers

  // UPDATING MATCHED USERS ARRAY OF TARGET USER
  batch.update(targetMatchDataRef, {
    matchedUsers: admin.firestore.FieldValue.arrayUnion(
      ...uidRefs.map((uidref) => uidref.uid)
    ),
  });

  // UPDATING MATCHED USERS AND LIKED USERS ARRAYS OF EACH NEW MATCH
  uidRefs.forEach((obj) => {
    batch.update(obj.ref, {
      matchedUsers: admin.firestore.FieldValue.arrayUnion(targetuid),
    });
    batch.update(obj.ref, {
      likedUsers: admin.firestore.FieldValue.arrayRemove(targetuid),
    });
  });
}

function handleNotMatchUsers(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
  notMatchedYesUsers: string[],
  notMatchedSuperUsers: string[]
) {
  if (!batch || !targetMatchDataRef || !notMatchedYesUsers || !notMatchedSuperUsers)
    throw new functions.https.HttpsError(
      "internal",
      "Missing parameter in handleNoMatchUsers"
    );

  // UPDATING LIKED USERS ARRAY OF TARGET USER
  if (notMatchedYesUsers.length > 0) {
    batch.update(targetMatchDataRef, {
      likedUsers: admin.firestore.FieldValue.arrayUnion(...notMatchedYesUsers),
    });
  }
  if (notMatchedSuperUsers.length > 0) {
    batch.update(targetMatchDataRef, {
      superLikedUsers: admin.firestore.FieldValue.arrayUnion(...notMatchedSuperUsers),
    });
  }
}

type profileSnapshot = FirebaseFirestore.DocumentSnapshot<profileFromDatabase>;

async function createChatDocuments(targetuid: string, matcheduids: string[]) {
  if (!targetuid || !matcheduids || matcheduids.length < 1)
    functions.logger.warn("Missing parameter in createChatDocuments");

  let targetUserProfile: profileSnapshot | undefined;
  let matchedUsersProfile: profileSnapshot[] = [];

  const targetUserProfileCall = admin
    .firestore()
    .collection("profiles")
    .doc(targetuid)
    .get();
  const matchedUsersProfileCall = matcheduids.map(async (uid) => {
    return await admin.firestore().collection("profiles").doc(uid).get();
  });

  await Promise.all([targetUserProfileCall, ...matchedUsersProfileCall]).then(
    (snapshots) => {
      targetUserProfile = snapshots[0] as profileSnapshot;
      matchedUsersProfile = snapshots.slice(1) as profileSnapshot[];
    }
  );

  await Promise.all(
    matchedUsersProfile.map(async (matchedUserProfile) => {
      if (!matchedUserProfile.exists)
        return functions.logger.warn(
          `The following user does not have a profile doc:${matchedUserProfile.id}`
        );

      // Had to do this check inside arrow function otherwise typescript shouts because it doesn't
      // detect I checked outside of the arrow function's scope
      if (
        !targetUserProfile ||
        !targetUserProfile.exists ||
        !matchedUserProfile ||
        !matchedUserProfile.exists
      )
        return;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const targetUserData = targetUserProfile.data() as profileFromDatabase;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const matchedUserData = matchedUserProfile.data() as profileFromDatabase;

      const uids = sortUIDs([targetUserProfile.id, matchedUserProfile?.id]);
      const userSnippets: userSnippet[] = [
        {
          uid: targetUserProfile.id,
          name: targetUserData.displayName,
          picture: targetUserData.pictures[0] || "",
        },
        {
          uid: matchedUserProfile.id,
          name: matchedUserData.displayName,
          picture: matchedUserData.pictures[0] || "",
        },
      ];
      const messages: [] = [];
      const lastInteracted = admin.firestore.Timestamp.fromDate(new Date());
      const batchVolume = 0;

      const chat: chatFromDatabase = {
        uids,
        userSnippets,
        messages,
        batchVolume,
        lastInteracted,
      };

      await admin.firestore().collection("chats").add(chat);
    })
  );
}

function sortUIDs(uids: string[]): string[] {
  return uids.sort((a, b) => ("" + a).localeCompare(b));
}
