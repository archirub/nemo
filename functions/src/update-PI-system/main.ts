import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  piStorage,
  SwipeUserInfo,
  uidDatingStorage,
} from "../../../src/app/shared/interfaces/index";

interface SwipeUserInfoMap {
  [uid: string]: SwipeUserInfo;
}

// FORMAT IS IN ALPHABETICAL ORDER: DEGREE GENDER SEXUALPREFERENCE
const demographicCombinations = [
  "undergrad_female_female",
  "undergrad_female_male",
  "undergrad_male_female",
  "undergrad_male_male",
  "postgrad_female_female",
  "postgrad_female_male",
  "postgrad_male_female",
  "postgrad_male_male",
] as const;

type demographicMap<T> = {
  [key in typeof demographicCombinations[number]]: T;
};

interface distributionParameters {
  mean: number | null;
  variance: number | null;
  occurences: number;
}

interface uid_score {
  uid: string;
  score: number;
}

export const updatePISystem = functions
  .region("europe-west2")
  .https.onCall(async (dataRequest, context) => {
    // functions.pubsub
    //   .schedule("every day 05:00")
    //   .onRun(async (context) => {
    // FETCHING UID AND PI STORAGE DOCUMENTS
    const [currentUidStorageDocs, piStorageDocs] = await Promise.all([
      admin.firestore().collection("uidDatingStorage").get() as Promise<
        FirebaseFirestore.QuerySnapshot<uidDatingStorage>
      >,
      admin.firestore().collection("piStorage").get() as Promise<
        FirebaseFirestore.QuerySnapshot<piStorage>
      >,
    ]);

    // MERGING UIDSTORAGE ARRAYS THAT HAVE SAME COMBINATION DEGREE/GENDER/SEXPREF
    const uidStorageArrays: Omit<uidDatingStorage, "volume">[] =
      concatSameDemographicDocs(currentUidStorageDocs.docs.map((doc) => doc.data()));

    // CALCULATE MEAN AND VARIANCE OF PI DISTRIBUTIONS
    // (removed those who don't want to show their profiles or that are not in dating mode)
    const distribParamMaps = initialiseDemographicMap<distributionParameters>({
      mean: null,
      variance: null,
      occurences: 0,
    });
    const swipeUserInfo: SwipeUserInfoMap[] = piStorageDocs.docs.map((doc) => {
      const data = doc.data() as SwipeUserInfoMap;
      delete data.uids;
      for (const uid_ in data) {
        // if user is in "dating" mode and shows their profile, then they are accounted for in the
        // mean and variance of the distribution, and left in the object, otherwise they are deleted from the object
        if (data[uid_].swipeMode === "dating" && data[uid_].showProfile === true) {
          updateDistributionParameters(distribParamMaps, data[uid_]);
        } else {
          delete data[uid_];
        }
      }
      return data;
    });

    // CALCULATE SCORES OF USERS & SUBSEQUENTLY ADD USERS TO RESPECTIVE DEMOGRAPHIC ARRAYS
    const newDemographicScoreMaps = initialiseDemographicMap<uid_score[]>([]);

    swipeUserInfo.forEach((swipeUserInfoMap) => {
      for (const uid in swipeUserInfoMap) {
        const info = swipeUserInfoMap[uid];

        const score = computeScore(info, distribParamMaps);
        addToDemographicArrays(uid, score, info, newDemographicScoreMaps);
      }
    });

    // ORDER ARRAYS IN ASCENDING ORDER OF SCORE, REGISTER NEW PERCENTILE, RESET LIKE/SEEN COUNTS
    const newUIDStorageArrays = initialiseDemographicMap<string[]>([]);
    for (const demographic in newDemographicScoreMaps) {
      const peopleCount =
        newDemographicScoreMaps[demographic as keyof demographicMap<any>].length;

      newUIDStorageArrays[demographic as keyof demographicMap<any>] =
        newDemographicScoreMaps[demographic as keyof demographicMap<any>]
          .sort((a, b) => a.score - b.score)
          .map((user, index) => {
            const i = swipeUserInfo.findIndex((map) => map.hasOwnProperty(user.uid));
            if (i !== -1) {
              swipeUserInfo[i][user.uid].percentile = (index + 1) / peopleCount;
              swipeUserInfo[i][user.uid].seenCount = 0;
              swipeUserInfo[i][user.uid].likeCount = 0;
            } else {
              functions.logger.warn(
                `User with id ${user.uid} was not found in the uidStorageDocuments`
              );
            }

            return user.uid;
          });
    }

    // FORMATS DEMOGRAPHIC ARRAYS TO DATABASE DOC FORMAT
    const newUidStorageDocuments: uidDatingStorage[] = toUidStorage(newUIDStorageArrays);

    // BATCH WRITE THE CHANGES FOR UIDSTORAGE AND PISTORAGE
    if (!Array.isArray(newUidStorageDocuments) || newUidStorageDocuments.length < 1)
      return functions.logger.warn(
        "Anomality concerning number of new uidStorageDocuments, the PI system update was aborted."
      );
    const batch = admin.firestore().batch();
    currentUidStorageDocs.docs.forEach((doc) => batch.delete(doc.ref));
    newUidStorageDocuments.forEach((doc) => {
      batch.set(admin.firestore().collection("uidDatingStorage").doc(), doc);
    });
    swipeUserInfo.forEach((swipeUserInfoMap) => {
      for (const uid in swipeUserInfoMap) {
        // find which doc that uid is in
        const i = piStorageDocs.docs.findIndex((doc) => doc.data().hasOwnProperty(uid));
        // update the property of that doc
        if (i !== -1) {
          batch.update(piStorageDocs.docs[i].ref, {
            [`${uid}`]: swipeUserInfoMap[uid],
          });
        }
      }
    });

    await batch.commit();
  });

/**
 * Converts arrays that are separated per degree/gender/sexPref combination into format
 * to be sent to the database directly
 * @param uidStorageArrays unformatted uid arrays
 */
function toUidStorage(uidStorageArrays: demographicMap<string[]>): uidDatingStorage[] {
  const uidStorageDocuments: uidDatingStorage[] = [];

  // iterate through each combination to both get the demographicName from demographicCombineString
  // to access the right uid array, and get the name of the demographics
  (["undergrad", "postgrad"] as const).forEach((degree) => {
    (["male", "female"] as const).forEach((gender) => {
      (["male", "female"] as const).forEach((sexualPreference) => {
        const MAX_UIDS_PER_DOC = 50000;

        const demographicName = demographicCombineString(
          degree,
          gender,
          sexualPreference
        );
        const uidCount = uidStorageArrays[demographicName].length;

        // Calculates # of documents required to create for that demographic
        const docsRequired = Math.ceil(uidCount / MAX_UIDS_PER_DOC);

        // Creates the documents required and appends them
        Array.from({ length: docsRequired }).forEach((v, i) => {
          const uids: string[] = uidStorageArrays[demographicName].slice(
            i * MAX_UIDS_PER_DOC,
            (i + 1) * MAX_UIDS_PER_DOC
          );

          const uidStorageData: uidDatingStorage = {
            volume: i,
            sexualPreference,
            gender,
            degree,
            uids,
          };

          uidStorageDocuments.push(uidStorageData);
        });
      });
    });
  });

  return uidStorageDocuments;
}

/**
 * Creates a demographic map that has "c" for all of its properties
 * @param c content of each property
 */
function initialiseDemographicMap<T>(c: T): demographicMap<T> {
  return {
    undergrad_female_female: JSON.parse(JSON.stringify(c)),
    undergrad_female_male: JSON.parse(JSON.stringify(c)),
    undergrad_male_female: JSON.parse(JSON.stringify(c)),
    undergrad_male_male: JSON.parse(JSON.stringify(c)),
    postgrad_female_female: JSON.parse(JSON.stringify(c)),
    postgrad_female_male: JSON.parse(JSON.stringify(c)),
    postgrad_male_female: JSON.parse(JSON.stringify(c)),
    postgrad_male_male: JSON.parse(JSON.stringify(c)),
  };
}

/**
 * Concats together arrays that have the same combination degree / gender / sexual preference
 * @param uidStorageArrays The current arrays that may contain multiple arrays of same demographic combination
 */
function concatSameDemographicDocs(
  uidStorageArrays: uidDatingStorage[]
): Omit<uidDatingStorage, "volume">[] {
  const concatenatedUidDocs: Omit<uidDatingStorage, "volume">[] = [];

  for (const degree of ["undergrad", "postgrad"] as const) {
    for (const gender of ["male", "female"] as const) {
      for (const sexualPreference of ["male", "female"] as const) {
        const uidArray: string[] = ([] as any).concat.apply(
          [],
          uidStorageArrays
            .filter(
              (uidStorage) =>
                uidStorage.degree === degree &&
                uidStorage.sexualPreference === sexualPreference &&
                uidStorage.gender === gender
            )
            .sort((a, b) => a.volume - b.volume)
            .map((array) => array.uids)
        );

        concatenatedUidDocs.push({ uids: uidArray, sexualPreference, gender, degree });
      }
    }
  }
  return concatenatedUidDocs;
}

/**
 * Gives a new mean of a distribution provided a new datapoint
 * @param oldMean the current mean
 * @param newData new datapoint
 * @param oldCount current number of datapoint (excluding new datapoint)
 */
function updateMean(oldMean: number, newData: number, oldCount: number): number {
  return ((oldMean + newData / oldCount) * oldCount) / (oldCount + 1);
}

/**
 * Gives a new variance of a distribution provided a new datapoint
 * @param oldVariance the current variance
 * @param oldMean the current mean
 * @param newData new datapoint
 * @param oldCount current number of datapoint (excluding new datapoint)
 */
function updateVariance(
  oldVariance: number,
  oldMean: number,
  newData: number,
  oldCount: number
): number {
  return (
    ((oldVariance + oldMean ** 2 + newData ** 2 / oldCount) * oldCount) / (oldCount + 1) -
    (((oldMean + newData / oldCount) * oldCount) / (oldCount + 1)) ** 2
  );
}

/**
 * Updates the distribution parameters (mean, variance, occurences) of that particular demographic
 * provided the PI of the person whose piStorageInfo belongs to
 * @param info information of that user from the database (from piStorage)
 * @param distributionParameters map of maps of distribution parameters for each demographic
 */
function updateDistributionParameters(
  distributionParameters: demographicMap<distributionParameters>,
  info: SwipeUserInfo
) {
  info.sexualPreference.forEach((sexualPreference) => {
    const degree = info.degree;
    let gender = info.gender;

    // if person's gender is other, then they need to be added to both "male" and "female" genders
    if (gender === "other") {
      gender = "male";
      const piStorageInfoCopy = { ...info };
      piStorageInfoCopy.gender = "female";
      updateDistributionParameters(distributionParameters, piStorageInfoCopy);
    }

    const likeCount: number = info.likeCount;
    const seenCount: number = info.seenCount;
    const PI = computePI(likeCount, seenCount);
    if (PI == null) return;

    const demographicPropName: keyof demographicMap<distributionParameters> =
      demographicCombineString(degree, gender, sexualPreference);

    // CASE WHERE MEAN/VARIANCE HAVEN'T BEEN INITIALIZED YET
    if (
      distributionParameters[demographicPropName].mean == null ||
      distributionParameters[demographicPropName].variance == null ||
      distributionParameters[demographicPropName].occurences === 0
    ) {
      distributionParameters[demographicPropName] = {
        mean: PI,
        variance: 0,
        occurences: 1,
      };
      return;
    }

    const currentMean: number = distributionParameters[demographicPropName]
      .mean as number;
    const currentVariance: number = distributionParameters[demographicPropName]
      .variance as number;
    const currentOccurences: number =
      distributionParameters[demographicPropName].occurences;

    const newMean: number = updateMean(currentMean, PI, currentOccurences);
    const newVariance: number = updateVariance(
      currentVariance,
      currentMean,
      PI,
      currentOccurences
    );

    distributionParameters[demographicPropName] = {
      mean: newMean,
      variance: newVariance,
      occurences: currentOccurences + 1,
    };
  });
}

/**
 * Spits out the percentile change from the PI of the person so that a new score
 * may be calulcated by adding that change to their current percentile.
 * @param PI popularity index (ratio # of like / # of seen)
 * @param seenCount the # of times they have been seen by users (i.e. # of trials on which PI is based)
 * @param mean mean of popularity index of that person's demographic
 * @param variance variance of popularity index of that person's demographic
 */
function computePercentileChange(
  PI: number,
  seenCount: number,
  mean: number,
  variance: number
): number {
  const SDFromMean = (PI - mean) / Math.sqrt(variance);

  // we (sort of arbitrarily set) percentile change is 0.2 at 3 SD from mean
  // for one who has been seen 100 times!
  const percentileChange = (SDFromMean / 3) * 0.2;

  // Assuming that we consider that we need at least 100 people seeing the profile
  // to give full relevance to the percentileChange
  const seenCountWeight = Math.abs(Math.min(1, seenCount / 100));

  return percentileChange * seenCountWeight;
}

/** Takes in a degree, gender and sexual preference and returns a string that represents
the combination of the 3 (concatenated in alphabetic order)
*/
function demographicCombineString(
  degree: "undergrad" | "postgrad",
  gender: "male" | "female",
  sexualPreference: "male" | "female"
): keyof demographicMap<distributionParameters> {
  const a =
    `${degree}_${gender}_${sexualPreference}` as keyof demographicMap<distributionParameters>;
  return a;
}

function computePI(likeCount: number, seenCount: number): number | null {
  let PI: null | number = null;
  if (seenCount > 0 && likeCount >= 0) {
    PI = likeCount / seenCount;
  }
  return PI;
}

/**
 * Computes the score of that person, that is, percentile + percentileChange
 * @param info information of that user from the database (from piStorage)
 * @param distributionParameters map of maps of distribution parameters for each demographic
 */
function computeScore(
  info: SwipeUserInfo,
  distributionParameters: demographicMap<distributionParameters>
): number {
  const means: number[] = [];
  const variances: number[] = [];
  // taking average mean and variance in case where person has multiple sexual preferences
  // and/or gender is "other"
  info.sexualPreference.forEach((sexualPreference) => {
    if (info.gender === "other") {
      (["male", "female"] as const).forEach((g) => {
        const demoString = demographicCombineString(info.degree, g, sexualPreference);

        const mean_ = distributionParameters[demoString].mean;
        const var_ = distributionParameters[demoString].variance;

        if (mean_ != null) means.push(mean_);
        if (var_ != null) variances.push(var_);
      });
    } else {
      const demographicString = demographicCombineString(
        info.degree,
        info.gender,
        sexualPreference
      );

      const mean_ = distributionParameters[demographicString].mean;
      const var_ = distributionParameters[demographicString].variance;

      if (mean_ != null) means.push(mean_);
      if (var_ != null) variances.push(var_);
    }
  });

  const meanPI = means.reduce((a, b) => a + b, 0) / means.length;
  const variancePI = variances.reduce((a, b) => a + b, 0) / variances.length;

  const percentile = info.percentile == null ? 0.5 : (info.percentile as number);
  const PI = computePI(info.likeCount, info.seenCount);

  let percentileChange: number;
  if (PI == null || meanPI == null || variancePI == null) {
    percentileChange = 0;
  } else {
    percentileChange = computePercentileChange(PI, info.seenCount, meanPI, variancePI);
  }

  return percentile + percentileChange;
}

/**
 * Adds the user's uid and score (as a map {uid score}) to the right demographic arrays
 * @param uid uid of user
 * @param score score of user (percentile + percentileChange)
 * @param info info object coming directly from user's piStorage doc
 * @param newDemographicArrays map with as many properties as demographic combinations
 */
function addToDemographicArrays(
  uid: string,
  score: number,
  info: SwipeUserInfo,
  newDemographicScoreMaps: demographicMap<uid_score[]>
) {
  let demographicString: keyof demographicMap<distributionParameters>;

  // Iterate over sexualPreference (since it's an array and you want to cover all of its options)
  info.sexualPreference.forEach((sexPref) => {
    // if person has gender "other", then add that person to both gender demographic
    if (info.gender === "other") {
      demographicString = demographicCombineString(info.degree, "male", sexPref);
      newDemographicScoreMaps[demographicString].push({ uid, score });

      demographicString = demographicCombineString(info.degree, "female", sexPref);
      newDemographicScoreMaps[demographicString].push({ uid, score });
    } else if (info.gender === "female" || info.gender === "male") {
      demographicString = demographicCombineString(info.degree, info.gender, sexPref);
      newDemographicScoreMaps[demographicString].push({ uid, score });
    }
  });
}
