// Copyright (c) 2024-2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0
import { ConsumerSubject, ConsumerValue, FSComponent, VNode } from '@microsoft/msfs-sdk';
import {
  CHECKLIST_OVERVIEW_ID,
  CHECKLIST_OVERVIEW_ID_TEXT,
  ChecklistLineStyle,
  deferredProcedureIds,
  DeferredProcedureType,
  EcamDeferredProcedures,
} from '../..//MsfsAvionicsCommon/EcamMessages';
import { WdAbstractChecklistComponent } from './WdAbstractChecklistComponent';
import {
  ProcedureLinesGenerator,
  ProcedureType,
  SPECIAL_INDEX_DEFERRED_PAGE_CLEAR,
} from '../../MsfsAvionicsCommon/EcamMessages/ProcedureLinesGenerator';

export class WdNormalChecklists extends WdAbstractChecklistComponent {
  private readonly checklists = ConsumerSubject.create(this.sub.on('fws_normal_checklists'), []);

  private readonly checklistId = ConsumerSubject.create(this.sub.on('fws_normal_checklists_id'), 0);

  private readonly activeDeferredProcedureId = ConsumerSubject.create(this.sub.on('fws_active_procedure'), '0');

  private readonly deferred = ConsumerSubject.create(this.sub.on('fws_deferred_procedures'), []);

  private readonly normalProcedures = ConsumerValue.create(this.sub.on('fws_normal_procedures'), []);

  /** ALL PHASES, TOP OF DESCENT, FOR APPROACH, FOR LANDING */
  private readonly hasDeferred = [false, false, false, false];

  /** ALL PHASES, TOP OF DESCENT, FOR APPROACH, FOR LANDING */
  private readonly deferredIsCompleted = [false, false, false, false];

  public updateChecklists() {
    this.lineData.length = 0;

    const checklists = this.checklists.get();

    const sorted = checklists
      .filter((v) => v.id !== CHECKLIST_OVERVIEW_ID_TEXT)
      .sort((a, b) => parseInt(a.id) - parseInt(b.id));
    const checklistId = this.checklistId.get();
    const clState = sorted.find((v) => parseInt(v.id) === checklistId) ?? null;

    // Status of deferred procedures
    this.hasDeferred[0] = this.deferred
      .get()
      .some((p) => EcamDeferredProcedures[p.id]?.type === DeferredProcedureType.ALL_PHASES);
    this.hasDeferred[1] = this.deferred
      .get()
      .some((p) => EcamDeferredProcedures[p.id]?.type === DeferredProcedureType.AT_TOP_OF_DESCENT);
    this.hasDeferred[2] = this.deferred
      .get()
      .some((p) => EcamDeferredProcedures[p.id]?.type === DeferredProcedureType.FOR_APPROACH);
    this.hasDeferred[3] = this.deferred
      .get()
      .some((p) => EcamDeferredProcedures[p.id]?.type === DeferredProcedureType.FOR_LANDING);

    this.deferredIsCompleted[0] = this.deferred
      .get()
      .every((p) => EcamDeferredProcedures[p.id]?.type === DeferredProcedureType.ALL_PHASES && p.procedureCompleted);
    this.deferredIsCompleted[1] = this.deferred
      .get()
      .every(
        (p) => EcamDeferredProcedures[p.id]?.type === DeferredProcedureType.AT_TOP_OF_DESCENT && p.procedureCompleted,
      );
    this.deferredIsCompleted[2] = this.deferred
      .get()
      .every((p) => EcamDeferredProcedures[p.id]?.type === DeferredProcedureType.FOR_APPROACH && p.procedureCompleted);
    this.deferredIsCompleted[3] = this.deferred
      .get()
      .every((p) => EcamDeferredProcedures[p.id]?.type === DeferredProcedureType.FOR_LANDING && p.procedureCompleted);

    const checklistsDefinition = this.normalProcedures.get();
    const clStateIntId = clState !== null ? parseInt(clState.id) : null;
    const clStateIndex =
      clStateIntId !== null ? checklistsDefinition.findIndex((proc) => proc.type === clStateIntId) : null;

    if (checklistId === CHECKLIST_OVERVIEW_ID) {
      // Render overview page
      this.lineData.push({
        activeProcedure: true,
        sensed: true,
        checked: false,
        text: 'CHECKLISTS',
        style: ChecklistLineStyle.Headline,
        firstLine: true,
        lastLine: false,
      });

      const overViewState = checklists.find((v) => v.id === CHECKLIST_OVERVIEW_ID_TEXT);

      sorted.forEach((state, index) => {
        const intCheckListId = parseInt(state.id);
        const checklistIndex = checklistsDefinition.findIndex((proc) => proc.type === intCheckListId);
        if (checklistIndex !== -1) {
          if (checklistsDefinition[checklistIndex]) {
            let lineStyle: ChecklistLineStyle;
            let checked = false;
            let display = true;
            const defferedIndex = deferredProcedureIds.findIndex((p) => p === intCheckListId);
            if (defferedIndex > -1) {
              checked = this.deferredIsCompleted[defferedIndex];
              display = this.hasDeferred[defferedIndex];
              lineStyle = state.procedureCompleted
                ? ChecklistLineStyle.CompletedDeferredProcedure
                : ChecklistLineStyle.DeferredProcedure;
            } else {
              lineStyle = state.procedureCompleted
                ? ChecklistLineStyle.CompletedChecklist
                : ChecklistLineStyle.ChecklistItem;
              checked = state.procedureCompleted ?? false;
              display = overViewState?.itemsToShow[index] ?? false; // Ignore checklist titles without any items to show e.g. departure change if disabled
            }

            if (display) {
              this.lineData.push({
                activeProcedure: true,
                sensed: true,
                checked: checked,
                text: checklistsDefinition[checklistIndex].title,
                style: lineStyle,
                firstLine: false,
                lastLine: index === sorted.length - 1,
                originalItemIndex: index,
              });
            }
          }
        } else {
          console.warn(`Checklist with id ${state.id} is not a valid normal checklist`);
        }
      });
      this.totalLines.set(sorted.length + this.hasDeferred.reduce((acc, val) => acc + (val ? 1 : 0), 0) + 1);
    } else if (
      clState !== null &&
      clStateIndex !== null &&
      clStateIndex !== -1 &&
      !deferredProcedureIds.includes(clStateIntId!)
    ) {
      const procGen = new ProcedureLinesGenerator(clState.id, true, ProcedureType.Normal, clState!);
      this.lineData.push(...procGen.toLineData());
    } else if (clState !== null && deferredProcedureIds.includes(clStateIntId!)) {
      // Deferred procedures
      this.lineData.push({
        activeProcedure: true,
        abnormalProcedure: true,
        sensed: true,
        checked: false,
        text: `${clState!.procedureCompleted ? '\x1b<7m' : '\x1b<4m'}${checklistsDefinition[clStateIndex!].title} \x1bm`,
        style: ChecklistLineStyle.Headline,
        firstLine: true,
        lastLine: false,
      });
      this.lineData.push({
        abnormalProcedure: true,
        activeProcedure: true,
        sensed: true,
        checked: false,
        text: '',
        style: ChecklistLineStyle.ChecklistItem,
        firstLine: false,
        lastLine: false,
      });

      const defferedIndex = deferredProcedureIds.indexOf(clStateIntId!);

      const currentDeferredType = defferedIndex !== -1 ? (defferedIndex as DeferredProcedureType) : null;
      const visibleDeferred = this.deferred
        .get()
        .filter((v) => currentDeferredType !== null && EcamDeferredProcedures[v.id].type === currentDeferredType);
      visibleDeferred.forEach((proc, index) => {
        const procGen = new ProcedureLinesGenerator(
          proc.id,
          this.activeDeferredProcedureId.map((id) => proc.id === id).get(),
          ProcedureType.Deferred,
          proc,
          undefined,
          undefined,
          undefined,
          undefined,
          index === visibleDeferred.length - 1,
        );
        this.lineData.push(...procGen.toLineData());
      });

      this.lineData.push({
        abnormalProcedure: true,
        activeProcedure: true,
        sensed: false,
        checked: false,
        text: `${'\xa0'.repeat(34)}CLEAR`,
        style: ChecklistLineStyle.ChecklistItem,
        firstLine: false,
        lastLine: true,
        originalItemIndex: SPECIAL_INDEX_DEFERRED_PAGE_CLEAR,
      });
    }
    super.updateChecklists();
  }

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.checklists.sub(() => this.updateChecklists(), true);
    this.checklistId.sub(() => this.updateChecklists(), true);
    this.deferred.sub(() => this.updateChecklists(), true);
    this.activeDeferredProcedureId.sub(() => this.updateChecklists());
  }

  // 17 lines
  render() {
    return super.render();
  }
}
