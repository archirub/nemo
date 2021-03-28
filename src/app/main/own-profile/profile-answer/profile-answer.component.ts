import { Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import { QuestionAndAnswer } from "@interfaces/profile.model";
import { IonTextarea } from "@ionic/angular";

@Component({
selector: "profile-answer",
templateUrl: "./profile-answer.component.html",
styleUrls: ["./profile-answer.component.scss"],
})
export class ProfileAnswerComponent implements OnInit {
    @ViewChild('answerInput') answer: IonTextarea;
    @ViewChild('answerClose', { read: ElementRef }) answerClose: ElementRef;
    @Input() questions: QuestionAndAnswer;

    //for sizing on chats page

    constructor() {}

    ngOnInit() {}

    displayExit() {
        if (this.answer.value != "") {
            this.answerClose.nativeElement.style.display = "block";
        }
        else {
            this.answerClose.nativeElement.style.display = "none";
        };
        this.questions.answer = this.answer.value;
    }

    clearInput() {
        this.answer.value = "";
        this.answerClose.nativeElement.style.display = "none";
        this.questions.answer = "";
    };
}
