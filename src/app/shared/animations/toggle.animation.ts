import { ElementRef } from "@angular/core";
import { AnimationController, Animation } from "@ionic/angular";

export const ToggleAppearAnimation = (
  toggle: ElementRef
  //initialTop: number,
  //finalTop: number
): Animation => {
  //Moving on-screen
  const moveInAnimation = new AnimationController().create("appearAnimation");
  moveInAnimation
    .addElement(toggle.nativeElement)
    .easing("ease-in-out")
    .duration(400)
    .beforeStyles({
      opacity: "0",
    })
    .fromTo("opacity", "0", "1");
  //.fromTo('width', '0', `${initialWidth}vw`);
  //.fromTo("top", `${initialTop}vh`, `${finalTop}vh`);
  return moveInAnimation;
};

/*export const ToggleDisappearAnimation = (
  toggle: ElementRef,
  initialTop: number,
  finalTop: number
): Animation => {
  //Moving on-screen
  const moveOutAnimation = new AnimationController().create("disappearAnimation");
  moveOutAnimation
    .addElement(toggle.nativeElement)
    .easing("ease-in-out")
    .duration(200)
    .fromTo("top", `${finalTop}vh`, `${initialTop}vh`)
    .afterStyles({
      top: `${finalTop}vh`,
    });

  return moveOutAnimation;
};*/
