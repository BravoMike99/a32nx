// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0
import {
  NXLogicPulseNode,
  NXLogicMemoryNode,
  NXLogicTriggeredMonostableNode,
  Arinc429Register,
  RegisteredSimVar,
  Arinc429WordData,
} from '@flybywiresim/fbw-sdk';
import { SimVarValueType, Subject } from '@microsoft/msfs-sdk';

export class FwsAutoCallouts {
  /** ROW/ROP Callouts **/
  private readonly rowRopStatusWord = Arinc429Register.empty();
  private readonly rowRopStatusWordVar = RegisteredSimVar.create('L:A32NX_ROW_ROP_WORD_1', SimVarValueType.Enum);

  // BRAKE MAX BRAKING
  private readonly pedalInputLeft = RegisteredSimVar.create('L:A32NX_LEFT_BRAKE_PEDAL_INPUT', SimVarValueType.Number);
  private readonly pedalInputRight = RegisteredSimVar.create('L:A32NX_RIGHT_BRAKE_PEDAL_INPUT', SimVarValueType.Number);
  private readonly phase10RowRopMtrig = new NXLogicTriggeredMonostableNode(4.5, false, true);
  public readonly brakeMaxBraking = Subject.create(false);
  // SET MAX REVERSE
  public readonly setMaxReverse = Subject.create(false);

  // KEEP MAX REVERSE
  private readonly keepMaxReverseMemory = new NXLogicMemoryNode(true);
  private readonly keepMaxReverseDownPulse = new NXLogicPulseNode(false);
  private readonly keepMaxReversePulse = new NXLogicPulseNode(true);
  public readonly keepMaxReverse = Subject.create(false);

  // RUNWAY TOO SHORT
  public readonly runwayTooShort = Subject.create(false);

  /** Radio height calculated from the radio altimeter. Used for auto callouts */
  private radioHeight: number | null = null;

  private readonly fmmdaVar = RegisteredSimVar.create('L:A32NX_FM1_DECISION_ALTITUDE', SimVarValueType.Enum);
  private readonly fmMda = Arinc429Register.empty();
  private readonly fmDhVar = RegisteredSimVar.create('L:A32NX_FM1_DECISION_HEIGHT', SimVarValueType.Enum);
  private readonly fmDh = Arinc429Register.empty();

  constructor() {}

  public update(
    deltaTime: number,
    flightPhase: number,
    maxReversePlayed: boolean,
    ra1: Arinc429WordData,
    ra2: Arinc429WordData,
    ra3: Arinc429WordData,
  ): void {
    this.updateRowRopWarnings(flightPhase, deltaTime, maxReversePlayed);
    this.radioAltitudeSelection(ra1, ra2, ra3);
  }

  private radioAltitudeSelection(ra1: Arinc429WordData, ra2: Arinc429WordData, ra3: Arinc429WordData) {
    const ra1Valid = !ra1.isInvalid();
    const ra2Valid = !ra2.isInvalid();
    const ra3Valid = !ra3.isInvalid();
    if (ra1Valid && ra2Valid && ra3Valid) {
      const highestRa = Math.max(ra1.value, ra2.value, ra3.value);
      const minimumRa = Math.min(ra1.value, ra2.value, ra3.value);
      // Get the middle value.
      this.radioHeight = ra1.value + ra2.value + ra3.value - highestRa - minimumRa;
    } else if (!ra1Valid && !ra2Valid && !ra3Valid) {
      this.radioHeight = null;
    } else {
      const firstValidRa = ra1Valid ? ra1 : ra2Valid ? ra2 : ra3;
      const secondValidRa = ra1Valid && ra2Valid ? ra2 : ra1Valid && ra3Valid ? ra3 : ra2Valid && ra3Valid ? ra3 : null;
      this.radioHeight = secondValidRa ? (firstValidRa.value + secondValidRa.value) / 2 : firstValidRa.valueOr(0);
    }
  }

  private updateMinimumsWarnings() {}

  updateRowRopWarnings(flightPhase: number, deltaTime: number, maxReversePlayed: boolean): void {
    this.rowRopStatusWord.set(this.rowRopStatusWordVar.get());
    const phase10RowRopMtrigOutput = this.phase10RowRopMtrig.write(flightPhase === 10, deltaTime);
    const rolloutOrBouncedLanding =
      flightPhase == 11 || flightPhase == 10 || (phase10RowRopMtrigOutput && (flightPhase === 8 || flightPhase === 9));

    // MAX BRAKING
    const maxBrakingRequested = this.rowRopStatusWord.bitValueOr(11, false);
    const maxBrakingSet = this.pedalInputLeft.get() > 90 || this.pedalInputRight.get() > 90;
    const brakeMaxBraking = maxBrakingRequested && !maxBrakingSet && rolloutOrBouncedLanding;
    this.brakeMaxBraking.set(brakeMaxBraking);

    // SET MAX REVERSE
    const maxReverseRequested = this.rowRopStatusWord.bitValueOr(12, false);
    this.setMaxReverse.set(maxReverseRequested && rolloutOrBouncedLanding && !brakeMaxBraking); //FIXME: Check reverser INOP

    // KEEP MAX REVERSE.
    const keepMaxReverse = this.rowRopStatusWord.bitValueOr(13, false) && !brakeMaxBraking && rolloutOrBouncedLanding; // FIXME: Check reverser INOP
    this.keepMaxReverse.set(
      this.keepMaxReverseMemory.write(
        this.keepMaxReversePulse.write(keepMaxReverse),
        this.keepMaxReverseDownPulse.write(keepMaxReverse) || maxReversePlayed,
      ),
    );

    // RUNWAY TOO SHORT
    this.runwayTooShort.set(flightPhase >= 8 && flightPhase <= 10 && this.rowRopStatusWord.bitValueOr(15, false));
  }
}
