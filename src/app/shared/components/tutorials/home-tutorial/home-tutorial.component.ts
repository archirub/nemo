import { Component, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';

@Component({
  selector: 'home-tutorial-slides',
  templateUrl: './home-tutorial.component.html',
  styleUrls: ['./home-tutorial.component.scss'],
})
export class HomeTutorialComponent implements OnInit {
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

  exitHomeTutorial() {
    this.exit.emit('true');
  }

}
