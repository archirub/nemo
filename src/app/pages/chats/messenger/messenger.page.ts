import { Component, OnInit } from "@angular/core";
import { Profile } from "@classes/index";
import { Keyboard } from "@ionic-native/keyboard/ngx";
// import { AutosizeModule } from "ngx-autosize";

@Component({
  selector: "app-messenger",
  templateUrl: "./messenger.page.html",
  styleUrls: ["./messenger.page.scss"],
  providers: [Keyboard],
})
export class MessengerPage implements OnInit {
  private profile: Profile;
  kaan_msg: String[];
  kaan_expr: boolean;
  arch_msg: String[];
  arch_expr: boolean;

  constructor(private keyboard: Keyboard) {
    this.kaan_msg = ["bitch", "hoe", "dickass", "bitchass"];
    this.kaan_expr = true;
    this.arch_msg = ["lik", "wowdi", "eyo", "beasta"];
    this.arch_expr = true;

  }

  ngOnInit() {
    this.keyboard.show();
  }

  
}
