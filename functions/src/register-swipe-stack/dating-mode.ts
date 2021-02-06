import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  mdFromDatabase,
  profileFromDatabase,
  userSnippet,
  chatFromDatabase,
  mdDatingPickingFromDatabase,
} from "../../../src/app/shared/interfaces/index";
import { sortUIDs } from "./main";
interface uidDocRefMap {
  uid: string;
  mainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>;
  datingRef: FirebaseFirestore.DocumentReference<mdDatingPickingFromDatabase>;
}

export async function handleDatingYesChoices(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataMainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  currentUserID: string,
  yesuids: string[],
  superuids: string[]
) {
  if (!currentUserID || !yesuids || !superuids || !batch || !targetMatchDataMainRef)
    throw new functions.https.HttpsError(
      "invalid-argument",
      "handleNoChoices could not be executed due to missing / invalid arguments."
    );

  const notMatchedYesUsers: string[] = [];
  const notMatchedSuperUsers: string[] = [];
  const matchedUsers: uidDocRefMap[] = [];

  const alluids: string[] = yesuids.concat(superuids);

  try {
    await Promise.all(
      alluids.map(async (uid) => {
        const matchDataDatingDoc = (await admin
          .firestore()
          .collection("matchData")
          .doc(uid)
          .collection("pickingData")
          .doc("dating")
          .get()) as FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>;
        const matchDataMainRef = admin
          .firestore()
          .collection("matchData")
          .doc(uid) as FirebaseFirestore.DocumentReference<mdFromDatabase>;
        if (!matchDataDatingDoc.exists)
          return functions.logger.warn("matchData doc doesn't exist for", uid);

        if (!matchDataDatingDoc.exists) return;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const matchData = matchDataDatingDoc.data() as mdDatingPickingFromDatabase;

        // Check whether targetID is in user's liked or superliked array
        const isLiked =
          matchData.likedUsers[currentUserID]?.exists ||
          matchData.superLikedUsers[currentUserID]?.exists;

        // If targetID is, then add to match otherwise add to like or super
        if (isLiked) {
          matchedUsers.push({
            uid,
            datingRef: matchDataDatingDoc.ref,
            mainRef: matchDataMainRef,
          });
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

    handleDatingNotMatchUsers(
      batch,
      targetMatchDataMainRef,
      notMatchedYesUsers,
      notMatchedSuperUsers
    );

    handleDatingMatchUsers(batch, targetMatchDataMainRef, currentUserID, matchedUsers);

    return matchedUsers.map((map) => map.uid);
  } catch (e) {
    throw new functions.https.HttpsError(
      "internal",
      `Could not handle yes choices of ${currentUserID}: ${e}`
    );
  }
}

function handleDatingMatchUsers(
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
    matchedUsers: admin.firestore.FieldValue.arrayUnion(
      ...uidRefs.map((uidref) => uidref.uid)
    ),
  });

  // UPDATING MATCHED USERS AND LIKED USERS ARRAYS OF EACH NEW MATCH
  uidRefs.forEach((obj) => {
    batch.update(obj.mainRef, {
      matchedUsers: admin.firestore.FieldValue.arrayUnion(targetuid),
    });
    batch.update(obj.datingRef, {
      likedUsers: admin.firestore.FieldValue.arrayRemove(targetuid),
    });
  });
}

function handleDatingNotMatchUsers(
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

export async function createDatingChatDocuments(
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
