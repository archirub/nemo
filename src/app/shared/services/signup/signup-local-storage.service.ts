import { Injectable } from "@angular/core";
import { SignupDataHolder } from "@classes/signup.class";
import { BehaviorSubject, firstValueFrom } from "rxjs";

import { Storage } from "@capacitor/storage";
import { Base64ToUrl, urlToBase64 } from "@stores/pictures/common-pictures-functions";

@Injectable({
  providedIn: "root",
})
export class SignupLocalStorageService {
  private signupDataKey = "signupData";
  private picturesKey = "signupDataPictures";

  constructor() {}

  /**
   * get the data in local storage under key "signupData" and stores it in the
   * signupData observable
   */
  async getStorage(signupData$: BehaviorSubject<SignupDataHolder>) {
    const storedSignupData = await this.getSignupData();
    const storedPictures = await this.getPictures();

    if (!storedSignupData || Object.keys(storedSignupData).length < 1) return;

    const data = new SignupDataHolder(storedSignupData);

    data.pictures = storedPictures;

    signupData$.next(data);
  }

  /**
   * Replaces data in local storage under key "signupData" by data object provided
   * Only does so if the data holder isn't empty
   */
  async updateStorage(data: SignupDataHolder) {
    let empty = true;

    Object.keys(data).forEach((key) => {
      if (data[key]) {
        empty = false;
      }
    });

    if (empty) return;

    await this.setSignupData(data);

    return this.setPictures(data.pictures);
  }

  /**
   * Removes data in local storage under key "signupData"
   */
  async removeStorage() {
    await Storage.remove({ key: this.signupDataKey });
    return Storage.remove({ key: this.picturesKey });
  }

  private async getSignupData(): Promise<SignupDataHolder> {
    return JSON.parse((await Storage.get({ key: this.signupDataKey })).value);
  }

  private async setSignupData(data: SignupDataHolder) {
    return Storage.set({ key: this.signupDataKey, value: JSON.stringify(data) });
  }

  private async getPictures(): Promise<string[]> {
    const base64Pictures: string[] = JSON.parse(
      (await Storage.get({ key: this.picturesKey })).value
    );
    console.log("base64Pictures", base64Pictures);

    if (!base64Pictures || base64Pictures.length < 1) return [];

    return Promise.all(
      base64Pictures.map((base64pic) => firstValueFrom(Base64ToUrl(base64pic)))
    );
  }

  private async setPictures(picUrls: string[]) {
    if (picUrls.length < 1) return;

    const base64Pics = await Promise.all(
      picUrls.map((url) => firstValueFrom(urlToBase64(url)))
    );

    return Storage.set({ key: this.picturesKey, value: JSON.stringify(base64Pics) });
  }
}
