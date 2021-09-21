import { Pipe, PipeTransform } from "@angular/core";

// The idea here is to transform a null element of an array
// to whatever other value you'd like. This is useful when the elements represents
// different options and the nullish value is for when no option is selected

@Pipe({
  name: "nullElementTo",
})
export class NullElementToPipe implements PipeTransform {
  transform(value: any[], replacementElement: string): any[] {
    return value.map((el) => (el == null ? replacementElement : el));
  }
}
