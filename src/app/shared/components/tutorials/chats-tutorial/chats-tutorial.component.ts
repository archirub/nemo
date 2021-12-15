import { Component, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';

@Component({
  selector: 'chats-tutorial-slides',
  templateUrl: './chats-tutorial.component.html',
  styleUrls: ['./chats-tutorial.component.scss'],
})
export class ChatsTutorialComponent implements OnInit {
  @Output() exit = new EventEmitter();
  @ViewChild('slides') slides: IonSlides;

  constructor() { }

  ngOnInit() {}

  changeSlide(dir) {
    if(dir === 'next') {
      this.slides.slideNext()
    } else {
      this.slides.slidePrev()
    };
  }

  exitChatsTutorial() {
    this.exit.emit('true');
  }
}
