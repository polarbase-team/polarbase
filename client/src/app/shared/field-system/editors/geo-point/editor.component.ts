import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoFocusModule } from 'primeng/autofocus';
import { InputTextModule } from 'primeng/inputtext';
import { KeyFilterModule } from 'primeng/keyfilter';
import { FluidModule } from 'primeng/fluid';
import { MessageModule } from 'primeng/message';

import { GeoPointField } from '@app/shared/field-system/models/geo-point/field.object';
import {
  GeoPointData,
  GeoPointPattern,
} from '@app/shared/field-system/models/geo-point/field.interface';
import { PointFormatPipe } from '@app/shared/field-system/pipes/point-format.pipe';
import { FieldEditorComponent } from '../editor.component';
import { convertToHtmlPattern } from '@app/core/utils';

@Component({
  selector: 'geo-point-field-editor',
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    AutoFocusModule,
    InputTextModule,
    KeyFilterModule,
    FluidModule,
    MessageModule,
    PointFormatPipe,
  ],
})
export class GeoPointFieldEditorComponent extends FieldEditorComponent<
  GeoPointField,
  GeoPointData
> {
  protected readonly geoPattern = convertToHtmlPattern(GeoPointPattern);
  protected readonly geoRegex: RegExp = /[0-9.,\s\-\(\)]/;
}
