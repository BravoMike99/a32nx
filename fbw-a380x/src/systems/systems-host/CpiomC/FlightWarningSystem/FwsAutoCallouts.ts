// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0
import {
  NXLogicPulseNode,
  NXLogicMemoryNode,
  NXLogicTriggeredMonostableNode,
  Arinc429Register,
  RegisteredSimVar,
  Arinc429WordData,
  NXDataStore,
  LowPassFilter,
} from '@flybywiresim/fbw-sdk';
import { SimVarValueType, Subject } from '@microsoft/msfs-sdk';
import { A380X_DEFAULT_AUTO_CALL_OUTS, A380XAutoCallOutFlags } from '@shared/AutoCallOuts';

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

  // Auto callouts related stuff

  private autoCalloutPins: A380XAutoCallOutFlags;

  /** Radio height calculated from the radio altimeter. Used for auto callouts */
  private radioHeight: number | null = null;

  private readonly fmmdaVar = RegisteredSimVar.create('L:A32NX_FM1_DECISION_ALTITUDE', SimVarValueType.Enum);
  private readonly fmMda = Arinc429Register.empty();
  private readonly fmDhVar = RegisteredSimVar.create('L:A32NX_FM1_DECISION_HEIGHT', SimVarValueType.Enum);
  private readonly fmDh = Arinc429Register.empty();

  public readonly decisionHeight = Subject.create(false);

  public readonly minimum = Subject.create(false);

  public readonly hundredAbove = Subject.create(false);

  private heightIncreased = false;
  private readonly raLowPassFilter = new LowPassFilter(10);

  private readonly gpwsMtrig = new NXLogicTriggeredMonostableNode(2);
  private gpwsActive = false;

  private tcasAudio = false; // TODO
  private readonly tcasAudioMrtrigNode = new NXLogicTriggeredMonostableNode(5, true, true);

  private aboveFifty = false;

  private fourHundredTheshold = false;

  private threeHundredThreshold = false;

  private twoHundredThreshold = false;

  private oneHundredThreshold = false;

  private ninetyThreshold = false;

  private eightyThreshold = false;

  private seventyThreshold = false;

  private sixtyThreshold = false;

  private fiftyThreshold = false;

  private fortyThreshold = false;

  private thirtyThreshold = false;

  private twentyThreshold = false;

  private heightLessThanTwenty = false;

  private heightLessThanTen = false;

  private tenThreshold = false;

  private fiveThreshold = false;

  private heightLessThanThree = false;

  constructor() {
    NXDataStore.getAndSubscribeLegacy(
      'CONFIG_A380X_FWC_RADIO_AUTO_CALL_OUT_PINS',
      (k, v) => k === 'CONFIG_A380X_FWC_RADIO_AUTO_CALL_OUT_PINS' && (this.autoCalloutPins = Number(v)),
      A380X_DEFAULT_AUTO_CALL_OUTS.toString(),
    );
  }

  public update(
    deltaTime: number,
    flightPhase: number,
    maxReversePlayed: boolean,
    ra1: Arinc429WordData,
    ra2: Arinc429WordData,
    ra3: Arinc429WordData,
    gpws1AlertDiscreteWord2: Arinc429WordData,
    gpws2AlertDiscreteWord2: Arinc429WordData,
    adr1PressureAltitudeLeft: Arinc429WordData,
    adr3PressureAltitudeLeft: Arinc429WordData,
    adr2PressureAltitudeRight: Arinc429WordData,
    adr3PressureAltitudeRight: Arinc429WordData,
    adr3UsedLeft: boolean,
    adr3UsedRight: boolean,
  ): void {
    this.updateRowRopWarnings(flightPhase, deltaTime, maxReversePlayed);
    this.radioAltitudeSelection(ra1, ra2, ra3);
    this.computeThresholdsAndInhibitions(deltaTime, gpws1AlertDiscreteWord2, gpws2AlertDiscreteWord2);
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

  private updateMinimumsWarnings(
    adr1PressureAltitudeLeft: Arinc429WordData,
    adr3PressureAltitudeLeft: Arinc429WordData,
    adr2PressureAltitudeRight: Arinc429WordData,
    adr3PressureAltitudeRight: Arinc429WordData,
    adr3UsedLeft: boolean,
    adr3UsedRight: boolean,
  ) {
    const mda = this.fmMda.set(this.fmDhVar.get());
    const dh = this.fmDh.set(this.fmmdaVar.get());
    // Hundred above
    const leftAltitude = adr3UsedLeft ? adr3PressureAltitudeLeft.valueOr(0) : adr1PressureAltitudeLeft.valueOr(0);
    const hundredAboveMdaLeft = mda.isNormalOperation() && leftAltitude - mda.value >= 115;
    const rightAltitude = adr3UsedRight ? adr3PressureAltitudeRight.valueOr(0) : adr2PressureAltitudeRight.valueOr(0);
    const hundredAboveMdaRight = mda.isNormalOperation() && rightAltitude - mda.value >= 115;

    this.hundredAbove.set(hundredAboveMdaLeft || hundredAboveMdaRight);

    // Minimums
  }

  private computeThresholdsAndInhibitions(
    deltaTime: number,
    gpws1AlertDiscreteWord2: Arinc429WordData,
    gpws2AlertDiscreteWord2: Arinc429WordData,
  ) {
    const radioHeight = this.radioHeight ?? 0;
    this.aboveFifty = radioHeight > 50;
    this.fourHundredTheshold = radioHeight >= 400 && radioHeight < 410;
    this.threeHundredThreshold = radioHeight >= 300 && radioHeight < 310;
    this.twoHundredThreshold = radioHeight >= 200 && radioHeight < 210;
    this.oneHundredThreshold = radioHeight >= 100 && radioHeight < 110;
    this.ninetyThreshold = radioHeight >= 90 && radioHeight < 92;
    this.eightyThreshold = radioHeight >= 80 && radioHeight < 82;
    this.seventyThreshold = radioHeight >= 70 && radioHeight < 72;
    this.sixtyThreshold = radioHeight >= 60 && radioHeight < 62;
    this.fiftyThreshold = radioHeight >= 50 && radioHeight < 52;
    this.fortyThreshold = radioHeight >= 40 && radioHeight < 42;
    this.thirtyThreshold = radioHeight >= 30 && radioHeight < 32;
    this.twentyThreshold = radioHeight >= 20 && radioHeight < 22;
    this.heightLessThanTwenty = radioHeight < 22;
    this.heightLessThanTen = radioHeight < 12;
    this.tenThreshold = radioHeight >= 10 && radioHeight < 12;
    this.fiveThreshold = radioHeight >= 5 && radioHeight < 6;
    this.heightLessThanThree = radioHeight <= 3;
    this.heightIncreased = this.raLowPassFilter.step(radioHeight, deltaTime) > 0;

    const gpwsAlert = gpws1AlertDiscreteWord2.bitValueOr(12, false) || gpws2AlertDiscreteWord2.bitValueOr(12, false);
    const gpwsWarning = gpws1AlertDiscreteWord2.bitValueOr(13, false) || gpws2AlertDiscreteWord2.bitValueOr(13, false);
    const gpwsMtrig = this.gpwsMtrig.write(gpwsWarning || gpwsAlert, deltaTime);
    this.gpwsActive = gpwsWarning || gpwsAlert || gpwsMtrig;
  }

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
