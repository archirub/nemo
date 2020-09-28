export function copyClassInstance<T>(object: T): T {
  const newObject: T = Object.assign(
    Object.create(Object.getPrototypeOf(object)),
    object
  );
  return newObject;
}
