import { ChangeDetectionStrategy, Component, computed, input, viewChild } from '@angular/core';
import { FFlowModule, EFMarkerType, FCanvasComponent, FZoomDirective } from '@foblex/flow';
import { FormsModule } from '@angular/forms';
import { Point } from '@foblex/2d';

import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { TableDefinition } from '@app/features/base/studio/table/services/table.service';
import { TableComponent } from '../table/table.component';

@Component({
  selector: 'flow',
  templateUrl: './flow.component.html',
  styleUrl: './flow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, FFlowModule, ButtonModule, ToggleSwitchModule, TableComponent],
})
export class FlowComponent {
  tables = input<TableDefinition[]>();

  fCanvasComponent = viewChild(FCanvasComponent);
  fZoomDirective = viewChild(FZoomDirective);

  protected readonly eMarkerType = EFMarkerType;
  protected nodes = computed(() => {
    return this.tables().map((table, index) => ({
      id: table.name,
      data: table,
      position: this.getSpiralPosition(index),
    }));
  });
  protected connections = computed(() => {
    const links: { id: string; source: string; target: string }[] = [];
    this.nodes().forEach((node) => {
      const table = node.data;
      table.schema?.forEach((column) => {
        if (column.foreignKey) {
          links.push({
            id: `${table.name}-${column.name}-to-${column.foreignKey.table}`,
            source: `${table.name}-${column.name}`,
            target: `${column.foreignKey.table}-${column.foreignKey.column.name}`,
          });
        }
      });
    });
    return links;
  });
  protected usePresentationMode = true;

  zoomIn() {
    this.fZoomDirective()?.zoomIn();
  }

  zoomOut() {
    this.fZoomDirective()?.zoomOut();
  }

  fitToScreen() {
    this.fCanvasComponent()?.fitToScreen();
  }

  resetScaleAndCenter() {
    this.fCanvasComponent()?.resetScaleAndCenter();
  }

  protected onInitialized() {
    setTimeout(() => this.fCanvasComponent()?.fitToScreen(new Point(140, 140), false), 17);
  }

  private getSpiralPosition(index: number) {
    const phi = index * 0.75;
    const radius = 500 * Math.sqrt(index);

    return {
      x: Math.cos(phi) * radius,
      y: Math.sin(phi) * radius,
    };
  }
}
