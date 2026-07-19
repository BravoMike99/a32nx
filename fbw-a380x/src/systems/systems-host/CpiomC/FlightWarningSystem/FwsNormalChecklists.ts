// Copyright (c) 2024-2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import {
  MappedSubject,
  MapSubject,
  SimVarValueType,
  Subject,
  SubscribableMapEventType,
  SubscribableMapFunctions,
  Subscription,
} from '@microsoft/msfs-sdk';
// FIXME should not import from instruments
import { ChecklistState, FwsEvents } from '../../../shared/src/publishers/FwsPublisher';
// FIXME circular import
import { FwsCore } from './FwsCore';
// FIXME should not import from instruments
import {
  EcamNormalProcedures,
  LINE_SEPARATOR_CHECKLIST_ITEM,
} from '../../../instruments/src/MsfsAvionicsCommon/EcamMessages/NormalProcedures';
// FIXME should not import from instruments
import {
  CHECKLIST_OVERVIEW_ID,
  CHECKLIST_OVERVIEW_ID_TEXT,
  ChecklistAction,
  ChecklistLineStyle,
  ChecklistSpecialItem,
  deferredProcedureIds,
  DeferredProcedureType,
  DEPARTURE_CHANGE_NORMAL_CHECKLIST_ID,
  EcamDeferredProcedures,
  getNormalChecklistProcedureIndex,
  NormalProcedure,
  NormalProcedureType,
  WD_NUM_LINES,
} from '../../../instruments/src/MsfsAvionicsCommon/EcamMessages';
// FIXME should not import from instruments
import {
  ProcedureLinesGenerator,
  ProcedureType,
  SPECIAL_INDEX_DEFERRED_PAGE_CLEAR,
} from '../../../instruments/src/MsfsAvionicsCommon/EcamMessages/ProcedureLinesGenerator';
import { NXLogicMemoryNode, RegisteredSimVar } from '@flybywiresim/fbw-sdk';
import { FwcFlightPhase } from './FwsFlightPhases';
import {
  A380XCustomNormalChecklistType,
  A380XCustomNormalChecklist,
  A380XCustomChecklistItemAction,
  A380xCustomNormalChecklistItem,
  A380XCustomChecklistSensedItemType,
  isActionItem,
  isHeadlineItem,
  isLineSeparatorItem,
} from './A380XCustomEcamDefinition';

export interface NormalEclSensedItems {
  /** Returns a boolean vector (same length as number of items). If true, item is marked as completed. If null, it's a non-sensed item */
  whichItemsChecked?: () => (boolean | null)[];
}

export class FwsNormalChecklists {
  private readonly sensedItems: Map<NormalProcedureType, NormalEclSensedItems> = new Map([
    [
      NormalProcedureType.COCKPIT_PREPARATION,
      {
        whichItemsChecked: () => [null, null, this.fws.seatBeltSwitchOn.get(), null],
      },
    ],
    [
      NormalProcedureType.BEFORE_START,
      {
        whichItemsChecked: () => [null, null, this.beaconLightSwitch.get()],
      },
    ],
    [
      NormalProcedureType.AFTER_START,
      {
        whichItemsChecked: () => [null, null, this.rudderTrimNeutralForTakeoff.get()],
      },
    ],
    [
      NormalProcedureType.TAXI_BEFORE_TAKEOFF,
      {
        whichItemsChecked: () => [
          null,
          null,
          null,
          false,
          this.fws.seatBeltSwitchOn.get(),
          this.fws.spoilersArmed,
          !this.fws.flapsNotToMemo,
          this.fws.autoBrakeRto,
          this.fws.toConfigNormal.get(),
        ],
      },
    ],
    [
      NormalProcedureType.LINE_UP,
      {
        whichItemsChecked: () => [null, null],
      },
    ],
    [
      NormalProcedureType.DEPARTURE_CHANGE,
      {
        whichItemsChecked: () => [null, null, null, null],
      },
    ],
    [NormalProcedureType.AFTER_TAKEOFF, {}],
    [
      NormalProcedureType.ALL_PHASES_DEFFERED_PROCEDURE,
      {
        whichItemsChecked: () => [],
      },
    ],
    [
      NormalProcedureType.BEFORE_TOD_DEFFERED_PROCEDURE,
      {
        whichItemsChecked: () => [],
      },
    ],
    [NormalProcedureType.DESCENT, {}],
    [
      NormalProcedureType.BEFORE_APPROACH_DEFFERED_PROCEDURE,
      {
        whichItemsChecked: () => [],
      },
    ],
    [
      NormalProcedureType.APPROACH,
      {
        whichItemsChecked: () => [null, this.fws.seatBeltSwitchOn.get(), null, null],
      },
    ],
    [
      NormalProcedureType.BEFORE_LANDING_DEFFERED_PROCEDURE,
      {
        whichItemsChecked: () => [],
      },
    ],
    [
      NormalProcedureType.LANDING,
      {
        whichItemsChecked: () => [
          false,
          this.fws.seatBeltSwitchOn.get(),
          this.fws.isAllGearDownlocked,
          this.fws.spoilersArmed,
          this.fws.flapsLeverInLandingConfiguration,
        ],
      },
    ],
    [
      NormalProcedureType.AFTER_LANDING,
      {
        whichItemsChecked: () => [null, this.fws.allEnginesMastersOff.get(), null, this.fws.allFuelPumpsOff.get()],
      },
    ],
    [
      NormalProcedureType.SECURE,
      {
        whichItemsChecked: () => [
          this.crewOxygenButtonPushed.get(),
          this.emergencyExitLightSwitch.get() === 2,
          null,
          null,
        ],
      },
    ],
  ]);

  public readonly checklistShown = Subject.create(false);

  public readonly showChecklistRequested = Subject.create(false);

  /** ID of checklist or 0 for overview */
  public readonly checklistId = Subject.create(CHECKLIST_OVERVIEW_ID);

  /** Marked with cyan box */
  public readonly selectedLine = Subject.create(0);

  /** For overflowing checklists */
  public readonly showFromLine = Subject.create(0);

  public readonly checklistState = MapSubject.create<number, ChecklistState>();

  private readonly pub = this.fws.bus.getPublisher<FwsEvents>();

  private readonly subscriptions: Subscription[] = [];

  /** ALL PHASES, TOP OF DESCENT, FOR APPROACH, FOR LANDING */
  private readonly hasDeferred = [false, false, false, false];

  /** ALL PHASES, TOP OF DESCENT, FOR APPROACH, FOR LANDING */
  private readonly deferredIsCompleted = [false, false, false, false];

  /** ID of active deferred procedure. null means no procedure is selected, but CLEAR at the end of the page is */
  public readonly activeDeferredProcedureId = Subject.create<string | null>(null);

  /** IDs of all visible deferred procedures. */
  public visibleDeferredProcedureKeys: string[] = [];

  private deferredProcedures: ProcedureLinesGenerator[] = [];

  private activeProcedure: ProcedureLinesGenerator | null = null;

  /** Whether the departure change checklist should be shown on the checklist list. Set to true between flightphases 3 and 10.
   * Is reset upon automatic checklist reset after flight, or, if flightcrew manually resets a subsequent checklist*/
  private readonly hideDepartureChangeFlipFlop = new NXLogicMemoryNode();

  private readonly beaconLightSwitch = RegisteredSimVar.createBoolean('A:LIGHT BEACON');

  private readonly emergencyExitLightSwitch = RegisteredSimVar.create(
    'L:XMLVAR_SWITCH_OVHD_INTLT_EMEREXIT_Position',
    SimVarValueType.Number,
  );

  private readonly crewOxygenButtonPushed = RegisteredSimVar.createBoolean('L:PUSH_OVHD_OXYGEN_CREW');

  private readonly rudderTrimNeutralForTakeoff = this.fws.rudderTrimPosition.map((v) => v < 0.35);

  private withinDepartureChangeFlightPhaseInhib = true;

  private departureChangeid: number | undefined = undefined;

  private defferedCruiseProcedureId = 0;

  private defferedTodProcedureId = 0;

  private defferedApproachProcedureId = 0;

  private defferedLandingProcedureId = 0;

  private readonly normalChecklistKeysSorted = Object.keys(NormalProcedureType)
    .map((v) => parseInt(v))
    .sort((a, b) => a - b);

  constructor(private fws: FwsCore) {
    this.initializeChecklistState();
    this.subscriptions.push(
      this.checklistState.sub(
        (
          map: ReadonlyMap<number, ChecklistState>,
          _type: SubscribableMapEventType,
          _key: number,
          _value: ChecklistState,
        ) => {
          this.sendNormalCheckListsToEventBus(map);
        },
      ),
    );

    this.subscriptions.push(
      this.checklistId.sub((id) => {
        const clState = this.checklistState.getValue(id);
        if (id !== 0 && deferredProcedureIds.indexOf(id) === -1 && clState) {
          const procGen = new ProcedureLinesGenerator(
            clState.id,
            true,
            ProcedureType.Normal,
            clState,
            (newState) => {
              this.checklistState.setValue(this.checklistId.get(), newState);
            },
            (newState) => {
              this.checklistState.setValue(this.checklistId.get(), newState);
              this.reset(this.normalChecklistKeysSorted.findIndex((v) => v === this.checklistId.get()));
            },
            (newState) => {
              this.showChecklistRequested.set(false);
              if (id === DEPARTURE_CHANGE_NORMAL_CHECKLIST_ID) {
                // If departure change checklist is completed.. reset it so all items are unchecked and title is blue.
                newState.procedureCompleted = false;
                for (let i = 0; i < newState.itemsChecked.length; i++) {
                  newState.itemsChecked[i] = false;
                }
              }
              this.checklistState.setValue(this.checklistId.get(), newState);
            },
          );
          this.activeProcedure = procGen;
          this.activeProcedure.selectedItemIndex.pipe(this.selectedLine);
        } else {
          const deffId = deferredProcedureIds.indexOf(id);
          if (deffId > -1) {
            this.deferredProcedures = [];
            const currentDeferredType = deffId as DeferredProcedureType;
            this.visibleDeferredProcedureKeys = Array.from(this.fws.activeDeferredProceduresList.get().values())
              .filter((v) => currentDeferredType !== null && EcamDeferredProcedures[v.id].type === currentDeferredType)
              .map((v) => v.id);

            if (this.visibleDeferredProcedureKeys.length === 0) {
              this.activeDeferredProcedureId.set(null);
              this.activeProcedure = null;
              return;
            }
            const firstProcedureKey = this.visibleDeferredProcedureKeys[0] ?? null;
            this.activeDeferredProcedureId.set(firstProcedureKey);
            this.visibleDeferredProcedureKeys.forEach((key) => {
              const proc = this.fws.activeDeferredProceduresList.getValue(key);
              if (proc) {
                const procGen = new ProcedureLinesGenerator(
                  proc.id,
                  this.activeDeferredProcedureId.map((id) => id === proc.id).get(),
                  ProcedureType.Deferred,
                  proc,
                  (newState) => {
                    this.fws.activeDeferredProceduresList.setValue(key, newState);
                  },
                  (newState) => {
                    // Handle procedure activation/deactivation
                    const whichItemsActive = this.fws.allEwdDeferredProcs[proc.id].whichItemsActive;
                    const deferredItemsActive = whichItemsActive
                      ? whichItemsActive()
                      : Array(this.fws.allEwdDeferredProcs[proc.id].whichItemsChecked().length).fill(
                          newState.procedureActivated,
                        );
                    newState.itemsActive = deferredItemsActive;
                    this.fws.activeDeferredProceduresList.setValue(key, newState);
                  },
                  (newState) => {
                    this.fws.activeDeferredProceduresList.setValue(key, newState);
                  },
                );
                this.deferredProcedures.push(procGen);
              }
            });

            this.activeProcedure = this.deferredProcedures[0];
            this.activeProcedure.selectedItemIndex.pipe(this.selectedLine);
          }
        }
        this.pub.pub('fws_normal_checklists_id', id, true);
      }, true),
    );

    this.subscriptions.push(
      this.fws.activeDeferredProceduresList.sub((map: ReadonlyMap<string, ChecklistState>) => {
        const flattened: ChecklistState[] = [];
        map.forEach((val, key) =>
          flattened.push({
            id: key,
            procedureCompleted: val.procedureCompleted,
            procedureActivated: val.procedureActivated,
            itemsChecked: val.itemsChecked,
            itemsActive: val.itemsActive,
            itemsToShow: val.itemsToShow,
          }),
        );
        this.pub.pub('fws_deferred_procedures', flattened, true);

        // If currently active deferred procedure was deleted, refresh page
        const activeProcedureId = this.activeDeferredProcedureId.get();
        if (activeProcedureId !== null && !map.has(activeProcedureId)) {
          this.checklistId.notify();
        }
      }),
    );

    this.subscriptions.push(
      this.activeDeferredProcedureId.sub((id) => {
        if (id !== null && this.deferredProcedures.find((v) => v.procedureId === id)) {
          this.activeProcedure = this.deferredProcedures.find((v) => v.procedureId === id) ?? null;
          this.activeProcedure?.selectedItemIndex.pipe(this.selectedLine);
          this.activeProcedure?.selectFirst();
        } else if (id === null) {
          this.selectedLine.set(SPECIAL_INDEX_DEFERRED_PAGE_CLEAR);
        }
      }),
    ),
      this.fws.flightPhase.sub((phase) => {
        if (phase !== 1) {
          this.fws.manualCheckListReset.set(false);
        }
        const wasDepartureChangeShown = !this.hideDepartureChangeFlipFlop.read();
        this.withinDepartureChangeFlightPhaseInhib =
          phase >= FwcFlightPhase.SecondEngineTakeOffPower && phase <= FwcFlightPhase.TouchDown;
        this.hideDepartureChangeFlipFlop.write(this.withinDepartureChangeFlightPhaseInhib, false);

        if (wasDepartureChangeShown && this.hideDepartureChangeFlipFlop.read()) {
          this.setDepartureChangeHidden(true);
        }
      }, true),
      MappedSubject.create(
        SubscribableMapFunctions.or(),
        this.fws.eng1Or2TakeoffPower,
        this.fws.eng3Or4TakeoffPower,
      ).sub((v) => {
        if (v) {
          this.reset(
            this.departureChangeid, // reset starting at departure change,
          );
        }
      });
  }

  publishInitialState() {
    this.pub.pub('fws_normal_checklists', [], true);
    this.pub.pub('fws_deferred_procedures', [], true);
  }

  selectFirst() {
    if (this.checklistId.get() === CHECKLIST_OVERVIEW_ID) {
      // Find first non-completed checklist
      const firstIncompleteChecklist = this.normalChecklistKeysSorted.findIndex(
        (key, index) =>
          this.checklistState.getValue(CHECKLIST_OVERVIEW_ID)?.itemsToShow[index] &&
          !this.checklistState.getValue(key)?.procedureCompleted,
      );
      this.selectedLine.set(firstIncompleteChecklist !== -1 ? firstIncompleteChecklist : 0);
    } else {
      this.activeProcedure?.selectFirst();
    }
  }

  moveUp() {
    if (this.checklistId.get() === CHECKLIST_OVERVIEW_ID) {
      const shownItems = this.normalChecklistKeysSorted
        .map((_, index) => (this.checklistState.getValue(CHECKLIST_OVERVIEW_ID)?.itemsToShow[index] ? index : null))
        .filter((v) => v !== null);
      this.selectedLine.set(Math.max(shownItems[shownItems.indexOf(this.selectedLine.get()) - 1] ?? 0, 0));
    } else if (deferredProcedureIds.includes(this.checklistId.get())) {
      const activeDeferredId = this.activeDeferredProcedureId.get();
      if (activeDeferredId !== null) {
        if (this.activeProcedure?.firstLineIsSelected()) {
          const curDefIndex = this.visibleDeferredProcedureKeys.indexOf(activeDeferredId);
          if (curDefIndex !== -1 && curDefIndex > 0) {
            this.activeDeferredProcedureId.set(this.visibleDeferredProcedureKeys[curDefIndex - 1] ?? null);
          }
        } else {
          this.activeProcedure?.moveUp();
        }
      } else {
        // CLEAR of page selected, select last procedure
        this.activeDeferredProcedureId.set(
          this.visibleDeferredProcedureKeys[this.visibleDeferredProcedureKeys.length - 1] ?? null,
        );
      }
    } else {
      this.activeProcedure?.moveUp();
    }
  }

  moveDown(skipCompletedSensed = true) {
    const activeDeferredId = this.activeDeferredProcedureId.get();
    if (this.checklistId.get() === CHECKLIST_OVERVIEW_ID) {
      const shownItems = this.normalChecklistKeysSorted
        .map((_, index) => (this.checklistState.getValue(CHECKLIST_OVERVIEW_ID)?.itemsToShow[index] ? index : null))
        .filter((v) => v !== null);
      this.selectedLine.set(
        Math.min(
          shownItems[shownItems.indexOf(this.selectedLine.get()) + 1] ?? shownItems[shownItems.length - 1],
          shownItems[shownItems.length - 1],
        ),
      );
    } else if (activeDeferredId !== null && this.activeProcedure?.lastLineIsSelected()) {
      const curDefIndex = this.visibleDeferredProcedureKeys.indexOf(activeDeferredId);
      if (curDefIndex !== -1) {
        this.activeDeferredProcedureId.set(
          curDefIndex < this.visibleDeferredProcedureKeys.length - 1
            ? this.visibleDeferredProcedureKeys[curDefIndex + 1]
            : null,
        );
      }
    } else if (this.activeProcedure) {
      this.activeProcedure.moveDown(skipCompletedSensed);
    }
  }

  /**
   * Resets normal checklist starting from the given index. If the index is not specified, all checklists are reset
   * @param fromId index to reset the checklist from. If undefined, all checklists are reset
   */
  reset(fromId?: number) {
    if (fromId !== -1) {
      const ids = this.normalChecklistKeysSorted;
      this.fws.manualCheckListReset.set(fromId !== undefined);

      // Show Departure change again if, checklist automatically reset or a manual checklist reset occurs on a previous CL.
      if (
        !this.withinDepartureChangeFlightPhaseInhib &&
        this.hideDepartureChangeFlipFlop.read() &&
        (fromId === undefined ||
          (fromId !== undefined && fromId < ids.findIndex((i) => i === DEPARTURE_CHANGE_NORMAL_CHECKLIST_ID)))
      ) {
        this.hideDepartureChangeFlipFlop.write(false, true);
        this.setDepartureChangeHidden(false);
      }
      for (let id = fromId === undefined ? 0 : fromId + 1; id < ids.length; id++) {
        const idFollowing = ids[id];
        const clFollowing = this.checklistState.getValue(idFollowing);
        const checkListIndex = getNormalChecklistProcedureIndex(idFollowing);
        const procFollowing =
          checkListIndex !== null && clFollowing !== undefined ? EcamNormalProcedures[checkListIndex] : null;
        if (procFollowing && clFollowing) {
          const clStateFollowing: ChecklistState = {
            id: idFollowing.toString(),
            procedureCompleted: false,
            procedureActivated: true,
            itemsChecked: [...clFollowing.itemsChecked].map((val, index) =>
              procFollowing.items[index].sensed ? val : false,
            ),
            itemsActive: clFollowing.itemsActive,
            itemsToShow: clFollowing.itemsToShow,
          };
          this.checklistState.setValue(idFollowing, clStateFollowing);
        }
      }
    }
  }

  navigateToChecklist(id: number) {
    this.checklistId.set(id);
    this.selectFirst();
  }

  navigateToParent() {
    if (this.checklistId.get() === 0) {
      this.showChecklistRequested.set(false);
    } else {
      this.navigateToChecklist(0);
    }
  }

  private scrollToSelectedLine() {
    this.showFromLine.set(Math.max(0, this.selectedLine.get() - WD_NUM_LINES + 2));
  }

  private checkIfDeferredAutoDisplay() {
    const approachCondition =
      this.fws.presentedAbnormalProceduresList.get().size === 0 &&
      this.fws.flightPhase.get() === 8 &&
      (this.fws.adrPressureAltitude.get() ?? 0) < 20_000 &&
      this.hasDeferred.some((v) => v) &&
      this.deferredIsCompleted.some((v) => !v);
    const triggerAutoDisplay =
      this.fws.approachAutoDisplayQnhSetPulseNode.read() || this.fws.approachAutoDisplaySlatsExtendedPulseNode.read();

    if (approachCondition && triggerAutoDisplay && !this.showChecklistRequested.get()) {
      this.showChecklistRequested.set(true);
      this.navigateToChecklist(CHECKLIST_OVERVIEW_ID);
    }
  }

  public openIfDeferredApplicable() {
    const deferredApplicable = this.hasDeferred.some((v) => v) && this.deferredIsCompleted.some((v) => !v);

    if (deferredApplicable && !this.showChecklistRequested.get()) {
      this.showChecklistRequested.set(true);
      this.navigateToChecklist(CHECKLIST_OVERVIEW_ID);
    }
  }

  update() {
    if (this.fws.clPulseNode.read()) {
      this.navigateToChecklist(CHECKLIST_OVERVIEW_ID);
      this.showChecklistRequested.set(!this.showChecklistRequested.get());
    }

    // Update deferred proc status
    for (let i = 0; i <= 3; i++) {
      this.hasDeferred[i] = false;
      this.deferredIsCompleted[i] = true;
    }
    this.fws.activeDeferredProceduresList.get().forEach((val) => {
      switch (EcamDeferredProcedures[val.id]?.type) {
        case DeferredProcedureType.ALL_PHASES:
          this.hasDeferred[0] = true;
          if (!val.procedureCompleted) {
            this.deferredIsCompleted[0] = false;
          }
          break;
        case DeferredProcedureType.AT_TOP_OF_DESCENT:
          this.hasDeferred[1] = true;
          if (!val.procedureCompleted) {
            this.deferredIsCompleted[1] = false;
          }
          break;
        case DeferredProcedureType.FOR_APPROACH:
          this.hasDeferred[2] = true;
          if (!val.procedureCompleted) {
            this.deferredIsCompleted[2] = false;
          }
          break;
        case DeferredProcedureType.FOR_LANDING:
          this.hasDeferred[3] = true;
          if (!val.procedureCompleted) {
            this.deferredIsCompleted[3] = false;
          }
          break;
      }
    });

    this.checkIfDeferredAutoDisplay();

    if (!this.checklistShown.get()) {
      return;
    }

    if (this.fws.clDownPulseNode.read()) {
      this.moveDown();
    }

    if (this.fws.clUpPulseNode.read()) {
      this.moveUp();
    }

    if (this.fws.clCheckPulseNode.read()) {
      if (this.checklistId.get() === CHECKLIST_OVERVIEW_ID) {
        // Navigate to check list
        this.navigateToChecklist(this.normalChecklistKeysSorted[this.selectedLine.get()]);
      } else if (
        deferredProcedureIds.includes(this.checklistId.get()) &&
        this.activeDeferredProcedureId.get() === null
      ) {
        this.navigateToChecklist(CHECKLIST_OVERVIEW_ID);
      } else if (this.activeProcedure) {
        this.activeProcedure.checkSelected();
      }
    }

    // Update sensed items
    const ids = this.normalChecklistKeysSorted;

    for (let id = 0; id < ids.length; id++) {
      let changed = false;
      const procId = ids[id];
      const cl = this.checklistState.getValue(procId);
      const idx = getNormalChecklistProcedureIndex(procId);
      const proc = idx !== null ? EcamNormalProcedures[idx] : null;

      if (cl && proc) {
        const deferredProcIndex = deferredProcedureIds.indexOf(procId);
        const procCompleted =
          deferredProcIndex !== -1 ? this.deferredIsCompleted[deferredProcIndex] : cl.procedureCompleted;
        const sensedResult = this.sensedItems.get(procId)?.whichItemsChecked?.();
        if (sensedResult) {
          const changedEntries = sensedResult.map((val, index) =>
            val !== null && val !== cl.itemsChecked[index] ? index : null,
          );
          if (changedEntries.some((v) => v !== null) || procCompleted !== cl.procedureCompleted) {
            changed = true;

            if (changedEntries.includes(this.selectedLine.get()) && sensedResult[this.selectedLine.get()]) {
              this.moveDown();
            }
          }

          const clState: ChecklistState = {
            id: procId.toString(),
            procedureCompleted: procCompleted,
            procedureActivated: cl.procedureActivated,
            itemsChecked: [...cl.itemsChecked].map((val, index) =>
              proc.items[index].sensed && sensedResult[index] != null ? sensedResult[index] : val,
            ),
            itemsActive: cl.itemsActive,
            itemsToShow: cl.itemsToShow,
          };
          if (changed) {
            this.checklistState.setValue(procId, clState);
          }
        }
      }
    }

    const overviewState = this.checklistState.getValue(CHECKLIST_OVERVIEW_ID);
    if (overviewState) {
      overviewState.itemsChecked[this.defferedCruiseProcedureId] = this.deferredIsCompleted[0];
      overviewState.itemsChecked[this.defferedTodProcedureId] = this.deferredIsCompleted[1];
      overviewState.itemsChecked[this.defferedApproachProcedureId] = this.deferredIsCompleted[2];
      overviewState.itemsChecked[this.defferedLandingProcedureId] = this.deferredIsCompleted[3];
      overviewState.itemsToShow[this.defferedCruiseProcedureId] = this.hasDeferred[0];
      overviewState.itemsToShow[this.defferedTodProcedureId] = this.hasDeferred[1];
      overviewState.itemsToShow[this.defferedApproachProcedureId] = this.hasDeferred[2];
      overviewState.itemsToShow[this.defferedLandingProcedureId] = this.hasDeferred[3];

      this.checklistState.setValue(CHECKLIST_OVERVIEW_ID, overviewState);
    }
  }

  destroy() {
    this.subscriptions.forEach((s) => s.destroy());
  }

  setDepartureChangeHidden(value: boolean) {
    const overviewState = this.checklistState.getValue(CHECKLIST_OVERVIEW_ID);
    if (overviewState) {
      if (this.departureChangeid !== undefined) {
        overviewState.itemsToShow[this.departureChangeid] = !value;
        this.checklistState.setValue(CHECKLIST_OVERVIEW_ID, overviewState);
        // If we are hiding the departure change implicitly transmit to event bus so change is received in the EWD.
        // Not required in case of showing checklist as the change will be transmitted due to other objects being mutated due to the reset.
        if (value) {
          this.sendNormalCheckListsToEventBus(this.checklistState.get());
        }
      } else {
        console.warn('Departure change checklist not found in overview checklist state');
      }
    }
  }

  private initializeChecklistState() {
    // Populate checklistState
    this.normalChecklistKeysSorted.forEach((k) => {
      const proc = EcamNormalProcedures[getNormalChecklistProcedureIndex(k)!] as NormalProcedure;
      this.checklistState.setValue(k, {
        id: k.toString(),
        procedureCompleted: false,
        procedureActivated: true,
        itemsChecked: proc !== undefined ? Array(proc.items.length).fill(false) : [],
        itemsActive: proc !== undefined ? Array(proc.items.length).fill(true) : [],
        itemsToShow: proc !== undefined ? Array(proc.items.length).fill(true) : [],
      });
    });

    const keysToHide: number[] = [];
    for (const key of this.normalChecklistKeysSorted) {
      if (this.sensedItems.get(key)?.whichItemsChecked === undefined) {
        keysToHide.push(key);
      }
    }

    // TODO check for error
    this.defferedTodProcedureId = this.normalChecklistKeysSorted.indexOf(
      NormalProcedureType.BEFORE_TOD_DEFFERED_PROCEDURE,
    );
    this.defferedCruiseProcedureId = this.normalChecklistKeysSorted.indexOf(
      NormalProcedureType.ALL_PHASES_DEFFERED_PROCEDURE,
    );
    this.defferedApproachProcedureId = this.normalChecklistKeysSorted.indexOf(
      NormalProcedureType.BEFORE_APPROACH_DEFFERED_PROCEDURE,
    );
    this.defferedLandingProcedureId = this.normalChecklistKeysSorted.indexOf(
      NormalProcedureType.BEFORE_LANDING_DEFFERED_PROCEDURE,
    );
    const departureChangeIndex = this.normalChecklistKeysSorted.indexOf(NormalProcedureType.DEPARTURE_CHANGE);
    this.departureChangeid = departureChangeIndex != -1 ? departureChangeIndex : undefined;

    // Checklists with no items are considered as hidden. This is to support cases where some checklists may not be present.
    const itemsToShow = this.normalChecklistKeysSorted.map((k) => !keysToHide.includes(k));

    this.checklistState.setValue(CHECKLIST_OVERVIEW_ID, {
      id: CHECKLIST_OVERVIEW_ID_TEXT,
      procedureCompleted: false,
      procedureActivated: true,
      itemsChecked: Array(this.normalChecklistKeysSorted.length).fill(false),
      itemsActive: Array(this.normalChecklistKeysSorted.length).fill(true),
      itemsToShow: itemsToShow,
    });

    this.subscriptions.push(this.selectedLine.sub(() => this.scrollToSelectedLine()));
    this.publishInitialState();
  }

  private sendNormalCheckListsToEventBus(map: ReadonlyMap<number, ChecklistState>) {
    const flattened: ChecklistState[] = [];
    map.forEach((val, key) =>
      flattened.push({
        id: key.toString(),
        procedureCompleted: val.procedureCompleted,
        procedureActivated: val.procedureActivated,
        itemsChecked: val.itemsChecked,
        itemsActive: val.itemsActive,
        itemsToShow: val.itemsToShow,
      }),
    );
    this.pub.pub('fws_normal_checklists', flattened, true);
  }

  private mapCustomSensedItemToFwsLogic(action: A380XCustomChecklistItemAction): () => boolean | null {
    if (action.sensed === undefined) {
      return () => null;
    } else {
      switch (action.sensed) {
        case A380XCustomChecklistSensedItemType.SEATBELTS_ON:
          return () => this.fws.seatBeltSwitchOn.get();
        case A380XCustomChecklistSensedItemType.SEATBELTS_OFF:
          return () => !this.fws.seatBeltSwitchOn.get();
        case A380XCustomChecklistSensedItemType.SIGNS_ON:
          return () => this.fws.signsOn.get();
        case A380XCustomChecklistSensedItemType.SIGNS_OFF:
          return () => !this.fws.signsOn.get();
        case A380XCustomChecklistSensedItemType.SIGNS_ON_OR_AUTO:
          return () => this.fws.signsOnOrAuto.get();
        case A380XCustomChecklistSensedItemType.SPOILERS_ARMED:
          return () => this.fws.spoilersArmed;
        case A380XCustomChecklistSensedItemType.SPOILERS_DISARMED:
          return () => !this.fws.spoilersArmed && !this.fws.speedBrakeCommand.get();
        case A380XCustomChecklistSensedItemType.AUTOBRAKE_RTO:
          return () => this.fws.autoBrakeRto;
        case A380XCustomChecklistSensedItemType.FLAPS_TO:
          return () => !this.fws.flapsNotToMemo;
        case A380XCustomChecklistSensedItemType.FLAPS_LDG:
          return () => this.fws.flapsLeverInLandingConfiguration;
        case A380XCustomChecklistSensedItemType.FLAPS_RETRACTED:
          return () => this.fws.flapLeverZero.get();
        case A380XCustomChecklistSensedItemType.FUEL_PUMPS_OFF:
          return () => this.fws.allFuelPumpsOff.get();
        case A380XCustomChecklistSensedItemType.ADIRS_NAV:
          return () => this.fws.ir1InNav && this.fws.ir2InNav && this.fws.ir3InNav;
        case A380XCustomChecklistSensedItemType.BEACON_ON:
          return () => this.beaconLightSwitch.get();
        case A380XCustomChecklistSensedItemType.APU_START:
          return () => this.fws.apuMasterSwitch && this.fws.apuStartSwitch;
        case A380XCustomChecklistSensedItemType.APU_BLEED_OFF:
          return () => !this.fws.apuBleedPbOn.get();
        case A380XCustomChecklistSensedItemType.APU_MASTER_OFF:
          return () => !this.fws.apuMasterSwitch;
        case A380XCustomChecklistSensedItemType.PACKS_ON:
          return () => this.fws.pack1On.get() && this.fws.pack2On.get();
        case A380XCustomChecklistSensedItemType.EMER_EXIT_LIGHTS_OFF:
          return () => this.emergencyExitLightSwitch.get() == 2;
        case A380XCustomChecklistSensedItemType.OXYGEN_OFF:
          return () => this.crewOxygenButtonPushed.get();
        case A380XCustomChecklistSensedItemType.ENGINES_OFF:
          return () => this.fws.allEnginesMastersOff.get();
        case A380XCustomChecklistSensedItemType.RUDDER_TRIM_NEUTRAL:
          return () => this.rudderTrimNeutralForTakeoff.get();
        case A380XCustomChecklistSensedItemType.ECAM_STS_NORMAL:
          return () => this.fws.ecamStatusNormal.get();
        case A380XCustomChecklistSensedItemType.ECAM_STS_NOT_NORMAL:
          return () => !this.fws.ecamStatusNormal.get();
        case A380XCustomChecklistSensedItemType.GEAR_UP:
          return () => !this.fws.gearSelectedUp.get();
        case A380XCustomChecklistSensedItemType.GEAR_DOWN:
          return () => this.fws.isAllGearDownlocked;
      }
    }
  }

  private buildCustomChecklistState(customCheclists: A380XCustomNormalChecklist[]): boolean {
    const presentChecklists: NormalProcedureType[] = [];
    for (const checklist of customCheclists) {
      // Checked items
      const type = FwsNormalChecklists.parseCustomChecklistTypeToNormalProcedureType(checklist.type);
      presentChecklists.push(type);
      // Build sensed items
      const itemsChecked = this.buildSensedItemsFromCustomChecklist(checklist.items);
      this.sensedItems.get(type)!.whichItemsChecked = itemsChecked;
      // Build the text definition
      const textDefinition = this.buildCheckListTextDefinition(checklist, type);
      if (!textDefinition) {
        return false;
      }
    }
    // Remove any checklists that are not present in the custom checklist definition
    for (const checklist of this.normalChecklistKeysSorted) {
      if (!presentChecklists.includes(checklist)) {
        this.sensedItems.get(checklist)!.whichItemsChecked = undefined;
      }
    }
    return true;
  }

  private buildCheckListTextDefinition(
    customCheclists: A380XCustomNormalChecklist,
    type: NormalProcedureType,
  ): NormalProcedure | null {
    const items: (ChecklistAction | ChecklistSpecialItem)[] = [];
    for (const item of customCheclists.items) {
      const mappedItem = this.mapCustomChecklistItemToNormalProcedureItem(item);
      if (mappedItem) {
        items.push(mappedItem);
      } else {
        return null;
      }
    }
    return {
      title: customCheclists.title,
      items: items,
      type: type,
    };
  }

  private buildSensedItemsFromCustomChecklist(items: A380xCustomNormalChecklistItem[]): () => (boolean | null)[] {
    return () => items.map((item) => (isActionItem(item) ? this.mapCustomSensedItemToFwsLogic(item)() : null));
  }

  private static parseCustomChecklistTypeToNormalProcedureType(
    type: A380XCustomNormalChecklistType,
  ): NormalProcedureType {
    switch (type) {
      case A380XCustomNormalChecklistType.COCKPIT_PREP:
        return NormalProcedureType.COCKPIT_PREPARATION;
      case A380XCustomNormalChecklistType.BEFORE_START:
        return NormalProcedureType.BEFORE_START;
      case A380XCustomNormalChecklistType.AFTER_START:
        return NormalProcedureType.AFTER_START;
      case A380XCustomNormalChecklistType.TAXI_BEFORE_TAKEOFF:
        return NormalProcedureType.TAXI_BEFORE_TAKEOFF;
      case A380XCustomNormalChecklistType.LINE_UP:
        return NormalProcedureType.LINE_UP;
      case A380XCustomNormalChecklistType.DEPARTURE_CHANGE:
        return NormalProcedureType.DEPARTURE_CHANGE;
      case A380XCustomNormalChecklistType.AFTER_TAKEOFF:
        return NormalProcedureType.AFTER_TAKEOFF;
      case A380XCustomNormalChecklistType.DESCENT:
        return NormalProcedureType.DESCENT;
      case A380XCustomNormalChecklistType.APPROACH:
        return NormalProcedureType.APPROACH;
      case A380XCustomNormalChecklistType.LANDING:
        return NormalProcedureType.LANDING;
      case A380XCustomNormalChecklistType.AFTER_LANDING:
        return NormalProcedureType.AFTER_LANDING;
      case A380XCustomNormalChecklistType.PARKING:
        return NormalProcedureType.PARKING;
      case A380XCustomNormalChecklistType.SECURE:
        return NormalProcedureType.SECURE;
    }
  }

  private mapCustomChecklistItemToNormalProcedureItem(
    item: A380xCustomNormalChecklistItem,
  ): ChecklistAction | ChecklistSpecialItem | null {
    if (isActionItem(item)) {
      return {
        name: item.name,
        sensed: item.sensed !== undefined,
        labelNotCompleted: item.labelNotCompleted,
        labelCompleted: item.labelCompleted,
        level: item.subLevel ? 1 : 0,
        colonIfCompleted: item.colonIfCompleted ?? true,
      };
    } else if (isLineSeparatorItem(item)) {
      return LINE_SEPARATOR_CHECKLIST_ITEM;
    } else if (isHeadlineItem(item)) {
      return {
        name: item.name,
        style: ChecklistLineStyle.SubHeadline,
        sensed: true,
      };
    } else {
      console.warn('Unknown custom checklist item type', item);
      return null;
    }
  }
}
