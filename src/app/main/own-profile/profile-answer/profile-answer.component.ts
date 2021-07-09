import { Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import { User } from "@classes/user.class";
import { QuestionAndAnswer, questionsOptions } from "@interfaces/profile.model";
import { IonSelect, IonTextarea } from "@ionic/angular";

@Component({
selector: "profile-answer",
templateUrl: "./profile-answer.component.html",
styleUrls: ["./profile-answer.component.scss"],
})
export class ProfileAnswerComponent implements OnInit {
    @ViewChild('answerInput') answer: IonTextarea;
    @ViewChild('answerClose', { read: ElementRef }) answerClose: ElementRef;
    @ViewChild('qHead', { read: ElementRef }) qHead: ElementRef;
    @ViewChild('qInput', { read: ElementRef }) qInput: ElementRef;
    @ViewChild('qInput') qSelect: IonSelect;

    @Input() questions: QuestionAndAnswer;
    @Input() profile: User;

    addable: boolean = true;
    questionsAvailable: Array<string> = [];

    chosenQuestion;
    chosenAnswer;

    constructor() {}

    ngOnInit() {
        this.formAvailableQuestions();
    }

    /**
     * Updates UI to show cross icon to remove written answers
     **/
    displayExit() {
        if (this.answer.value != "") {
            this.answerClose.nativeElement.style.display = "block";
        }
        else {
            this.answerClose.nativeElement.style.display = "none";
        };
        this.questions.answer = this.answer.value;
    }

    /**
     * Removes written answer on click of cross, updates question
     **/
     clearInput() {
        this.answer.value = "";
        this.answerClose.nativeElement.style.display = "none";
        this.questions.answer = "";
    };

    /**
     * This is SUPPOSED to update the questions available to answer by checking the ones already used on the profile
     * It updates the 'used' array correctly as you can see in the console.
     * For some reason, the questionsAvailable does not work with the used array as expected
     * A better man than me will need to figure this out, or I can come back to it later -Ewan xx
     **/
    formAvailableQuestions() {
        //THIS DOESN'T WORK AND I HAVE NO IDEA WHY???
        this.questionsAvailable = [];

        let used = [];

        this.profile.questions.forEach(obj => {
            used.push(obj.question);
        });

        console.log(used);

        questionsOptions.forEach(q => {
            if (!used.includes(q)) {
                this.questionsAvailable.push(q);
            };
        }); 
    }

    /**
     * Show question replace UI to edit already included questions
     **/
    showInput() {
        this.qHead.nativeElement.style.display = "none"; //Hide text
        this.qInput.nativeElement.style.display = "flex"; //Show question select
        this.qSelect.open(); //Open ionSelect immediately
    }
    
    /**
     * Changes the profile question based on selection
     **/
    changeQuestion(q) {
        this.questions.question = q.target.value; //Get value of selected question

        this.qHead.nativeElement.style.display = "block"; //Change UI from select to text
        this.qInput.nativeElement.style.display = "none";

        console.log(this.profile.questions); //Console.log to check the new profile questions
    }

    /**
     * Choose question from select when adding new answer
     **/
    chooseQuestion(q) {
        this.chosenQuestion = q.target.value;
    }

    /**
     * Update answer from textarea when adding new answer
     **/
    answerQuestion(a) {
        this.chosenAnswer = a.target.value;
    }
    
    /**
     * Saves new question to user profile on FRONTEND ONLY CURRENTLY
     **/
    submitQuestion() {
        //Make sure they have actually selected a question and written an answer
        if (this.chosenQuestion && this.chosenAnswer) {
            this.profile.questions.push({
                question: this.chosenQuestion, //Push new q/a to profile
                answer: this.chosenAnswer
            });
        };

        this.addable = true; //Hides the new question UI
    }
}
