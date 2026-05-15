import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isFutureOrToday', async: false })
export class IsFutureOrTodayConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;

    // Regex check for YYYY-MM-DD to avoid invalid date parsing
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return false;

    const inputDate = new Date(value);
    if (isNaN(inputDate.getTime())) return false;

    // Get current date in Asia/Ho_Chi_Minh (UTC+7)
    // We use Intl.DateTimeFormat to reliably get the date in the target timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // formatter.format(now) returns "YYYY-MM-DD" for en-CA locale
    const todayStr = formatter.format(new Date());

    // String comparison works perfectly for YYYY-MM-DD format
    return value >= todayStr;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be today or a future date (Asia/Ho_Chi_Minh timezone)`;
  }
}

/**
 * Custom validator to ensure a date string (YYYY-MM-DD) is today or in the future
 * based on Asia/Ho_Chi_Minh timezone.
 */
export function IsFutureOrToday(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureOrTodayConstraint,
    });
  };
}
