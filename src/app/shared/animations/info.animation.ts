import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";

export const MoreInfoAnimation = (
  moreInfo: ElementRef,
  initialTop: number,
  finalTop: number
) => {
  //Moving on-screen
  const moveInAnimation = new AnimationController().create("moveInAnimation");
  moveInAnimation
    .addElement(moreInfo.nativeElement)
    .easing("ease-in-out")
    .duration(300)
    .fromTo("top", `${initialTop}%`, `${finalTop}%`);

  return moveInAnimation;
};

export const LessInfoAnimation = (
  moreInfo: ElementRef,
  initialTop: number,
  finalTop: number
) => {
  //Moving on-screen
  const moveOutAnimation = new AnimationController().create("moveOutAnimation");
  moveOutAnimation
    .addElement(moreInfo.nativeElement)
    .easing("ease-in-out")
    .duration(300)
    .fromTo("top", `${finalTop}%`, `${initialTop}%`);

  return moveOutAnimation;
};
