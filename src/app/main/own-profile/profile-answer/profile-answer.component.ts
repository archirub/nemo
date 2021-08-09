import { 
    EventEmitter, 
    Component, 
    ElementRef, 
    Input, 
    OnInit, 
    Output, 
    ViewChild 
} from "@angular/core";
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

    @Output() questionChanged = new EventEmitter();

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
     * Checks the questions used on profile
     * Updates available other questions to choose from using that array
     **/
    formAvailableQuestions() {
        this.questionsAvailable = [...questionsOptions]; //Start with all available

        this.profile.questions.forEach(qAndA => { //For each question on profile
            Object.values(qAndA).forEach(str => { //For each value in each question
                if (this.questionsAvailable.includes(str)) {
                    this.questionsAvailable.splice(this.questionsAvailable.indexOf(str), 1);
                    //If questionsAvailable includes one already in profile, remove it
                };
            });
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
        this.questions.question = q.target.value.slice(1,-1); //Get value of selected question

        this.qHead.nativeElement.style.display = "block"; //Change UI from select to text
        this.qInput.nativeElement.style.display = "none";

        this.questionChanged.emit(q.target.value.slice(1,-1));

        this.formAvailableQuestions();
    }

    /**
     * User cancels changing profile question
     * Sets display back to profile question before the select was brought up
     **/
    cancelQuestion() {
        this.qHead.nativeElement.style.display = "block"; //Change UI from select to text
        this.qInput.nativeElement.style.display = "none";
    }


    /**
     * Choose question from select when adding new answer
     **/
    chooseQuestion(q) {
        this.chosenQuestion = q.target.value.slice(1,-1);
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
                answer: this.chosenAnswer,
                question: this.chosenQuestion //Push new q/a to profile
            });
        };

        this.addable = true; //Hides the new question UI
    }

    /**
     * Sets addable property to true to hide input
     **/
    makeAddable() {
        this.addable = true;
    }

}
