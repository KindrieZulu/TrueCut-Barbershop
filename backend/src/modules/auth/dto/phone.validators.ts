import { registerDecorator, ValidationOptions } from 'class-validator';

// Permissive on purpose: AuthService.normalizePhone() accepts 0XXXXXXXXX,
// 263XXXXXXXXX and +263XXXXXXXXX shapes. This only rejects garbage input
// (wrong characters, absurd length), it does not re-implement that logic.
const PHONE_PATTERN = /^[0-9+\s()-]{6,20}$/;

export function IsPhoneLike(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneLike',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && PHONE_PATTERN.test(value);
        },
        defaultMessage() {
          return 'phone must be a valid phone number';
        },
      },
    });
  };
}
