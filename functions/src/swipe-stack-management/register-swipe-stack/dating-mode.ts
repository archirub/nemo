import * as admin from "firebase-admin";
import {
  mdFromDatabase,
  profileFromDatabase,
  userSnippet,
  chatFromDatabase,
  mdDatingPickingFromDatabase,
  dateMap,
} from "../../../../src/app/shared/interfaces/index";
import { sortUIDs } from "./main";
import { inexistentDocumentError } from "../../supporting-functions/error-handling/generic-errors";
export interface uidDocRefMapDating {
  uid: string;
  dateMap: dateMap;
  mainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>;
  datingRef: FirebaseFirestore.DocumentReference<mdDatingPickingFromDatabase>;
}

export async function handleDatingYesChoicesREAD(
  transaction: FirebaseFirestore.Transaction,
  currentUserID: string,
  yesuids: string[],
  superuids: string[],
  date: admin.firestore.Timestamp
): Promise<{
  notMatchedYesUsers: uidDocRefMapDating[];
  notMatchedSuperUsers: uidDocRefMapDating[];
  matchedUsers: uidDocRefMapDating[];
}> {
  const notMatchedYesUsers: uidDocRefMapDating[] = [];
  const notMatchedSuperUsers: uidDocRefMapDating[] = [];
  const matchedUsers: uidDocRefMapDating[] = [];

  const alluids: string[] = yesuids.concat(superuids);

  await Promise.all(
    alluids.map(async (uid) => {
      const matchDataDatingDoc = (await transaction.get(
        admin
          .firestore()
          .collection("matchData")
          .doc(uid)
          .collection("pickingData")
          .doc("dating")
      )) as FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>;
      const matchDataMainRef = admin
        .firestore()
        .collection("matchData")
        .doc(uid) as FirebaseFirestore.DocumentReference<mdFromDatabase>;

      if (!matchDataDatingDoc.exists)
        inexistentDocumentError("matchDataDating", matchDataDatingDoc.id, currentUserID);

      const matchData = matchDataDatingDoc.data() as mdDatingPickingFromDatabase;

      const uidRefMap: uidDocRefMapDating = {
        uid,
        dateMap: {
          exists: true,
          date: date as any,
        },
        datingRef: matchDataDatingDoc.ref,
        mainRef: matchDataMainRef,
      };

      // Check whether targetID is in user's liked or superliked array
      const isLiked =
        matchData.likedUsers[currentUserID]?.exists ||
        matchData.superLikedUsers[currentUserID]?.exists;

      // If targetID is, then add to match otherwise add to like or super
      if (isLiked) {
        matchedUsers.push(uidRefMap);
      } else {
        // If other's ID was from normal likes, add them there, otherwise add to super
        if (superuids.indexOf(uid) === -1) {
          notMatchedYesUsers.push(uidRefMap);
        } else {
          notMatchedSuperUsers.push(uidRefMap);
        }
      }
    })
  );

  return {
    notMatchedYesUsers,
    notMatchedSuperUsers,
    matchedUsers,
  };
}

export function handleDatingYesChoicesWRITE(
  transaction: FirebaseFirestore.Transaction,
  targetMatchDataMainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  targetMatchDataDatingRef: FirebaseFirestore.DocumentReference<mdDatingPickingFromDatabase>,
  currentUserID: string,
  notMatchedYesUsers: uidDocRefMapDating[],
  notMatchedSuperUsers: uidDocRefMapDating[],
  matchedUsers: uidDocRefMapDating[]
) {
  handleDatingNotMatchUsers(
    transaction,
    targetMatchDataDatingRef,
    notMatchedYesUsers,
    notMatchedSuperUsers
  );

  handleDatingMatchUsers(
    transaction,
    targetMatchDataMainRef,
    currentUserID,
    matchedUsers
  );
}

function handleDatingMatchUsers(
  transaction: FirebaseFirestore.Transaction,
  targetMatchDataMainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  targetuid: string,
  uidRefs: uidDocRefMapDating[]
) {
  uidRefs.forEach((uidref) => {
    // UPDATING MATCHEDUSERS FIELD OF TARGET USER
    transaction.update(targetMatchDataMainRef, {
      [`matchedUsers.${uidref.uid}`]: uidref.dateMap,
    });

    // UPDATING MATCHEDUSERS AND LIKEDUSERS FIELDS OF EACH NEW MATCH
    // Here we use the datemap of the other user but it works just as well
    transaction.update(uidref.mainRef, {
      [`matchedUsers.${targetuid}`]: uidref.dateMap,
    });
    transaction.update(uidref.datingRef, {
      [`likedUsers.${targetuid}`]: FirebaseFirestore.FieldValue.delete(),
    });
  });
}

function handleDatingNotMatchUsers(
  transaction: FirebaseFirestore.Transaction,
  targetMatchDataDatingRef: FirebaseFirestore.DocumentReference<mdDatingPickingFromDatabase>,
  notMatchedYesUsers: uidDocRefMapDating[],
  notMatchedSuperUsers: uidDocRefMapDating[]
) {
  if (notMatchedYesUsers.length > 0) {
    notMatchedYesUsers.forEach((uidref) => {
      transaction.update(targetMatchDataDatingRef, {
        [`likedUsers.${uidref.uid}`]: uidref.dateMap,
      });
    });
  }

  if (notMatchedSuperUsers.length > 0) {
    notMatchedSuperUsers.forEach((uidref) => {
      transaction.update(targetMatchDataDatingRef, {
        [`superLikedUsers.${uidref.uid}`]: uidref.dateMap,
      });
    });
  }
}

export type profileSnapshot = FirebaseFirestore.DocumentSnapshot<profileFromDatabase>;

export async function createDatingChatDocumentsREAD(
  transaction: FirebaseFirestore.Transaction,
  targetuid: string,
  matcheduids: string[]
): Promise<{
  targetUserProfile: profileSnapshot;
  matchedUserProfiles: profileSnapshot[];
}> {
  const targetUserProfileCall = transaction.get(
    admin.firestore().collection("profiles").doc(targetuid)
  );
  const matchedUsersProfileCall = matcheduids.map(async (uid) => {
    return await transaction.get(admin.firestore().collection("profiles").doc(uid));
  });

  const snapshots = await Promise.all([
    targetUserProfileCall,
    ...matchedUsersProfileCall,
  ]);

  const targetUserProfile = snapshots[0] as profileSnapshot;

  snapshots.shift(); // to remove targetUserProfile from snapshots array
  const matchedUserProfiles = snapshots as profileSnapshot[];

  if (!targetUserProfile?.exists)
    inexistentDocumentError("profile", targetUserProfile.id, targetuid);

  return { targetUserProfile, matchedUserProfiles };
}

export function createDatingChatDocumentsWRITE(
  transaction: FirebaseFirestore.Transaction,
  targetUserProfile: profileSnapshot,
  matchedUserProfiles: profileSnapshot[]
) {
  matchedUserProfiles.map((matchedUserProfile) => {
    if (!matchedUserProfile.exists)
      inexistentDocumentError("profile", matchedUserProfile.id, targetUserProfile.id);

    const targetUserData = targetUserProfile.data() as profileFromDatabase;
    const matchedUserData = matchedUserProfile.data() as profileFromDatabase;

    const uids = sortUIDs([targetUserProfile.id, matchedUserProfile?.id]);
    // FIX, ADD RIGHT PICTURES LOGIC
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

    const newChatRef = admin.firestore().collection("chats").doc();

    transaction.set(newChatRef, chat);
  });
}
