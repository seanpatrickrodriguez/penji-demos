// A brand makes two strings with the same shape different types, so a
// participant ID can never be passed where a cohort ID is expected.
declare const brand: unique symbol;
export type Brand<T, Name extends string> = T & { readonly [brand]: Name };

// The union of a constants object's values: ValueOf<typeof SESSION_TYPE> is 'C' | 'CM' | ...
export type ValueOf<T> = T[keyof T];
