import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { Subscription } from "rxjs";

import { AuthService } from "@services/auth/auth.service";
import { NameService } from "@services/name/name.service";
import { AngularFireAuth } from "@angular/fire/auth";

@Injectable({
  providedIn: "root",
})
export class DatabaseService {
  constructor(
    private firestore: AngularFirestore,
    private name: NameService,
    private auth: AuthService,
    private afAuth: AngularFireAuth
  ) {}

  async isLikedBy(userID: string): Promise<Boolean> {
    if (!userID) {
      console.error("No user ID provided.");
      return;
    }
    const user = await this.afAuth.currentUser;

    if (user) {
      const snapshot = await this.firestore
        .collection(this.name.matchCollection)
        .doc(user.uid)
        .get()
        .toPromise();
      if (!snapshot.exists) return false;
      const likedUsers: string[] = snapshot.data().likedUsers;
      if (likedUsers.includes(user.uid)) {
        return true;
      }
      return false;
    }
  }
}
