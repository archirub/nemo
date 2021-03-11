import { Component, ElementRef, Input, OnInit, OnChanges, AfterViewInit, ViewChild } from "@angular/core";
import { IonInput } from "@ionic/angular";

import { searchCriteriaOptions } from "@interfaces/search-criteria.model";

@Component({
selector: "profile-course",
templateUrl: "./profile-course.component.html",
styleUrls: ["./profile-course.component.scss"],
})
export class ProfileCourseComponent implements AfterViewInit {
    @ViewChild('input') input: IonInput;
    @ViewChild('close', { read: ElementRef }) close: ElementRef;
    @Input() departments: string;
    @Input() type: string;

    scOptions = searchCriteriaOptions;

    depts;
    socs;

    constructor() {}

    ngAfterViewInit() {
        setTimeout(() => { //setTimeout method, have to wait for this.type to be passed from parent
            if (this.type === "courses") {
                this.depts = this.scOptions.areaOfStudy;
            } else if (this.type === "societies") {
                this.depts = this.scOptions.societyCategory;
            }}, 200);
    }

    clearInput() {
        this.input.value = "";
        this.close.nativeElement.style.display = "none";
    }

    displayExit() {
        this.close.nativeElement.style.display = "block";
    }
}
