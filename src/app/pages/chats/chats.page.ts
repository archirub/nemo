import { Component, OnInit, ViewChild, OnDestroy } from "@angular/core";
import { IonContent } from "@ionic/angular";
import {
  AngularFirestore,
  DocumentChangeAction,
} from "@angular/fire/firestore";

import { Observable, Subscription } from "rxjs";
import { map, take } from "rxjs/operators";

import { ChatStore } from "@stores/index";
import { Chat, Profile } from "@classes/index";
import { AuthService } from "@services/index";
import { chatFromDatabase } from "@interfaces/index";

@Component({
  selector: "app-chats",
  templateUrl: "./chats.page.html",
  styleUrls: ["./chats.page.scss"],
})
export class ChatsPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) ionContent: IonContent;

  private allChats$: Subscription;
  private messageListener$: Subscription;

  public allChats: Observable<Chat[]>;
  public allDbChats: chatFromDatabase[];
  profileCount: number;
  scrollTopSpeed: number;
  searching: boolean;
  filtered: boolean;

  // private messageListener: Observable<chatFromDatabase[]> = this.fs
  //   .collection("chats", (ref) =>
  //     ref.where("uids", "array-contains", this.auth.userID)
  //   )
  //   .valueChanges()
  //   .pipe(
  //     map((snapshot: chatFromDatabase[]) => {
  //       console.log(snapshot);
  //       // this.allDbChats = snapshot;
  //       return snapshot;
  //     })
  //   );

  constructor(
    private ChatStore: ChatStore,
    private auth: AuthService,
    private fs: AngularFirestore
  ) {}

  ngOnInit() {
    this.allChats = this.ChatStore.chats;

    this.ChatStore.fetchChats(10);

    this.scrollTopSpeed = this.profileCount * 45; //so the relative speed is always the same

    //this.messageListener$ = this.messageListener.subscribe();
    // this.searching = false;
    // this.filtered = false;
  }

  // filterProfiles(event) {
  //   if (this.filtered == true) {
  //     this.filtered = false;
  //   } else {
  //     this.filtered = true;
  //   }
  //   console.log("filter status " + this.filtered);
  // }

  onScrollDown() {}

  scrollToTop() {
    this.ionContent.scrollToTop(500);
  }

  ngOnDestroy() {
    this.allChats$.unsubscribe();
    this.messageListener$.unsubscribe();
  }
}
