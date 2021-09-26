import {
  searchFeatureNames,
  UniversityName,
  generateSwipeStackRequest,
  getMatchDataUserInfoRequest,
  getPickingDataUserInfoRequest,
  registerSwipeChoicesRequest,
  changeShowProfileRequest,
  addOrRemoveReportedRequest,
  updateSearchFeaturesRequest,
  updateGenderSexPrefRequest,
  createAccountRequest,
  profileEditingByUserRequest,
  deleteAccountRequest,
  checkEmailValidityRequest,
  searchCriteriaOptions,
} from "./../../../../src/app/shared/interfaces/index";

import {
  isBoolean,
  isAreaOfStudy,
  isDateOfBirth,
  isGender,
  isInterests,
  isNull,
  isNumber,
  isObject,
  isQuestions,
  isSexualPreference,
  isSocialMediaLinks,
  isSocietyCategory,
  isString,
  isUniversity,
  isDegree,
  isSwipeChoice,
  isInterest,
} from "./property-validators";

import { https } from "firebase-functions";

type CloudFunctionRequest =
  | generateSwipeStackRequest
  | getMatchDataUserInfoRequest
  | getPickingDataUserInfoRequest
  | registerSwipeChoicesRequest
  | changeShowProfileRequest
  | addOrRemoveReportedRequest
  | updateSearchFeaturesRequest
  | updateGenderSexPrefRequest
  | createAccountRequest
  | profileEditingByUserRequest
  | deleteAccountRequest
  | checkEmailValidityRequest;

type CloudFunctionName =
  | "checkEmailValidity"
  | "profileEditingByUser"
  | "createAccount"
  | "updateGenderSexPref"
  | "updateSearchFeatures"
  | "addOrRemoveReported"
  | "changeShowProfile"
  | "registerSwipeChoices"
  | "generateSwipeStack";

export function sanitizeData(
  cloudFunctionName: CloudFunctionName,
  cloudFunctionRequest: CloudFunctionRequest
): CloudFunctionRequest {
  let sanitizationResult: {
    isValid: boolean;
    sanitizedData?: CloudFunctionRequest;
  };

  switch (cloudFunctionName) {
    case "checkEmailValidity":
      sanitizationResult = sanitizeCheckEmailValidity(
        cloudFunctionRequest as checkEmailValidityRequest
      );
      break;
    case "profileEditingByUser":
      sanitizationResult = sanitizeProfileEditingByUser(
        cloudFunctionRequest as profileEditingByUserRequest
      );
      break;
    case "createAccount":
      sanitizationResult = sanitizeCreateAccount(
        cloudFunctionRequest as createAccountRequest
      );
      break;
    case "updateGenderSexPref":
      sanitizationResult = sanitizeUpdateGenderSexPref(
        cloudFunctionRequest as updateGenderSexPrefRequest
      );
      break;
    case "updateSearchFeatures":
      sanitizationResult = sanitizeUpdateSearchFeatures(
        cloudFunctionRequest as updateSearchFeaturesRequest
      );
      break;
    case "addOrRemoveReported":
      sanitizationResult = sanitizeAddOrRemoveReported(
        cloudFunctionRequest as addOrRemoveReportedRequest
      );
      break;
    case "changeShowProfile":
      sanitizationResult = sanitizeChangeShowProfile(
        cloudFunctionRequest as changeShowProfileRequest
      );
      break;
    case "registerSwipeChoices":
      sanitizationResult = sanitizeRegisterSwipeChoices(
        cloudFunctionRequest as registerSwipeChoicesRequest
      );
      break;
    case "generateSwipeStack":
      sanitizationResult = sanitizeGenerateSwipeStack(
        cloudFunctionRequest as generateSwipeStackRequest
      );
      break;
  }

  if (!sanitizationResult)
    throw new https.HttpsError("aborted", "Data sanitization error.");

  if (!sanitizationResult.isValid)
    throw new https.HttpsError("invalid-argument", "The request is invalid.");

  return sanitizationResult?.sanitizedData as CloudFunctionRequest;
}

function sanitizeCheckEmailValidity(request: checkEmailValidityRequest): {
  isValid: boolean;
  sanitizedData?: checkEmailValidityRequest;
} {
  if (typeof request?.email !== "string") return { isValid: false };

  return { isValid: true, sanitizedData: { email: request.email } };
}

function sanitizeProfileEditingByUser(request: profileEditingByUserRequest): {
  isValid: boolean;
  sanitizedData?: profileEditingByUserRequest;
} {
  if (!isObject(request?.data)) return { isValid: false };

  if (!isNull(request.data?.areaOfStudy) && !isAreaOfStudy(request.data?.areaOfStudy))
    return { isValid: false };
  if (!isNull(request.data?.biography) && !isString(request.data?.biography))
    return { isValid: false };
  if (!isNull(request.data?.course) && !isString(request.data?.course))
    return { isValid: false };
  if (!isNull(request.data?.interests) && !isInterests(request.data?.interests))
    return { isValid: false };
  if (!isNull(request.data?.questions) && !isQuestions(request.data?.questions))
    return { isValid: false };
  if (!isNull(request.data?.society) && !isString(request.data?.society))
    return { isValid: false };
  if (
    !isNull(request.data?.societyCategory) &&
    !isSocietyCategory(request.data?.societyCategory)
  )
    return { isValid: false };

  return {
    isValid: true,
    sanitizedData: {
      data: {
        areaOfStudy: request.data?.areaOfStudy,
        biography: request.data?.biography,
        course: request.data?.course,
        interests: request.data?.interests,
        questions: request.data?.questions,
        society: request.data?.society,
        societyCategory: request.data?.societyCategory,
      },
    },
  };
}

function sanitizeCreateAccount(request: createAccountRequest): {
  isValid: boolean;
  sanitizedData?: createAccountRequest;
} {
  // required properties
  if (!isString(request?.firstName)) return { isValid: false };
  if (!isDateOfBirth(request?.dateOfBirth)) return { isValid: false };
  if (!isUniversity(request?.university)) return { isValid: false };
  if (!isGender(request?.gender)) return { isValid: false };
  if (!isSexualPreference(request?.sexualPreference)) return { isValid: false };
  if (!isDegree(request?.degree)) return { isValid: false };

  // optional properties
  if (!isNull(request?.biography) && !isString(request?.biography))
    return { isValid: false };
  if (!isNull(request?.course) && !isString(request?.course)) return { isValid: false };
  if (!isNull(request?.society) && !isString(request?.society)) return { isValid: false };
  if (!isNull(request?.areaOfStudy) && !isAreaOfStudy(request?.areaOfStudy))
    return { isValid: false };
  if (!isNull(request?.societyCategory) && !isSocietyCategory(request?.societyCategory))
    return { isValid: false };
  if (!isNull(request?.interests) && !isInterests(request?.interests))
    return { isValid: false };
  if (!isNull(request?.questions) && !isQuestions(request?.questions))
    return { isValid: false };
  if (
    !isNull(request?.socialMediaLinks) &&
    !isSocialMediaLinks(request?.socialMediaLinks)
  )
    return { isValid: false };

  return {
    isValid: true,
    sanitizedData: {
      areaOfStudy: request?.areaOfStudy,
      biography: request?.biography,
      course: request?.course,
      dateOfBirth: request?.dateOfBirth,
      degree: request?.degree,
      firstName: request?.firstName,
      gender: request?.gender,
      interests: request?.interests,
      questions: request?.questions,
      sexualPreference: request?.sexualPreference,
      socialMediaLinks: request?.socialMediaLinks,
      society: request?.society,
      societyCategory: request?.societyCategory,
      university: request?.university,
    },
  };
}

function sanitizeUpdateGenderSexPref(request: updateGenderSexPrefRequest): {
  isValid: boolean;
  sanitizedData?: updateGenderSexPrefRequest;
} {
  if (!["gender", "sexualPreference"].includes(request?.name)) return { isValid: false };

  if (request?.name === "gender" && !isGender(request?.value)) return { isValid: false };
  if (request?.name === "sexualPreference" && !isSexualPreference(request?.value))
    return { isValid: false };

  return {
    isValid: true,
    sanitizedData: {
      name: request?.name,
      value: request?.value,
    },
  };
}

function sanitizeUpdateSearchFeatures(request: updateSearchFeaturesRequest): {
  isValid: boolean;
  sanitizedData?: updateSearchFeaturesRequest;
} {
  if (!Array.isArray(request?.features)) return { isValid: false };
  if (request?.features.length === 0) return { isValid: false };

  let valid = true;

  request?.features.forEach((f) => {
    if (!searchFeatureNames.includes(f?.name)) valid = false;
    switch (f?.name) {
      case "areaOfStudy":
        if (!isAreaOfStudy(f.value)) valid = false;
        break;

      case "degree":
        if (!isDegree(f.value)) valid = false;

        break;

      case "interests":
        if (!isInterests(f.value)) valid = false;

        break;

      case "societyCategory":
        if (!isSocietyCategory(f.value)) valid = false;

        break;

      case "university":
        if (!isUniversity(f.value)) valid = false;

        break;
    }
  });

  if (!valid) return { isValid: false };

  const sanitizedData = {
    features: request?.features.map((f) => ({ name: f.name, value: f.value })),
  };

  return { isValid: true, sanitizedData };
}

function sanitizeAddOrRemoveReported(request: addOrRemoveReportedRequest): {
  isValid: boolean;
  sanitizedData?: addOrRemoveReportedRequest;
} {
  if (!["add", "remove"].includes(request?.action)) return { isValid: false };

  if (!isString(request?.reporteduid)) return { isValid: false };

  return {
    isValid: true,
    sanitizedData: { action: request?.action, reporteduid: request?.reporteduid },
  };
}

function sanitizeChangeShowProfile(request: changeShowProfileRequest): {
  isValid: boolean;
  sanitizedData?: changeShowProfileRequest;
} {
  if (!isBoolean(request?.showProfile)) return { isValid: false };

  return { isValid: true, sanitizedData: { showProfile: request?.showProfile } };
}

function sanitizeRegisterSwipeChoices(request: registerSwipeChoicesRequest): {
  isValid: boolean;
  sanitizedData?: registerSwipeChoicesRequest;
} {
  if (!Array.isArray(request.choices)) return { isValid: false };
  if (request.choices.length === 0) return { isValid: false };

  let valid = true;

  request?.choices.forEach((c) => {
    if (!isSwipeChoice(c?.choice)) valid = false;
  });

  if (!valid) return { isValid: false };

  const sanitizedData = {
    choices: request?.choices.map((c) => ({ choice: c.choice, uid: c.uid })),
  };

  return { isValid: true, sanitizedData };
}

function sanitizeGenerateSwipeStack(request: generateSwipeStackRequest): {
  isValid: boolean;
  sanitizedData?: generateSwipeStackRequest;
} {
  if (!isObject(request?.searchCriteria)) {
    return { isValid: false };
  }

  if (
    !isNull(request?.searchCriteria?.areaOfStudy) &&
    !isAreaOfStudy(request?.searchCriteria?.areaOfStudy)
  ) {
    return { isValid: false };
  }

  if (
    !isNull(request?.searchCriteria?.degree) &&
    !isDegree(request?.searchCriteria?.degree)
  ) {
    return { isValid: false };
  }

  if (
    !isNull(request?.searchCriteria?.interests) &&
    !isInterest(request?.searchCriteria?.interests)
  ) {
    return { isValid: false };
  }

  if (
    !isNull(request?.searchCriteria?.societyCategory) &&
    !isSocietyCategory(request?.searchCriteria?.societyCategory)
  ) {
    return { isValid: false };
  }

  if (
    !isNull(request?.searchCriteria?.university) &&
    !isUniversity(request?.searchCriteria?.university)
  ) {
    return { isValid: false };
  }

  return {
    isValid: true,
    sanitizedData: {
      searchCriteria: {
        areaOfStudy: request?.searchCriteria?.areaOfStudy,
        degree: request?.searchCriteria?.degree,
        interests: request?.searchCriteria?.interests,
        societyCategory: request?.searchCriteria?.societyCategory,
        university: request?.searchCriteria?.university,
      },
    },
  };
}
