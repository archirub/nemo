import { https } from "firebase-functions";

// used when a cloud function requires data from a given document but that the latter doesn't exist
export function inexistentDocumentError(
  document: string,
  docid: string,
  calleruid: string
) {
  throw new https.HttpsError(
    "internal",
    `Inexistent ${document} document.
    doc id: ${docid}, 
    caller uid: ${calleruid}. 
    `
  );
}

// used when a cloud function requires data from a given document but that the data is invalid or non existent
export function invalidDocumentError(
  document: string,
  invalidData: string,
  docid: string,
  calleruid: string,
  additionalMessage?: string
) {
  throw new https.HttpsError(
    "internal",
    `${invalidData} is invalid or inexistent in ${document} document. 
    doc id: ${docid}, 
    caller uid: ${calleruid}. 
    ${additionalMessage}`
  );
}

// used specifically when the document itself which was requested wasn't found
export function notFoundDocumentError(
  document: string,
  docid: string,
  calleruid: string
) {
  throw new https.HttpsError(
    "not-found",
    `The ${document} document requested doesn't exist.    
    doc id: ${docid}, 
    caller uid: ${calleruid}. `
  );
}

// calleruid === uid of the person calling the function
export function emptyCollectionError(collection: string, calleruid: string) {
  throw new https.HttpsError(
    "internal",
    `The collection ${collection} is empty 
    (or if not the collection query returned empty.)`
  );
}
