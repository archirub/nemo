import { Pipe, PipeTransform } from "@angular/core";
import { SexualPreference } from "@interfaces/match-data.model";

@Pipe({
  name: "formatSexPref",
})
export class FormatSexPrefPipe implements PipeTransform {
  transform(value: SexualPreference): string {
    if (JSON.stringify(value) === JSON.stringify(["male"])) return "male";
    if (JSON.stringify(value) === JSON.stringify(["female"])) return "female";
    if (JSON.stringify(value) === JSON.stringify(["male", "female"])) return "both";
  }
}
