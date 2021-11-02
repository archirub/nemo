import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  EventEmitter,
  OnInit,
  Output,
  Renderer2,
} from "@angular/core";
import { IonInput, IonSelect } from "@ionic/angular";

import {
  AreaOfStudy,
  SocietyCategory,
} from "@interfaces/search-criteria.model";
import { ControlContainer, NgForm } from "@angular/forms";

@Component({
  selector: "profile-course",
  templateUrl: "./profile-course.component.html",
  styleUrls: ["./profile-course.component.scss"],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class ProfileCourseComponent implements OnInit {
  @ViewChild("input") input: IonInput;
  @ViewChild("select") select: IonSelect;
  @ViewChild("close", { read: ElementRef }) close: ElementRef;

  @Input() categoryPlaceHolder: string;

  @Input() categoryOptions: string;

  @Input() choice: string;
  @Output() choiceChange = new EventEmitter<string>();

  @Input() categoryChoice: SocietyCategory | AreaOfStudy;
  @Output() categoryChoiceChange = new EventEmitter<SocietyCategory | AreaOfStudy>();

  constructor(private renderer: Renderer2) {}

  ngOnInit() {
    // interval(3000).subscribe(() => console.log(this.choice, this.categoryChoice));
    // this.choiceChange.subscribe((a) => console.log("choice change", a));
    // this.categoryChoiceChange.subscribe((a) => console.log("categoryChoiceChange", a));
  }

  onChoiceChange(value: string) {
    this.choice = value;
    this.choiceChange.emit(this.choice);
    this.renderer.setStyle(this.close.nativeElement, "display", "block");
  }

  onCategoryChange(value: SocietyCategory | AreaOfStudy) {
    this.categoryChoice = value;
    this.categoryChoiceChange.emit(this.categoryChoice);
  }

  clearValueInput() {
    this.choice = "";
    this.choiceChange.emit(this.choice);
    this.renderer.setStyle(this.close.nativeElement, "display", "none");
  }
}
