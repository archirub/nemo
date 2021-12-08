import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'chats-tutorial-slides',
  templateUrl: './chats-tutorial.component.html',
  styleUrls: ['./chats-tutorial.component.scss'],
})
export class ChatsTutorialComponent implements OnInit {
  @Output() exit = new EventEmitter();

  constructor() { }

  ngOnInit() {}

  exitChatsTutorial() {
    this.exit.emit('true');
  }
}
