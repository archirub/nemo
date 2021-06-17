import { Injectable } from "@angular/core";
import { AngularFireStorage } from "@angular/fire/storage";
import { Observable } from "rxjs";
import { Plugins } from "@capacitor/core";

@Injectable({
  providedIn: "root",
})
export class PicturesService {
  constructor(private afStorage: AngularFireStorage) {}

  /**
   * fetches and returns the download URL of the profile pictures stored in "profilePictures/{uid}/"
   * in Firebase Storage
   * @param uid user ID of the user
   * @param numberOfPictures number of pictures the user has
   * @returns array of the download URLs
   */
  async fetchProfilePicturesURL(
    uid: string,
    numberOfPictures: number
  ): Promise<string[]> {
    const refStrings = Array.from({ length: numberOfPictures }).map(
      (value, index) => "profilePictures/" + uid + "/" + index
    );
    const URLs = await Promise.all(
      refStrings.map(async (refString) => {
        const ref = this.afStorage.ref(refString);
        return (await ref.getDownloadURL().toPromise()) as string;
      })
    );
    return URLs;
  }

  /**
   * Takes a blob and keywords for forming a key, converts that blob to a base64 string, before
   * storing locally (using capacitor plugin)
   * @param uid uid of the person whose picture that is
   * @param type type of picture, meaning is it a profile picture, or is it a picture from the chat? (which are lower quality)
   * @param blob blob of the picture
   * @param index index of the picture in question (should only concern profile pictures)
   */
  async storePictureLocally(
    uid: string,
    type: "profile" | "chat",
    blob: Blob,
    index?: number
  ) {
    const storageKey = this.getStorageKey(uid, type, index);
    if (typeof storageKey !== "string") return;

    const base64image = await this.blobToBase64(blob).toPromise();

    await Plugins.Storage.set({ key: storageKey, value: base64image });
  }

  /**
   * Forms the corresponding local storage key from the keywords provided
   * @param uid uid of the person whose picture that is
   * @param type type of picture, meaning is it a profile picture, or is it a picture from the chat? (which are lower quality)
   * @param index index of the picture in question (should only concern profile pictures)
   */
  private getStorageKey(
    uid: string,
    type: "profile" | "chat",
    index?: number
  ): string | null {
    let storageKey: string;
    // constructs a profile storage key only if an index is also provided
    if (type === "profile" && typeof index === "number") {
      storageKey = type + "_" + index + "_" + uid;
    }
    // only constructs a chat storage key by excluding the index even if one is provided
    else if (type === "chat") {
      storageKey = type + "_" + uid;
    } else {
      console.error();
      return;
    }
    return storageKey;
  }

  private async blobFromURL(downloadURL: string): Promise<Blob> {
    return await (await fetch(downloadURL)).blob();
  }

  private blobToBase64(blob: Blob): Observable<string> {
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
}
