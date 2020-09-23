import { Component, OnInit } from '@angular/core';
import { CommonModule } from "@angular/common";
import { Profile } from '@shared/interfaces/profile';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { AutosizeModule } from 'ngx-autosize';

@Component({
  selector: 'app-messenger',
  templateUrl: './messenger.page.html',
  styleUrls: ['./messenger.page.scss'],
  providers: [Keyboard]
})
export class MessengerPage implements OnInit {
  private profile: Profile;
  messages: String[];

  constructor(private keyboard: Keyboard) {
    this.messages = ["bitch","hoe","dickass","bitchass"];
  }

  ngOnInit() {
    this.keyboard.show();
  }

}
