import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
import {
  SCButtonHideAnimation,
  SCButtonUnhideAnimation,
} from "./hide-search-criteria.animation";

// export const LeftPicAnimation = (
//   viewHeight: number,
//   viewWidth: number,
//   picture: ElementRef
// ) => {
//   const startXPosition = -100; //picture width off screen left
//   const startYPosition = viewHeight / 2 - 160; //picture height
//   const endXPosition = viewWidth / 2 - 105; //picture width - 25
//   const endYPosition = viewHeight / 2 - 140; //picture height + 20
//   const startRotation = -15;
//   const endRotation = 15;

//   // Moving on from left
//   const picAnimation = new AnimationController().create("picAnimation");

//   picAnimation
//     .addElement(picture.nativeElement)
//     .easing("ease-out")
//     .duration(500)
//     .beforeStyles({
//       display: "block",
//     })
//     .fromTo(
//       "transform",
//       `translate(${startXPosition}px, ${startYPosition}px) rotate(${startRotation}deg)`,
//       `translate(${endXPosition}px, ${endYPosition}px) rotate(${endRotation}deg)`
//     )
//     .afterStyles({
//       display: "block",
//     });

//   return picAnimation;
// };

// export const RightPicAnimation = (
//   viewHeight: number,
//   viewWidth: number,
//   picture: ElementRef
// ) => {
//   const startXPosition = viewWidth; //picture width off right
//   const startYPosition = viewHeight / 2 - 160; //picture height
//   const endXPosition = viewWidth / 2 + 5;
//   const endYPosition = viewHeight / 2 - 140; //picture height + 20
//   const startRotation = 15;
//   const endRotation = -15;

//   // Moving on from right
//   const picAnimation = new AnimationController().create("picAnimation");

//   picAnimation
//     .addElement(picture.nativeElement)
//     .easing("ease-out")
//     .duration(500)
//     .beforeStyles({
//       display: "block",
//     })
//     .fromTo(
//       "transform",
//       `translate(${startXPosition}px, ${startYPosition}px) rotate(${startRotation}deg)`,
//       `translate(${endXPosition}px, ${endYPosition}px) rotate(${endRotation}deg)`
//     )
//     .afterStyles({
//       display: "block",
//     });
//   return picAnimation;
// };

export const TextAnimation = (text: ElementRef) => {
  const textAnimation = new AnimationController().create("textAnimation");

  textAnimation
    .addElement(text.nativeElement)
    .easing("ease-out")
    .duration(500)
    .beforeStyles({
      display: "flex",
    })
    .fromTo("transform", `scale(1,1)`, `scale(1.2,1.2)`)
    .afterStyles({
      display: "flex",
    });
  return textAnimation;
};

export const BackAnimation = (backdrop: any) => {
  const backAnimation = new AnimationController().create("backAnimation");

  backAnimation
    .addElement(backdrop.nativeElement)
    .duration(500)
    .easing("ease-in")
    .fromTo("opacity", "0", "1");

  return backAnimation;
};

export const OpenCatchAnimation = (
  viewHeight: number,
  viewWidth: number,
  //leftPicture: ElementRef,
  //rightPicture: ElementRef,
  text: ElementRef,
  backdrop: ElementRef,
  baseEl: any,
  searchCriteriaButtonRef: ElementRef<any>
) => {
  return new AnimationController()
    .create()
    .addElement([
      viewHeight,
      viewWidth,
      //leftPicture,
      //rightPicture,
      text,
      backdrop,
      baseEl,
    ])
    .addAnimation([
      //LeftPicAnimation(viewHeight, viewWidth, leftPicture),
      //RightPicAnimation(viewHeight, viewWidth, rightPicture),
      TextAnimation(text),
      BackAnimation(backdrop),
      SCButtonHideAnimation(searchCriteriaButtonRef, "ease-out", 500),
    ]);
};

export const CloseCatchAnimation = (
  viewHeight: number,
  viewWidth: number,
  //leftPicture: ElementRef,
  //rightPicture: ElementRef,
  text: ElementRef,
  backdrop: ElementRef,
  baseEl: any,
  searchCriteriaButtonRef: ElementRef<any>
) => {
  return new AnimationController()
    .create()
    .addElement([
      viewHeight,
      viewWidth,
      //leftPicture,
      //rightPicture,
      text,
      backdrop,
      baseEl,
    ])
    .addAnimation([
      //LeftPicAnimation(viewHeight, viewWidth, leftPicture),
      //RightPicAnimation(viewHeight, viewWidth, rightPicture),
      TextAnimation(text).direction("reverse"),
      BackAnimation(backdrop).direction("reverse"),
      SCButtonUnhideAnimation(searchCriteriaButtonRef, "ease-in", 500),
    ]);
};
