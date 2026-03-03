import "reflect-metadata";

export const IS_PUBLIC = "isPublic";

export function Public() {
  /**
   * @param {any} target
   * @param {string} propertyKey
   * @param {PropertyDescriptor} _descriptor
   */
  return function (target, propertyKey, _descriptor) {
    Reflect.defineMetadata(IS_PUBLIC, true, target.constructor, propertyKey);
  };
}
