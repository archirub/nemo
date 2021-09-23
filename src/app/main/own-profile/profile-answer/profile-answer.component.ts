import {
  EventEmitter,
  Component,
  ElementRef,
  Input,
  Output,
  ViewChild,
  forwardRef,
  Renderer2,
} from "@angular/core";
import { NG_VALUE_ACCESSOR } from "@angular/forms";
import { AppUser } from "@classes/user.class";
import { Question, QuestionAndAnswer, questionsOptions } from "@interfaces/profile.model";
import { IonSelect, IonTextarea } from "@ionic/angular";

// change the "addable" system so that questions are added outside of the slides component,
// within the own-profile, not within the custom component as that creates so many problems

@Component({
  selector: "profile-answer",
  templateUrl: "./profile-answer.component.html",
  styleUrls: ["./profile-answer.component.scss"],
  providers: [
    // {
    //   provide: NG_VALUE_ACCESSOR,
    //   multi: true,
    //   useExisting: forwardRef(() => ProfileAnswerComponent),
    // },
  ],
})
export class ProfileAnswerComponent {
  @ViewChild("answerInput") answer: IonTextarea;
  @ViewChild("answerClose", { read: ElementRef }) answerClose: ElementRef;
  @ViewChild("qHead", { read: ElementRef }) qHead: ElementRef;
  @ViewChild("qInput", { read: ElementRef }) qInput: ElementRef;
  @ViewChild("qInput") qSelect: IonSelect;

  @Input() questionAndAnswer: QuestionAndAnswer;
  @Output() questionAndAnswerChange = new EventEmitter<
    QuestionAndAnswer | Array<string | QuestionAndAnswer>
  >();

  @Input() questionsNotPicked: Question[];

  constructor(private renderer: Renderer2) {}

  onAnswerChange(value) {
    this.questionAndAnswer.answer = value;
    this.questionAndAnswerChange.emit(this.questionAndAnswer);
  }

  onQuestionChange(event) {
    this.questionAndAnswer.question = event.target.value;
    this.questionAndAnswerChange.emit(this.questionAndAnswer);
    this.hideInput();
  }

  /**
   * Removes question on click of cross
   **/
  clearInput() {
    this.questionAndAnswerChange.emit(["delete", this.questionAndAnswer]);
  }

  /**
   * Show question replace UI to edit already included questions
   **/
  showInput() {
    this.renderer.setStyle(this.qHead.nativeElement, "display", "none"); //Hide text
    this.renderer.setStyle(this.qInput.nativeElement, "display", "flex"); //Show question select

    this.qSelect.open(); //Open ionSelect immediately
  }

  /**
   * Hides select once again so question is just text
   **/
  hideInput() {
    this.renderer.setStyle(this.qHead.nativeElement, "display", "flex");
    this.renderer.setStyle(this.qInput.nativeElement, "display", "none");
  }

  /**
   * Changes the profile question based on selection
   **/
  changeQuestion(q) {
    this.questionAndAnswer.question = q.target.value; //Get value of selected question

    this.renderer.setStyle(this.qHead.nativeElement, "display", "block"); //Change UI from select to text
    this.renderer.setStyle(this.qInput.nativeElement, "display", "none");

    this.questionAndAnswerChange.emit(this.questionAndAnswer);
  }

  /**
   * User cancels changing profile question
   * Sets display back to profile question before the select was brought up
   **/
  cancelQuestion() {
    this.renderer.setStyle(this.qHead.nativeElement, "display", "block"); //Change UI from select to text
    this.renderer.setStyle(this.qInput.nativeElement, "display", "none");
  }

  /**
   * Update answer from textarea when adding new answer
   **/
  answerQuestion(a) {
    this.questionAndAnswer.answer = a.target.value;
    this.questionAndAnswerChange.emit(this.questionAndAnswer);
  }
}
