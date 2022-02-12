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
import { ControlContainer, NgForm } from "@angular/forms";

import { AreaOfStudy, SocietyCategory } from "@interfaces/search-criteria.model";

@Component({
  selector: "profile-course",
  templateUrl: "./profile-course.component.html",
  styleUrls: ["./profile-course.component.scss"],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class ProfileCourseComponent implements OnInit {
  @Input() categoryPlaceHolder: string;
  @Input() categoryOptions: string;
  @Input() choice: string;
  @Input() categoryChoice: SocietyCategory | AreaOfStudy;
  @Output() choiceChange = new EventEmitter<string>();
  @Output() categoryChoiceChange = new EventEmitter<SocietyCategory | AreaOfStudy>();

  @ViewChild("close", { read: ElementRef }) close: ElementRef;

  constructor(private renderer: Renderer2) {}

  ngOnInit() {}

  onChoiceChange(value: string) {
    this.choice = value;
    this.choiceChange.emit(this.choice);
    this.renderer.setStyle(this.close.nativeElement, "display", "flex");
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
