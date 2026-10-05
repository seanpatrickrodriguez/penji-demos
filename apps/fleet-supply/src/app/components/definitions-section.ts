import { ChangeDetectionStrategy, Component } from '@angular/core';
import { resolveFieldDefinitions, resolveFieldLabels, validateConfiguration } from '@penji-demos/record-engine';
import { StandardsExplorer } from '@penji-demos/ui';
import { CONFIGURATION } from '../state/fleet-store';
import { resolveAccessMatrix, resolveEntityViews, resolveWorkflowViews } from '../view/definitions-view';

const LABELS = resolveFieldLabels(CONFIGURATION);
const FIELDS = resolveFieldDefinitions(CONFIGURATION);

// The fleet's configuration bundle, exactly as it is defined.
@Component({
  selector: 'app-definitions-section',
  imports: [StandardsExplorer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './definitions-section.html',
  styleUrl: './definitions-section.scss',
})
export class DefinitionsSection {
  protected readonly configuration = CONFIGURATION;
  protected readonly labels = LABELS;
  protected readonly fields = FIELDS;
  protected readonly formTitles = Object.fromEntries(CONFIGURATION.forms.map((form) => [form.id, form.title]));
  protected readonly problems = validateConfiguration(CONFIGURATION);
  protected readonly entities = resolveEntityViews(CONFIGURATION);
  protected readonly access = resolveAccessMatrix(CONFIGURATION, LABELS, FIELDS);
  protected readonly workflows = resolveWorkflowViews(CONFIGURATION, LABELS, FIELDS);
  protected readonly json = JSON.stringify(CONFIGURATION, null, 2);
}
