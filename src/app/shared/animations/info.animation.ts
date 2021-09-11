import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";

export const MoreInfoAnimation = (
  moreInfo: ElementRef,
  initialHeight: number,
  finalHeight: number
) => {
  //Moving on-screen
  const moveInAnimation = new AnimationController().create("moveInAnimation");
  moveInAnimation
    .addElement(moreInfo.nativeElement)
    .easing("ease-in-out")
    .duration(300)
    .fromTo("height", `${initialHeight}%`, `${finalHeight}%`);

  return moveInAnimation;
};

export const LessInfoAnimation = (
  moreInfo: ElementRef,
  initialHeight: number,
  finalHeight: number
) => {
  //Moving on-screen
  const moveOutAnimation = new AnimationController().create("moveOutAnimation");
  moveOutAnimation
    .addElement(moreInfo.nativeElement)
    .easing("ease-in-out")
    .duration(300)
    .fromTo("height", `${finalHeight}%`, `${initialHeight}%`);

  return moveOutAnimation;
};
