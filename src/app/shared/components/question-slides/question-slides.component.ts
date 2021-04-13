import { Component, 
  ElementRef, 
  QueryList, 
  OnInit, 
  ViewChild, 
  ChangeDetectorRef, 
  ViewChildren } from "@angular/core";
import { QuestionAndAnswer } from "@interfaces/index";
import { questionsOptions } from "@interfaces/index";
import { IonSlides } from "@ionic/angular";

@Component({
  selector: "question-slides",
  templateUrl: "./question-slides.component.html",
  styleUrls: ["./question-slides.component.scss"],
})
export class QuestionSlidesComponent implements OnInit {
  @ViewChild('questionSlides') slides: IonSlides;
  @ViewChild('grid', { read: ElementRef }) grid: ElementRef;
  @ViewChild('pager', { read: ElementRef }) pager: ElementRef;
  @ViewChildren('pagerDot', { read: ElementRef }) dots: QueryList<ElementRef>;

  counter: number;
  slideArray: Array<number> = [0];
  answerArray: Array<string> = [];
  questionArray: Array<string> = [];
  questions = questionsOptions;
  newAvailableQuestions: Array<string> = [...this.questions]; //Copy of this.questions, not pointer to it, so it is mutable but doesn't change this.questions

  availableQuestionsMap = {
    0: this.questions,
  }

  constructor(
    public detector: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.counter = 1; //counter to add slides to array
  }

  ngAfterViewInit() {
    this.updateAddButton();
    this.updatePager();
  }

  async updatePager() {
    var current = await this.slides.getActiveIndex(); //Get active index, colour that dot orange
    var dots = Array.from(this.dots);

    dots.forEach(el => el.nativeElement.style.color = "var(--ion-color-light-shade)"); //Colour each dot grey
    dots[current].nativeElement.style.color = "var(--ion-color-primary)"; //Colour active dot orange
  }

  addQuestion() {
    this.slideArray.push(this.counter);

    this.availableQuestionsMap[this.counter] = this.newAvailableQuestions;

    this.detector.detectChanges(); //Trigger angular detection ONLY ON THIS COMPONENT to update slides UI

    this.updateAddButton();
    this.updatePager();

    setTimeout(() => this.slides.slideNext(), 50);

    this.counter++;

    this.slides.lockSwipes(false);
  }

  async updateAddButton() {
    const add = document.getElementById("add");

    add.style.display = "none";

    var ind = await this.slides.getActiveIndex();
    var l = this.counter; //Slides length
    var last = l - 1; //Final slide index

    if (l === 1) { //Initial slide
      if (typeof this.questionArray[0] === 'string' && typeof this.answerArray[0] === 'string') {
        add.style.display = "flex"; 
      }

    } else if (ind === last && l > 1) { //All other slides
      if (typeof this.questionArray[ind] === 'string' && typeof this.answerArray[ind] === 'string') {
        add.style.display = "flex";
      }
    };
  }

  filterArray(array1,array2) {
    /**
     * Filters out each element in array2 from array1
     * Note, all elements of array2 MUST BE IN array1
     * Built because .filter cannot reach global scope in this typscript construct
    **/
    array2.forEach(element => {
      var ind = array1.indexOf(element);
      array1.splice(ind,1);
    });
  }

  removeChosenQuestions(index,question) {
    /**
     * Update questionsLeft array to stop users picking the same question again, with input
     * index (number): the slide where the question was chosen; question is removed from all OTHER slides
     * question (string): question to be removed from options
    **/
    this.newAvailableQuestions = [...this.questions];
    this.filterArray(this.newAvailableQuestions, this.questionArray);

    for (let i = 0; i < Object.keys(this.availableQuestionsMap).length; i++) {
      if (i != index) {
        this.availableQuestionsMap[i] = [...this.questions];
        this.filterArray(this.availableQuestionsMap[i],this.questionArray);
      };
    };
  }

  updateQuestionArray(index,$event) {
    /**
     *  Update question array when one is selected, with inputs
     * index (number): slide of chosen question to change correct index in questionArray
     * $event: used to target the value of the ion-select where the question is chosen
    **/
    this.questionArray[index] = $event.target.value; //How to target select's value without ViewChild, check event origin
    this.removeChosenQuestions(index,$event.target.value); //Remove chosen question
    this.updateAddButton();
  }

  updateAnswerArray(index,$event) {
    /**
     *  Update answer array when one is selected, with inputs
     * index (number): slide of chosen answer to change correct index in answerArray
     * $event: used to target the value of the ion-textarea where the answer is entered
    **/
    this.answerArray[index] = $event.target.value; //How to target textarea's value, same as ion-select

    if ($event.target.value === "") { //Don't allow empty answers in answerArray
      this.answerArray[index] = null;
    };

    this.updateAddButton();
  }
}