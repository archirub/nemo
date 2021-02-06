import * as admin from "firebase-admin";
import {
  mdFriendPickingFromDatabase,
  mdFromDatabase,
  searchCriteriaFromDatabase,
  uidChoiceMap,
  uidFriendStorage,
} from "../../../src/app/shared/interfaces/index";
import { pickFromSCArray, randomWeightedPick } from "./picking";
import { PickingWeights } from "./main";
import { searchCriteriaGrouping } from "./search-criteria";

export async function friendMode(
  uid: string,
  matchDataMain: mdFromDatabase,
  searchCriteria: searchCriteriaFromDatabase,
  pickingWeights: PickingWeights,
  SCPickingVariance: number,
  numberOfPicks: number
): Promise<uidChoiceMap[]> {
  const numberOfLikePicks: number = Math.floor(numberOfPicks * 1.2);
  const numberOfNormalPicks: number = Math.floor(numberOfPicks * 2);
  const numberOfSCPicks: number = Math.floor(numberOfNormalPicks * 0.5);

  const likeGroupWeirdObject: { [uid: string]: uidChoiceMap } = {};
  (await fetchLikeGroup(uid, numberOfLikePicks)).forEach((uid_) => {
    likeGroupWeirdObject[uid_] = { uid: uid_, choice: "yes" };
  });

  const uidStorageDocuments = (
    await admin.firestore().collection("uidDatingStorage").get()
  ).docs.filter(
    (doc) => doc.exists
  ) as FirebaseFirestore.QueryDocumentSnapshot<uidFriendStorage>[];

  let normalGroupUsers: string[] = documentsToUIDArray(uidStorageDocuments);
  normalGroupUsers = randomFromUniform(normalGroupUsers, numberOfNormalPicks);

  normalGroupUsers = normalGroupUsers.filter(
    (pickedUid) =>
      !matchDataMain.reportedUsers[pickedUid]?.exists &&
      !matchDataMain.fdislikedUsers[pickedUid]?.exists &&
      !matchDataMain.fmatchedUsers[pickedUid]?.exists &&
      !likeGroupWeirdObject.hasOwnProperty(pickedUid)
  );
  const likeGroupUsers: uidChoiceMap[] = removeDuplicates(
    Object.entries(likeGroupWeirdObject).map((keyValue) => keyValue[1])
  );

  const matchDataFriendDocs: FirebaseFirestore.DocumentSnapshot<mdFriendPickingFromDatabase>[] = (
    await Promise.all(
      normalGroupUsers.map(async (uid_) => {
        return (await admin
          .firestore()
          .collection("matchData")
          .doc(uid_)
          .collection("pickingData")
          .doc("friend")
          .get()) as FirebaseFirestore.DocumentSnapshot<mdFriendPickingFromDatabase>;
      })
    )
  ).filter((doc) => doc.exists && !doc.data()?.reportedUsers[uid]?.exists);

  let SCGroupDocs = searchCriteriaGrouping(matchDataFriendDocs, searchCriteria);
  SCGroupDocs = pickFromSCArray(
    SCGroupDocs as FirebaseFirestore.DocumentSnapshot<mdFriendPickingFromDatabase>[],
    SCPickingVariance,
    numberOfSCPicks > SCGroupDocs.length ? SCGroupDocs.length : numberOfSCPicks
  ) as FirebaseFirestore.DocumentSnapshot<mdFriendPickingFromDatabase>[];

  const SCGroupUsers = removeDuplicates(
    friendPickingToMap(
      uid,
      SCGroupDocs as FirebaseFirestore.DocumentSnapshot<mdFriendPickingFromDatabase>[]
    )
  );

  // RETURN PICK
  const uidsPicked =
    randomWeightedPick(
      [SCGroupUsers, likeGroupUsers],
      [pickingWeights.searchCriteriaGroup, pickingWeights.likeGroup],
      numberOfPicks > SCGroupDocs.length + likeGroupUsers.length
        ? SCGroupDocs.length + likeGroupUsers.length
        : numberOfPicks
    ) || [];

  return uidsPicked;
}

async function fetchLikeGroup(uid: string, amount: number): Promise<string[]> {
  const likeGroupSnapshot = await admin
    .firestore()
    .collectionGroup("friend")
    .where("flikedUsers", "array-contains", uid)
    .limit(amount)
    .get();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return likeGroupSnapshot.docs
    .map((doc) => doc.ref.parent.parent?.id)
    .filter((id) => typeof id === "string") as string[];
}

function documentsToUIDArray(
  docs: FirebaseFirestore.QueryDocumentSnapshot<uidFriendStorage>[]
): string[] {
  const uids: string[] = [];

  for (const doc of docs) {
    uids.push(...doc.data().uids);
  }

  return uids;
}

function randomFromUniform(uids: string[], numberOfPicks: number): string[] {
  // eslint-disable-next-line no-param-reassign
  numberOfPicks = uids.length < numberOfPicks ? uids.length : numberOfPicks;
  const indexesPicked: { [index: number]: true } = {};

  function pickIndex(
    arrayLength: number,
    indexesAlreadyPicked: { [index: number]: true }
  ): number {
    const index: number = Math.floor(Math.random() * uids.length);
    if (
      indexesAlreadyPicked.hasOwnProperty(index) &&
      Object.keys(indexesAlreadyPicked).length < uids.length
    ) {
      return pickIndex(arrayLength, indexesAlreadyPicked);
    } else if (
      indexesAlreadyPicked.hasOwnProperty(index) &&
      Object.keys(indexesAlreadyPicked).length >= uids.length
    ) {
      return -1;
    }
    return index;
  }

  Array.from({ length: numberOfPicks }).forEach(() => {
    const index = pickIndex(uids.length, indexesPicked);

    if (index !== -1) {
      indexesPicked[index] = true;
    }
  });

  const uidsPicked: string[] = [];
  for (const i in indexesPicked) {
    uidsPicked.push(uids[i]);
  }

  return uidsPicked;
}

function friendPickingToMap(
  targetuid: string,
  matchDataDocs: FirebaseFirestore.DocumentSnapshot<mdFriendPickingFromDatabase>[]
): uidChoiceMap[] {
  if (!matchDataDocs || !targetuid) return [];
  return matchDataDocs.map((doc) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const data = doc.data() as mdFriendPickingFromDatabase;
    const choice = data.fLikedUsers[targetuid]?.exists ? "yes" : "no";

    return {
      uid: doc.ref.parent.parent?.id || "",
      choice,
    };
  });
}

function removeDuplicates(maps: uidChoiceMap[]): uidChoiceMap[] {
  return maps.filter(
    (map, index, self) => index === self.findIndex((t) => t.uid === map.uid)
  );
}
