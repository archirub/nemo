import { forkJoin, from, Observable } from "rxjs";
import { concatMap, map, switchMap } from "rxjs/operators";

export function Base64ToUrl(base64Data: string): Observable<string> {
  // return URL.createObjectURL(base64toBlob(base64Data));

  // THIS BELOW WORKS BUT IT MIGHT DEFEAT THE WHOLE PURPOSE OF STORING IT AS IT USES
  // THE FETCH API. THough no actually it's fine because it deson't fetch it from Firebase
  // so we aren't paying any more money for that so everything is chill
  return from(fetch(base64Data)).pipe(
    concatMap((res) => res.blob()),
    map((blob) => URL.createObjectURL(blob))
  );
}

export function urlToBase64(downloadURL: string): Observable<string> {
  return urlToBlob(downloadURL).pipe(concatMap((blob) => blobToBase64(blob)));
}

export function urlToBlob(url: string): Observable<Blob> {
  return from(fetch(url)).pipe(switchMap((response) => from(response.blob())));
}

export function blobToBase64(blob: Blob): Observable<string> {
  const fileReader = new FileReader();
  const observable: Observable<string> = new Observable((observer) => {
    fileReader.onloadend = () => {
      observer.next(fileReader.result as string);
      observer.complete();
    };
  });
  fileReader.readAsDataURL(blob);
  return observable;
}

export function base64toBlob(
  b64Data: string,
  contentType: string = "",
  sliceSize: number = 512
): Blob {
  console.log("aaadsasd", b64Data.replace("data:image/jpeg;base64,/9j/", ""));
  const byteCharacters = atob(b64Data.replace("data:image/jpeg;base64,/9j/", ""));
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
}
