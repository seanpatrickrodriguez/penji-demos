import { VALIDATION_SEVERITY } from '@penji-demos/constants';
import { ValidationSeverity } from '@penji-demos/types';

export const SEVERITY_LABEL: Readonly<Record<ValidationSeverity, string>> = {
  [VALIDATION_SEVERITY.ERROR]: 'Error',
  [VALIDATION_SEVERITY.WARNING]: 'Warning',
  [VALIDATION_SEVERITY.INFO]: 'Note',
};
