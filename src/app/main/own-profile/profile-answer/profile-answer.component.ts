import { IonSelect } from "@ionic/angular";
import {
  EventEmitter,
  Component,
  ElementRef,
  Input,
  Output,
  ViewChild,
  Renderer2,
} from "@angular/core";

import { Question, QuestionAndAnswer } from "@interfaces/profile.model";
@Component({
  selector: "profile-answer",
  templateUrl: "./profile-answer.component.html",
  styleUrls: ["./profile-answer.component.scss"],
  providers: [],
})
export class ProfileAnswerComponent {
  @Input() questionAndAnswer: QuestionAndAnswer;
  @Input() questionsNotPicked: Question[];
  @Output() questionAndAnswerChange = new EventEmitter<
    QuestionAndAnswer | Array<string | QuestionAndAnswer>
  >();

  @ViewChild("qHead", { read: ElementRef }) qHead: ElementRef;
  @ViewChild("qInput", { read: ElementRef }) qInput: ElementRef;
  @ViewChild("qInput") qSelect: IonSelect;

  constructor(private renderer: Renderer2) {}

  // for when the answer changes
  onAnswerChange(value) {
    this.questionAndAnswer.answer = value;
    this.questionAndAnswerChange.emit(this.questionAndAnswer);
  }

  // for when the question changes
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

  // for trackBy property of ngFor on questions in template
  trackQuestion(index: number, question: QuestionAndAnswer) {
    return question.question + question.answer;
  }
}
