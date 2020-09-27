import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { Subscription } from "rxjs";

import { AuthService } from "@services/auth/auth.service";
import { NameService } from "@services/name/name.service";

@Injectable({
  providedIn: "root",
})
export class DatabaseService {
  constructor(
    private firestore: AngularFirestore,
    private name: NameService,
    private auth: AuthService
  ) {}

  async isLikedBy(userID: string): Promise<Boolean> {
    if (!userID) {
      console.error("No user ID provided.");
      return;
    }
    let myID: string = "";

    const snapshot = await this.firestore
      .collection(this.name.matchCollection)
      .doc(this.auth.userID)
      .get()
      .toPromise();
    if (!snapshot.exists) return false;
    const likedUsers: string[] = snapshot.data().likedUsers;
    if (likedUsers.includes(myID)) {
      return true;
    }
    return false;
  }
}
