import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  mdFromDatabase,
  profileFromDatabase,
  userSnippet,
  chatFromDatabase,
  mdFriendPickingFromDatabase,
  dateMap,
} from "../../../src/app/shared/interfaces/index";
import { sortUIDs } from "./main";
interface uidDocRefMap {
  uid: string;
  dateMap: dateMap;
  mainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>;
  friendRef: FirebaseFirestore.DocumentReference<mdFriendPickingFromDatabase>;
}

export async function handleFriendYesChoices(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  currentUserID: string,
  yesuids: string[],
  date: admin.firestore.Timestamp
) {
  if (!currentUserID || !yesuids || !batch || !targetMatchDataRef)
    throw new functions.https.HttpsError(
      "invalid-argument",
      "handleYesFriendChoices could not be executed due to missing / invalid arguments."
    );

  const targetMatchDataFriendRef = admin
    .firestore()
    .collection("matchData")
    .doc(currentUserID)
    .collection("pickingData")
    .doc("friend");

  const notMatchedYesUsers: uidDocRefMap[] = [];
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

        if (!matchDataFriendDoc.exists)
          return functions.logger.warn("matchData doc doesn't exist for", uid);

        const matchData = matchDataFriendDoc.data() as mdFriendPickingFromDatabase;

        const uidRefMap: uidDocRefMap = {
          uid,
          dateMap: {
            exists: true,
            date: date as any,
          },
          friendRef: matchDataFriendDoc.ref,
          mainRef: matchDataMainRef,
        };

        // If targetID is in user's liked, then add to match otherwise add to like
        if (matchData.fLikedUsers[currentUserID]?.exists) {
          matchedUsers.push(uidRefMap);
        } else {
          notMatchedYesUsers.push(uidRefMap);
        }
      })
    );

    handleFriendNotMatchUsers(batch, targetMatchDataFriendRef, notMatchedYesUsers);

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
  targetMatchDataMainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  targetuid: string,
  uidRefs: uidDocRefMap[]
) {
  uidRefs.forEach((uidref) => {
    // UPDATING MATCHEDUSERS FIELD OF TARGET USER
    batch.update(targetMatchDataMainRef, {
      [`fmatchedUsers.${uidref.uid}`]: uidref.dateMap,
    });

    // UPDATING MATCHEDUSERS AND LIKEDUSERS FIELDS OF EACH NEW MATCH
    // Here we use the datemap of the other user but it works just as well
    batch.update(uidref.mainRef, {
      [`fmatchedUsers.${targetuid}`]: uidref.dateMap,
    });
    batch.update(uidref.friendRef, {
      [`fLikedUsers.${targetuid}`]: FirebaseFirestore.FieldValue.delete(),
    });
  });
}

function handleFriendNotMatchUsers(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataFriendRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
  notMatchedYesUsers: uidDocRefMap[]
) {
  // UPDATING LIKED USERS ARRAY OF TARGET USER
  if (notMatchedYesUsers.length > 0) {
    notMatchedYesUsers.forEach((uidref) => {
      batch.update(targetMatchDataFriendRef, {
        [`fLikedUsers.${uidref.uid}`]: uidref.dateMap,
      });
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

      const targetUserData = targetUserProfile.data() as profileFromDatabase;
      const matchedUserData = matchedUserProfile.data() as profileFromDatabase;

      // PICTURE FIXING REQUIRED
      const uids = sortUIDs([targetUserProfile.id, matchedUserProfile?.id]);
      const userSnippets: userSnippet[] = [
        {
          uid: targetUserProfile.id,
          name: targetUserData.firstName,
        },
        {
          uid: matchedUserProfile.id,
          name: matchedUserData.firstName,
        },
      ];

      const chat: chatFromDatabase = {
        uids,
        userSnippets,
      };

      await admin.firestore().collection("chats").add(chat);
    })
  );
}
