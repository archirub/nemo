import {
  Component,
  ElementRef,
  QueryList,
  OnInit,
  ViewChild,
  ChangeDetectorRef,
  ViewChildren,
  Output,
  EventEmitter,
  forwardRef,
  Renderer2,
} from "@angular/core";
import {
  ControlValueAccessor,
  FormArray,
  FormControl,
  FormGroup,
  NG_VALUE_ACCESSOR,
} from "@angular/forms";

import { Question } from "@interfaces/index";
import { questionsOptions } from "@interfaces/index";
import { IonSelect, IonSlides } from "@ionic/angular";

@Component({
  selector: "question-slides",
  templateUrl: "./question-slides.component.html",
  styleUrls: ["./question-slides.component.scss"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QuestionSlidesComponent),
      multi: true,
    },
  ],
})
export class QuestionSlidesComponent implements OnInit, ControlValueAccessor {
  @ViewChild("questionSlides") slides: IonSlides;
  @ViewChild("grid", { read: ElementRef }) grid: ElementRef;
  @ViewChild("pager", { read: ElementRef }) pager: ElementRef;
  @ViewChildren("pagerDot", { read: ElementRef }) dots: QueryList<ElementRef>;

  @ViewChildren("selects") selects: QueryList<IonSelect>;
  @ViewChildren("texts") texts: QueryList<HTMLTextAreaElement>;

  @Output() questionAnswered = new EventEmitter();
  @Output() questionDeleted = new EventEmitter();

  // QUESTION FORMARRAY
  questionForm = new FormArray([]);

  disabled = false;
  onChange: any = () => {};
  onTouched: any = () => {};
  //value: QuestionAndAnswer[];
  value: any = [];

  counter: number;
  slideArray: Array<number> = [0];
  answerArray: Array<string> = [];
  questionArray: Array<Question> = [];
  questions = questionsOptions;
  newAvailableQuestions: Array<string> = [...this.questions];
  //Copy of this.questions, not pointer to it, so it IS mutable but doesn't change this.questions

  availableQuestionsMap = {};

  constructor(public detector: ChangeDetectorRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.counter = 1; //counter to add slides to array

    if (this.questionArray.length < 1) {
      this.availableQuestionsMap[0] = [...this.questions];
    } else {
      this.formAQM();
    }
  }

  ngAfterViewInit() {
    this.updateAddButton();
    this.updatePager();
  }

  resetSlides() {
    //Just re-initialise everything
    this.slideArray = [];
    this.newAvailableQuestions = [...this.questions];

    this.availableQuestionsMap = {};
    this.availableQuestionsMap[0] = [...this.questions];

    this.slideArray.push(0);
    this.counter = 1;

    Array.from(this.selects)[0].value = null;
    Array.from(this.texts)[0].value = null;

    this.answerArray = [];
    this.questionArray = [];
  }

  async updatePager() {
    const current = await this.slides.getActiveIndex(); //Get active index, colour that dot orange
    const dots = Array.from(this.dots);
    dots.forEach((el) =>
      this.renderer.setStyle(el.nativeElement, "color", "var(--ion-color-light-shade)")
    ); //Colour each dot grey

    this.renderer.setStyle(
      dots[current].nativeElement,
      "color",
      "var(--ion-color-primary)"
    ); //Colour active dot orange
  }

  /**
   * Builds group of Q/A combo to push to FormArray
   */
  initQuestion() {
    return new FormGroup({
      q: new FormControl(""),
      a: new FormControl(""),
    });
  }

  formAQM() {
    this.availableQuestionsMap = {};

    for (let i = 0; i < this.questionArray.length; i++) {
      let arrayToPush = [];

      for (let j = 0; j < this.questions.length; j++) {
        if (!this.questionArray.includes(this.questions[j])) {
          arrayToPush.push(this.questions[j]);
        }
      }

      arrayToPush.push(this.questionArray[i]);

      this.availableQuestionsMap[i] = arrayToPush;
    }

    let arrayToPush = [];
    this.questions.forEach((q) => {
      if (!this.questionArray.includes(q)) {
        arrayToPush.push(q);
      }
    });

    this.availableQuestionsMap[this.questionArray.length] = arrayToPush;
  }

  /**
   * Adds a new question slide and updates the counter etc. to allow for UI updates
   * Sends the last added question to parent form also
   */
  addQuestion() {
    this.slideArray.push(this.counter);

    this.detector.detectChanges(); //Trigger angular detection ONLY ON THIS COMPONENT to update slides UI

    this.updateAddButton();
    this.updatePager();

    setTimeout(() => this.slides.slideNext(), 50);

    this.counter++;

    this.slides.lockSwipes(false);

    // Push last added question to value of this component
    this.value.push({
      q: this.questionArray[this.questionArray.length - 1],
      a: this.answerArray[this.answerArray.length - 1],
    });

    const questionArray = this.questionForm as FormArray;
    questionArray.push(this.initQuestion());

    // Send last added question to parent form
    this.questionAnswered.emit([
      this.questionArray[this.questionArray.length - 1],
      this.answerArray[this.answerArray.length - 1],
    ]);

    this.onChange(this.value);

    this.updateDeleteButton(this.counter - 1);
  }

  deleteQuestion(i) {
    this.questionArray.splice(i, 1);
    this.answerArray.splice(i, 1);

    this.slides.slidePrev();
    this.counter--;

    //This essentially rebuilds the slides from scratch
    setTimeout(() => {
      //Fill new slide array up to number of new slides
      this.slideArray = Array.from(Array(this.slideArray.length - 1).keys());
      this.detector.detectChanges();

      for (let j = 0; j < Array.from(this.texts).length; j++) {
        //Manually enter all selects and textareas
        Array.from(this.selects)[j].value = this.questionArray[j];
        Array.from(this.texts)[j].value = this.answerArray[j];
      }

      this.detector.detectChanges();
    }, 50);

    this.updateAddButton();

    //Clear value and push all answered questions
    this.value = [];
    for (let j = 0; j < this.questionArray.length; j++) {
      this.value.push({
        q: this.questionArray[j],
        a: this.answerArray[j],
      });
    }

    this.questionDeleted.emit(i);

    this.onChange(this.value);
  }

  async updateDeleteButton(i) {
    const deleteButton = document.getElementsByClassName("delete")[i] as HTMLElement;
    this.renderer.setStyle(deleteButton, "display", "block");
  }

  async updateAddButton() {
    const add = document.getElementById("add");

    this.renderer.setStyle(add, "display", "none");

    const ind = await this.slides.getActiveIndex();
    const l = this.counter; //Slides length
    const last = l - 1; //Final slide index

    if (l === 1) {
      //Initial slide
      if (
        typeof this.questionArray[0] === "string" &&
        typeof this.answerArray[0] === "string"
      ) {
        this.renderer.setStyle(add, "display", "flex");
      }
    } else if (ind === last && l > 1) {
      //All other slides
      if (
        typeof this.questionArray[ind] === "string" &&
        typeof this.answerArray[ind] === "string"
      ) {
        this.renderer.setStyle(add, "display", "flex");
      }
    }
  }

  filterArray(array1, array2) {
    /**
     * Filters out each element in array2 from array1
     * Note, all elements of array2 MUST BE IN array1
     * Built because .filter cannot reach global scope in this typscript construct
     **/
    array2.forEach((element) => {
      const ind = array1.indexOf(element);
      array1.splice(ind, 1);
    });
  }

  updateQuestionArray(index, $event) {
    /**
     *  Update question array when one is selected, with inputs
     * index (number): slide of chosen question to change correct index in questionArray
     * $event: used to target the value of the ion-select where the question is chosen
     **/
    this.questionArray[index] = $event.target.value; //How to target select's value without ViewChild, check event origin
    this.updateAddButton();
    this.updateDeleteButton(index);

    this.formAQM();
  }

  updateAnswerArray(index, event) {
    /**
     *  Update answer array when one is selected, with inputs
     * index (number): slide of chosen answer to change correct index in answerArray
     * $event: used to target the value of the ion-textarea where the answer is entered
     **/
    this.answerArray[index] = event.target.value; //How to target textarea's value, same as ion-select

    if (event.target.value === "") {
      //Don't allow empty answers in answerArray
      this.answerArray[index] = null;
    }

    this.updateAddButton();
  }

  /**
   * Triggered by parent, fills out form value
   * Rebuilds the slide UI and fills out each slide
   */
  writeValue(value: any): void {
    this.value = value;

    //Reinitialise everything ready for filling out UI
    this.slideArray = [];
    this.questionArray = [];
    this.answerArray = [];

    if (value.length < 1) {
      this.slideArray = [0]; //No questions answered, blank slate
    } else {
      let count = 0;

      value.forEach((obj) => {
        //Iterate through value saved and add each question/answer
        this.questionArray.push(obj.q);
        this.answerArray.push(obj.a);
        this.slideArray.push(count); //Add slides for each answer
        count++;
      });

      this.counter = count; //This is related to the delete button UI
      this.detector.detectChanges(); //Detect template changes for getting IonSelects/Textareas
      //IMPORTANT LEAVE THIS HERE

      for (let i = 0; i < this.slideArray.length; i++) {
        //Fill out all the UI slides
        Array.from(this.selects)[i].value = this.questionArray[i];
        Array.from(this.texts)[i].value = this.answerArray[i];
        this.updateDeleteButton(i);
      }
    }

    this.slides.slideTo(this.slideArray.length - 1); //Go to last slide
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
