import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";

export const FishSwimAnimation = (fish: ElementRef) => {
  const fishAnimation = new AnimationController().create("fishAnimation");

  fishAnimation
    .addElement(fish.nativeElement)
    .duration(1200)
    .keyframes([
      { offset: 0, transform: "rotate(0deg)" },
      { offset: 0.395, transform: "rotate(-90deg)" },
      { offset: 0.511, transform: "rotate(-110deg)" },
      { offset: 0.884, transform: "rotate(-160deg)" },
      { offset: 1, transform: "rotate(-180deg)" },
    ])
    .iterations(Infinity);

  return fishAnimation;
};

export const FishEnterAnimation = (
  screenWidth: number,
  fish1: ElementRef,
  fish2: ElementRef
) => {
  const enterLeftAnimation = new AnimationController().create("enterLeftAnimation");

  enterLeftAnimation
    .addElement(fish1.nativeElement)
    .duration(1000)
    .fromTo(
      "transform",
      `translate(${screenWidth}px) rotate(0deg)`,
      "translate(122px) rotate(-40deg)"
    );

  const enterRightAnimation = new AnimationController().create("enterRightAnimation");

  enterRightAnimation
    .addElement(fish2.nativeElement)
    .duration(700)
    .fromTo(
      "transform",
      "translate(-50px) rotate(180deg)",
      `translate(${screenWidth - 174}px) rotate(140deg)`
    );

  return new AnimationController()
    .create()
    .addAnimation([enterLeftAnimation, enterRightAnimation]);
};
