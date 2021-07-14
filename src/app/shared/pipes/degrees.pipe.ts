import { Pipe, PipeTransform } from "@angular/core";
import { Degree } from "@interfaces/search-criteria.model";

@Pipe({
  name: "degrees",
})
export class DegreesPipe implements PipeTransform {
  transform(value: Degree): "UG" | "PG" {
    if (value === "undergrad") return "UG";
    if (value === "postgrad") return "PG";
    return null;
  }
}
