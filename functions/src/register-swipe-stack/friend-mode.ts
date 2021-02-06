import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  mdFromDatabase,
  profileFromDatabase,
  userSnippet,
  chatFromDatabase,
  mdFriendPickingFromDatabase,
} from "../../../src/app/shared/interfaces/index";
import { sortUIDs } from "./main";
interface uidDocRefMap {
  uid: string;
  mainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>;
  friendRef: FirebaseFirestore.DocumentReference<mdFriendPickingFromDatabase>;
}

export async function handleFriendYesChoices(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  currentUserID: string,
  yesuids: string[]
) {
  if (!currentUserID || !yesuids || !batch || !targetMatchDataRef)
    throw new functions.https.HttpsError(
      "invalid-argument",
      "handleYesFriendChoices could not be executed due to missing / invalid arguments."
    );

  const notMatchedYesUsers: string[] = [];
  const matchedUsers: uidDocRefMap[] = [];

  try {
    await Promise.all(
      yesuids.map(async (uid) => {
        const matchDataFriendDoc = (await admin
          .firestore()
          .collection("matchData")
          .doc(uid)
          .collection("pickingData")
          .doc("friend")
          .get()) as FirebaseFirestore.DocumentSnapshot<mdFriendPickingFromDatabase>;
        const matchDataMainRef = admin
          .firestore()
          .collection("matchData")
          .doc(uid) as FirebaseFirestore.DocumentReference<mdFromDatabase>;
        if (!matchDataFriendDoc.exists)
          return functions.logger.warn("matchData doc doesn't exist for", uid);

        if (!matchDataFriendDoc.exists) return;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const matchData = matchDataFriendDoc.data() as mdFriendPickingFromDatabase;

        // If targetID is in user's liked, then add to match otherwise add to like
        if (matchData.fLikedUsers[currentUserID]?.exists) {
          matchedUsers.push({
            uid,
            mainRef: matchDataMainRef,
            friendRef: matchDataFriendDoc.ref,
          });
        } else {
          notMatchedYesUsers.push(uid);
        }
      })
    );

    handleFriendNotMatchUsers(batch, targetMatchDataRef, notMatchedYesUsers);

    handleFriendMatchUsers(batch, targetMatchDataRef, currentUserID, matchedUsers);

    return matchedUsers.map((map) => map.uid);
  } catch (e) {
    throw new functions.https.HttpsError(
      "internal",
      `Could not handle yes choices of ${currentUserID}: ${e}`
    );
  }
}

function handleFriendMatchUsers(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  targetuid: string,
  uidRefs: uidDocRefMap[]
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
    fmatchedUsers: admin.firestore.FieldValue.arrayUnion(
      ...uidRefs.map((uidref) => uidref.uid)
    ),
  });

  // UPDATING MATCHED USERS AND LIKED USERS ARRAYS OF EACH NEW MATCH
  uidRefs.forEach((obj) => {
    batch.update(obj.mainRef, {
      fmatchedUsers: admin.firestore.FieldValue.arrayUnion(targetuid),
    });
    batch.update(obj.friendRef, {
      fLikedUsers: admin.firestore.FieldValue.arrayRemove(targetuid),
    });
  });
}

function handleFriendNotMatchUsers(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
  notMatchedYesUsers: string[]
) {
  if (!batch || !targetMatchDataRef || !notMatchedYesUsers)
    throw new functions.https.HttpsError(
      "internal",
      "Missing parameter in handleNoMatchUsers"
    );

  // UPDATING LIKED USERS ARRAY OF TARGET USER
  if (notMatchedYesUsers.length > 0) {
    batch.update(targetMatchDataRef, {
      fLikedUsers: admin.firestore.FieldValue.arrayUnion(...notMatchedYesUsers),
    });
  }
}

type profileSnapshot = FirebaseFirestore.DocumentSnapshot<profileFromDatabase>;

export async function createFriendChatDocuments(
  targetuid: string,
  matcheduids: string[]
) {
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
