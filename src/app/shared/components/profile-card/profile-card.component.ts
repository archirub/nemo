import { Component, 
        ElementRef, 
        QueryList,
        Input, 
        Output, 
        OnInit, 
        AfterViewInit,
        ViewChild, 
        EventEmitter, 
        ViewChildren } from "@angular/core";
import { Chat, Profile } from "@classes/index";
import { IonContent, IonSlides } from "@ionic/angular";

@Component({
  selector: "app-profile-card",
  templateUrl: "./profile-card.component.html",
  styleUrls: ["./profile-card.component.scss"],
})
export class ProfileCardComponent implements OnInit, AfterViewInit {
  @Output() expanded = new EventEmitter();
  @Output() tapped = new EventEmitter();
  @Input() moreInfo: boolean;
  @Input() profile: Profile[];
  @ViewChild(IonContent) ionContent: IonContent;
  @ViewChild(IonSlides) slides: IonSlides;
  @ViewChildren('bullets', { read: ElementRef }) bullets: QueryList<ElementRef>;
  @ViewChild('content', { read: ElementRef}) content: ElementRef;
  @ViewChild('yes', { read: ElementRef }) yesSwipe: ElementRef;
  @ViewChild('no', { read: ElementRef }) noSwipe: ElementRef;

  picturePaths: Array<string>;

  //for sizing on chats page
  @ViewChild('fullCard', { read: ElementRef }) swipe: ElementRef; //full swipe-card id
  @ViewChild('snippet', { read: ElementRef }) snippet: ElementRef; //info before expand
  @ViewChild('complete', { read: ElementRef, static: false }) complete: ElementRef; //info after expand
  @ViewChild('picSlides', { read: ElementRef }) picture: ElementRef; //picture slides
  @ViewChildren('pic', { read: ElementRef }) pictures: QueryList<ElementRef>; //pictures
  @ViewChild('name', { read: ElementRef }) name: ElementRef; //name
  @ViewChild('department', { read: ElementRef }) department: ElementRef; //department
  @ViewChild('header', { read: ElementRef }) header: ElementRef; //name & department container
  @ViewChild('question', { read: ElementRef }) question: ElementRef; //question
  @ViewChild('answer', { read: ElementRef }) answer: ElementRef; //answer
  @ViewChild('QandA', { read: ElementRef }) QandA: ElementRef; //question & answer container

  constructor() {}

  ngOnInit() {
    this.moreInfo = false;
    this.picturePaths = ["https://staticg.sportskeeda.com/editor/2020/06/a19cc-15923264235917.jpg",
    "/assets/picture2.jpg",
    "/assets/picture3.jpg",
    "/assets/picture6.jpg"]
  }

  ngAfterViewInit() {
    this.updatePager();
    this.slides.lockSwipeToPrev(true);
  }

  expandProfile() {
    if (this.moreInfo == true) {
      this.moreInfo = false;
    } else {
      this.moreInfo = true;
    };
    this.expanded.emit(this.moreInfo);
    setTimeout(() => {
      this.sizeSwipers();
    }, 100);
  }

  async updatePager() {
    var current = await this.slides.getActiveIndex();
    let index = 0;
    this.bullets.forEach((bullet: ElementRef) => {
      if (current === index) {
        bullet.nativeElement.style.color = 'var(--ion-color-primary)';
      } else {
        bullet.nativeElement.style.color = 'var(--ion-color-light-shade)';
      };
      index += 1;
    })
  }

  sizeSwipers() {
    var h = this.content.nativeElement.getBoundingClientRect().height;
    
    this.yesSwipe.nativeElement.style.height = `${h}px`;
    this.noSwipe.nativeElement.style.height = `${h}px`;
    this.yesSwipe.nativeElement.style.marginTop = '13vh';
    this.noSwipe.nativeElement.style.marginTop = '13vh';
  }

  async checkSlide() {
    var current = await this.slides.getActiveIndex();
    var len = await this.slides.length();

    if (current === (len-1)) {
      this.slides.lockSwipeToNext(true);
    } else if (current === 0) {
      this.slides.lockSwipeToPrev(true);
    } else {
      this.slides.lockSwipeToPrev(false);
      this.slides.lockSwipeToNext(false);
    };
  }
}
