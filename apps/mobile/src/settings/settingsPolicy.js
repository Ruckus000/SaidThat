export function motionAllowed({ motionOptIn, noMotion }) {
  return motionOptIn && !noMotion;
}
