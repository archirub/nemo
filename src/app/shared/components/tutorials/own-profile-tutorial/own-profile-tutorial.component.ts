import { Component, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';

@Component({
  selector: 'own-profile-tutorial-slides',
  templateUrl: './own-profile-tutorial.component.html',
  styleUrls: ['./own-profile-tutorial.component.scss'],
})
export class OwnProfileTutorialComponent implements OnInit {
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

  exitOwnProfileTutorial() {
    this.exit.emit('true');
  }
}
