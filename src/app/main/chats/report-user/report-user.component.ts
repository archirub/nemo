import { Component, OnInit } from "@angular/core";
import { UserReport } from "@interfaces/user-report.models";
import { UserReportingService } from "@services/user-reporting/user-reporting.service";

@Component({
  selector: "app-report-user",
  templateUrl: "./report-user.component.html",
  styleUrls: ["./report-user.component.scss"],
})
export class ReportUserComponent implements OnInit {
  // values given from opening the modal
  userReportedID: string;
  userReportedName: string;
  userReportingID: string;

  report: UserReport;

  constructor(private userReportingService: UserReportingService) {}

  closeModal() {}

  reportUser() {
    this.userReportingService.reportUser(this.report);
  }

  ngOnInit() {
    this.report = {
      userReportingID: this.userReportingID,
      userReportedID: this.userReportedID,
      causeGiven: null,
      additionalCommentGiven: null,
      state: null,
      actionTaken: null,
    };
  }
}
