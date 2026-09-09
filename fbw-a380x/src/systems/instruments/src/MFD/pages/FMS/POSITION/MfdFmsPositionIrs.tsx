// Copyright (c) 2024-2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0
import {
  ClockEvents,
  ConsumerSubject,
  FSComponent,
  LifecycleComponent,
  MappedSubject,
  Subject,
  VNode,
} from '@microsoft/msfs-sdk';

import './MfdFmsPositionIrs.scss';
import { AbstractMfdPageProps } from '../../../MFD';
import { Footer } from '../../common/Footer';

import { Button } from '../../../../MsfsAvionicsCommon/UiWidgets/Button';
import { InputField } from '../../../../MsfsAvionicsCommon/UiWidgets/InputField';
import { HeadingFormat } from '../../common/DataEntryFormats';
import { coordinateToString } from '@flybywiresim/fbw-sdk';
import { noPositionAvailableText, showReturnButtonUriExtra } from '../../../shared/utils';
import { IrsStatus, PositionIrsEvents, PositionPageIrEvents } from '../../../FMC/PositionIrsPageEvents';
import { Coordinates } from '@fmgc/flightplanning/data/geo';

interface MfdFmsPositionIrsProps extends AbstractMfdPageProps {}

enum IrsDataFor {
  NONE = 0,
  IRS_1 = 1,
  IRS_2 = 2,
  IRS_3 = 3,
}

export class MfdFmsPositionIrs extends LifecycleComponent<MfdFmsPositionIrsProps> {
  private readonly returnButtonVisible = this.props.mfd.uiService.activeUri.get().extra === showReturnButtonUriExtra;
  private static readonly fourDigitsValueNotAvailble = '---.-';
  private static readonly ThreeDigitsValueNotAvailble = '---';

  private readonly sub = this.props.bus.getSubscriber<PositionIrsEvents>();

  private readonly adirsAlignmentPosition = ConsumerSubject.create(this.sub.on('adirs_alignment_position'), null);
  private readonly adirsAligmentMode = ConsumerSubject.create(this.sub.on('adirs_alignment_mode'), null);
  private readonly ir1Status = ConsumerSubject.create(this.sub.on('ir1_status'), IrsStatus.INVALID);
  private readonly ir2Status = ConsumerSubject.create(this.sub.on('ir1_status'), IrsStatus.INVALID);
  private readonly ir3Status = ConsumerSubject.create(this.sub.on('ir1_status'), IrsStatus.INVALID);
  private readonly ir1TimeToAlign = ConsumerSubject.create(this.sub.on('ir1_time_to_align'), null);
  private readonly ir2TimeToAlign = ConsumerSubject.create(this.sub.on('ir2_time_to_align'), null);
  private readonly ir3TimeToAlign = ConsumerSubject.create(this.sub.on('ir3_time_to_align'), null);
  private readonly ir1StatusMessage = ConsumerSubject.create(this.sub.on('ir1_status_message'), null);
  private readonly ir2StatusMessage = ConsumerSubject.create(this.sub.on('ir2_status_message'), null);
  private readonly ir3StatusMessage = ConsumerSubject.create(this.sub.on('ir3_status_message'), null);

  private readonly irCoordinates: ConsumerSubject<Coordinates | null> = ConsumerSubject.create(null, null);
  private readonly irStatus: ConsumerSubject<IrsStatus> = ConsumerSubject.create(null, 'INVALID');
  private readonly irTimeToALign: ConsumerSubject<number | null> = ConsumerSubject.create(null, null);
  private readonly irTrueTrack: ConsumerSubject<number | null> = ConsumerSubject.create(null, null);
  private readonly irGroundSpeed: ConsumerSubject<number | null> = ConsumerSubject.create(null, null);
  private readonly irTrueWindDirection: ConsumerSubject<number | null> = ConsumerSubject.create(null, null);
  private readonly irTrueWindSpeed: ConsumerSubject<number | null> = ConsumerSubject.create(null, null);
  private readonly irTrueHeading: ConsumerSubject<number | null> = ConsumerSubject.create(null, null);
  private readonly irMagneticHeading: ConsumerSubject<number | null> = ConsumerSubject.create(null, null);
  private readonly irMagneticVariation: ConsumerSubject<number | null> = ConsumerSubject.create(null, null);
  private readonly irAlignmentPosition: ConsumerSubject<Coordinates | null> = ConsumerSubject.create(null, null);
  private readonly irAlignmentMode: ConsumerSubject<string | null> = ConsumerSubject.create(null, null);
  private readonly gpirsCoordinates: ConsumerSubject<Coordinates | null> = ConsumerSubject.create(null, null);
  private readonly gpirsPositionAccuracy: ConsumerSubject<number | null> = ConsumerSubject.create(null, null);
  private readonly gpirsAccuracyIsMeters: ConsumerSubject<boolean | null> = ConsumerSubject.create(null, false);

  private readonly alignmentLabel = Subject.create<string>('----');

  private readonly alignmentPosition = Subject.create<string>('---');

  private readonly alignOnOtherRefDisabled = Subject.create<boolean>(true);

  private readonly irs1SecondColumn = this.ir1TimeToAlign
    .map((v) => (v !== null ? MfdFmsPositionIrs.alignDurationLeft(v) : ''))
    .withLifecycle(this.defaultLifecycle);

  private readonly irs2SecondColumn = this.ir2TimeToAlign
    .map((v) => (v !== null ? MfdFmsPositionIrs.alignDurationLeft(v) : ''))
    .withLifecycle(this.defaultLifecycle);

  private readonly irs3SecondColumn = this.ir3TimeToAlign
    .map((v) => (v !== null ? MfdFmsPositionIrs.alignDurationLeft(v) : ''))
    .withLifecycle(this.defaultLifecycle);

  private readonly setHdgDivRef = FSComponent.createRef<HTMLDivElement>();

  private readonly setHdgValue = Subject.create<number | null>(null);

  private readonly irsDataRef = FSComponent.createRef<HTMLDivElement>();

  private readonly showIrsDataFor = Subject.create<IrsDataFor>(IrsDataFor.IRS_1);

  private readonly irs1DataVisible = Subject.create<boolean>(false);

  private readonly irs2DataVisible = Subject.create<boolean>(false);

  private readonly irs3DataVisible = Subject.create<boolean>(false);

  private readonly irsDataFreezeButtonDisabled = Subject.create(true);

  private readonly irsDataPosition = this.irCoordinates
    .map((v) => (v !== null ? coordinateToString(v, false) : noPositionAvailableText))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataTrueTrack = this.irTrueTrack
    .map((v) => (v != null ? v.toFixed(1) : MfdFmsPositionIrs.fourDigitsValueNotAvailble))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataTrueTrackUnitVisiblity = this.irTrueTrack
    .map((v) => (v !== null ? 'visible' : 'hidden'))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataGroundSpeed = this.irGroundSpeed
    .map((v) => (v !== null ? v.toFixed(0) : MfdFmsPositionIrs.ThreeDigitsValueNotAvailble))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataGroundSpeedUnitVisiblity = this.irsDataGroundSpeed
    .map((v) => (v !== null ? 'visible' : 'hidden'))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataTrueWindDirection = this.irTrueWindDirection
    .map((v) => (v !== null ? v.toFixed(0) : MfdFmsPositionIrs.ThreeDigitsValueNotAvailble))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataWindDirectionUnitVisiblity = this.irTrueWindDirection
    .map((v) => (v !== null ? 'visible' : 'hidden'))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataTrueWindSpeed = this.irTrueWindSpeed
    .map((v) => '/' + (v !== null ? +v.toFixed(0).padStart(3, '0') : MfdFmsPositionIrs.ThreeDigitsValueNotAvailble))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataWindSpeedUnitVisiblity = this.irTrueWindSpeed
    .map((v) => (v !== null ? 'visible' : 'hidden'))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataTrueHeading = this.irTrueHeading
    .map((v) => (v !== null ? v.toFixed(1) : MfdFmsPositionIrs.fourDigitsValueNotAvailble))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataTrueHeadingUnitvisiblity = this.irsDataTrueHeading
    .map((v) => (v !== null ? 'visible' : 'hidden'))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataMagneticHeading = this.irMagneticHeading
    .map((v) => (v !== null ? v.toFixed(1) : MfdFmsPositionIrs.fourDigitsValueNotAvailble))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataMagneticHeadingUnitvisiblity = this.irMagneticHeading
    .map((v) => (v !== null ? v.toFixed(1) : MfdFmsPositionIrs.fourDigitsValueNotAvailble))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataMagneticVariation = this.irMagneticVariation
    .map((v) => (v !== null ? v.toFixed(1) : '-.-'))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataMagneticVariationUnit = this.irMagneticVariation
    .map((v) => (v !== null ? `${v > 0 ? '°W' : '°E'}` : '\xa0\xa0'))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsDataGpirsPosition = this.gpirsCoordinates
    .map((v) => (v !== null ? coordinateToString(v, false) : noPositionAvailableText))
    .withLifecycle(this.defaultLifecycle);

  private readonly gpirsDataAccuracy = this.gpirsPositionAccuracy
    .map((v) => (v !== null ? v : '---'))
    .withLifecycle(this.defaultLifecycle);
  private readonly gpirsUnit = this.gpirsAccuracyIsMeters
    .map((v) => (v !== null ? (v ? 'M\xa0' : 'FT') : '\xa0\xa0'))
    .withLifecycle(this.defaultLifecycle);

  private readonly irsAreAligned = MappedSubject.create(
    ([ir1, ir2, ir3]) => ir1 === 'NAV' && ir2 === 'NAV' && ir3 === 'NAV',
    this.ir1Status,
    this.ir2Status,
    this.ir3Status,
  ).withLifecycle(this.defaultLifecycle);

  private readonly irsAreAligning = MappedSubject.create(
    ([ir1, ir2, ir3]) => ir1 === 'ALIGN' || ir2 === 'ALIGN' || ir3 === 'ALIGN',
    this.ir1Status,
    this.ir2Status,
    this.ir3Status,
  ).withLifecycle(this.defaultLifecycle);

  private static alignDurationLeft(ttn: number): string {
    if (ttn !== null) {
      return `AVAIL IN ${ttn >= 7 ? '\u003e' : ''}${ttn} MIN`;
    }
    return '';
  }

  private changeIrsData(showDataFor: IrsDataFor) {
    if (showDataFor !== IrsDataFor.NONE) {
      this.irCoordinates.setConsumer(this.sub.on(`coordinates_${showDataFor}`));
      this.irStatus.setConsumer(this.sub.on(`status_${showDataFor}`));
      this.irTimeToALign.setConsumer(this.sub.on(`time_to_align_${showDataFor}`));
      this.irGroundSpeed.setConsumer(this.sub.on(`ground_speed_${showDataFor}`));
      this.irTrueWindDirection.setConsumer(this.sub.on(`true_wind_direction_${showDataFor}`));
      this.irTrueWindSpeed.setConsumer(this.sub.on(`true_wind_speed_${showDataFor}`));
      this.irTrueHeading.setConsumer(this.sub.on(`magnetic_variation_${showDataFor}`));
      this.irAlignmentPosition.setConsumer(this.sub.on(`alignment_position_${showDataFor}`));
      this.irAlignmentMode.setConsumer(this.sub.on(`alignment_mode_${showDataFor}`));
      this.gpirsCoordinates.setConsumer(this.sub.on(`gpirs_coordinates_${showDataFor}`));
      this.gpirsPositionAccuracy.setConsumer(this.sub.on(`gpirs_position_accuracy_${showDataFor}`));
    }

    this.irs1DataVisible.set(showDataFor === IrsDataFor.IRS_1);
    this.irs2DataVisible.set(showDataFor === IrsDataFor.IRS_2);
    this.irs3DataVisible.set(showDataFor === IrsDataFor.IRS_3);
    this.irsDataRef.instance.style.visibility = showDataFor === IrsDataFor.NONE ? 'hidden' : 'visible';
  }

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    const sub = this.props.bus.getSubscriber<ClockEvents & PositionPageIrEvents>();
    this.subs.push(this.showIrsDataFor.sub((v) => this.changeIrsData(v), true));

    this.subs.push(
      MappedSubject.create(
        ([irInAlign, irAligned, pos, mode]) => {
          this.alignmentLabel.set(
            mode !== null && (irInAlign || irAligned) ? `IRS ${irInAlign ? 'ALIGNING' : 'ALIGNED'} ON ${mode} POS` : '',
          );
          this.alignmentPosition.set(pos !== null ? coordinateToString(pos, false) : '');
        },
        this.irsAreAligning,
        this.irsAreAligned,
        this.adirsAlignmentPosition,
        this.adirsAligmentMode,
      ),
    );

    this.subs.push(this.irsAreAligned);

    this.setHdgDivRef.instance.style.visibility = 'hidden';
  }

  render(): VNode {
    return (
      <>
        {/* begin page content */}
        <div class="mfd-page-container">
          <div class="fr" style="margin: 15px;">
            <div style="flex: 1; display: flex; justify-content: center; align-items: center;">
              <span class="mfd-value bigger">{this.alignmentLabel}</span>
            </div>
            <div style="flex: 1 display: flex; justify-content: center; align-items: center;">
              <span class="mfd-value bigger">{this.alignmentPosition}</span>
            </div>
          </div>
          <div class="fr" style="padding-bottom: 20px; border-bottom: 2px solid lightgrey;">
            <Button disabled={this.alignOnOtherRefDisabled} label="ALIGN ON<br />OTHER REF" onClick={() => {}} />
          </div>
          <div class="fr" style="margin-top: 40px;">
            <div class="mfd-position-irs-table-col1">
              <span class="mfd-label">IRS 1</span>
            </div>
            <div class="mfd-position-irs-table-col2">
              <span class="mfd-value bigger">{this.ir1Status}</span>
            </div>
            <div class="mfd-position-irs-table-col3">
              <span class="mfd-value">{this.irs1SecondColumn}</span>
            </div>
            <div class="mfd-position-irs-table-col4">
              <span class="mfd-value">{this.ir1StatusMessage}</span>
            </div>
          </div>
          <div class="fr">
            <div class="mfd-position-irs-table-col1">
              <span class="mfd-label">IRS 2</span>
            </div>
            <div class="mfd-position-irs-table-col2">
              <span class="mfd-value bigger">{this.ir2Status}</span>
            </div>
            <div class="mfd-position-irs-table-col3">
              <span class="mfd-value">{this.irs2SecondColumn}</span>
            </div>
            <div class="mfd-position-irs-table-col4">
              <span class="mfd-value">{this.ir2StatusMessage}</span>
            </div>
          </div>
          <div class="fr">
            <div class="mfd-position-irs-table-col1 mfd-position-irs-table-last-row">
              <span class="mfd-label">IRS 3</span>
            </div>
            <div class="mfd-position-irs-table-col2 mfd-position-irs-table-last-row">
              <span class="mfd-value bigger">{this.ir3Status}</span>
            </div>
            <div class="mfd-position-irs-table-col3 mfd-position-irs-table-last-row">
              <span class="mfd-value">{this.irs3SecondColumn}</span>
            </div>
            <div class="mfd-position-irs-table-col4 mfd-position-irs-table-last-row">
              <span class="mfd-value">{this.ir3StatusMessage}</span>
            </div>
          </div>
          <div
            ref={this.setHdgDivRef}
            class="fr"
            style="justify-content: flex-end; align-items: center; margin-top: 10px; margin-bottom: 20px;"
          >
            <span class="mfd-label">SET HDG</span>
            <InputField<number>
              dataEntryFormat={new HeadingFormat()}
              value={this.setHdgValue}
              mandatory={Subject.create(true)}
              alignText="flex-end"
              containerStyle="width: 150px; margin-left: 10px;"
              errorHandler={(e) => this.props.fmcService.master.showFmsErrorMessage(e.type, e.details)}
              hEventConsumer={this.props.mfd.hEventConsumer}
              interactionMode={this.props.mfd.interactionMode}
            />
          </div>
          <div class="mfd-position-irs-irs-button-row">
            <Button
              label="IRS1"
              onClick={() => this.showIrsDataFor.set(this.irs1DataVisible.get() ? IrsDataFor.NONE : IrsDataFor.IRS_1)}
              selected={this.irs1DataVisible}
              buttonStyle="width: 150px; margin-right: 3px;"
            />
            <Button
              label="IRS2"
              onClick={() => this.showIrsDataFor.set(this.irs2DataVisible.get() ? IrsDataFor.NONE : IrsDataFor.IRS_2)}
              selected={this.irs2DataVisible}
              buttonStyle="width: 150px; margin-right: 3px;"
            />
            <Button
              label="IRS3"
              onClick={() => this.showIrsDataFor.set(this.irs3DataVisible.get() ? IrsDataFor.NONE : IrsDataFor.IRS_3)}
              selected={this.irs3DataVisible}
              buttonStyle="width: 150px;"
            />
          </div>
          <div ref={this.irsDataRef} class="fc" style="border: 2px outset lightgrey; padding: 2px 15px 15px 15px;">
            <div class="fr" style="justify-content: space-between; margin-bottom: 15px;">
              <div style="align-self: flex-start;">
                <Button disabled={this.irsDataFreezeButtonDisabled} label="FREEZE<br />ALL IRS" onClick={() => {}} />
              </div>
              <div style="align-self: flex-end;">
                <span class="mfd-label" style="margin-right: 20px;">
                  POSITION
                </span>
                <span class="mfd-value bigger">{this.irsDataPosition}</span>
              </div>
            </div>
            <div class="fr">
              <div style="flex: 1; display: flex; justify-content: flex-end; align-items: center; padding: 7px;">
                <span class="mfd-label">T.TRK</span>
              </div>
              <div class="mfd-label-value-container" style="flex: 1.5; justify-content: flex-end; align-items: center;">
                <span class="mfd-value bigger">{this.irsDataTrueTrack}</span>
                <span
                  class="mfd-label-unit mfd-unit-trailing"
                  style={{ visibility: this.irsDataTrueTrackUnitVisiblity }}
                >
                  °T
                </span>
              </div>
              <div style="flex: 1; display: flex; justify-content: flex-end; align-items: center; padding: 7px;">
                <span class="mfd-label">T.HDG</span>
              </div>
              <div class="mfd-label-value-container" style="flex: 1; justify-content: flex-end;">
                <span class="mfd-value bigger">{this.irsDataTrueHeading}</span>
                <span
                  class="mfd-label-unit mfd-unit-trailing"
                  style={{ visibility: this.irsDataTrueHeadingUnitvisiblity }}
                >
                  °T
                </span>
              </div>
            </div>
            <div class="fr">
              <div style="flex: 1; display: flex; justify-content: flex-end; align-items: center; padding: 7px;">
                <span class="mfd-label">GND SPD</span>
              </div>
              <div class="mfd-label-value-container" style="flex: 1.5; justify-content: flex-end;">
                <span class="mfd-value bigger">{this.irsDataGroundSpeed}</span>
                <span
                  class="mfd-label-unit mfd-unit-trailing"
                  style={{ visibility: this.irsDataGroundSpeedUnitVisiblity }}
                >
                  KT
                </span>
              </div>
              <div style="flex: 1; display: flex; justify-content: flex-end; align-items: center; padding: 7px;">
                <span class="mfd-label">MAG HDG</span>
              </div>
              <div class="mfd-label-value-container" style="flex: 1; justify-content: flex-end;">
                <span class="mfd-value bigger">{this.irsDataMagneticHeading}</span>
                <span
                  class="mfd-label-unit mfd-unit-trailing"
                  style={{ visibility: this.irsDataMagneticHeadingUnitvisiblity }}
                >
                  °{'\xa0'}
                </span>
              </div>
            </div>
            <div class="fr" style="border-bottom: 2px solid lightgrey; margin-bottom: 15px;">
              <div style="flex: 1; display: flex; justify-content: flex-end; align-items: center; padding: 7px;">
                <span class="mfd-label">T.WIND</span>
              </div>
              <div class="mfd-label-value-container" style="flex: 1.5; justify-content: flex-end;">
                <span class="mfd-value bigger">{this.irsDataTrueWindDirection}</span>
                <span
                  class="mfd-label-unit mfd-unit-trailing"
                  style={{ visibility: this.irsDataWindDirectionUnitVisiblity }}
                >
                  °
                </span>
                <span class="mfd-value bigger">{this.irsDataTrueWindSpeed}</span>
                <span
                  class="mfd-label-unit mfd-unit-trailing"
                  style={{ visibility: this.irsDataWindSpeedUnitVisiblity }}
                >
                  KT
                </span>
              </div>
              <div style="flex: 1; display: flex; justify-content: flex-end; align-items: center; padding: 7px;">
                <span class="mfd-label">MAG VAR</span>
              </div>
              <div class="mfd-label-value-container" style="flex: 1; justify-content: flex-end;">
                <span class="mfd-value bigger">{this.irsDataMagneticVariation}</span>
                <span class="mfd-label-unit mfd-unit-trailing">{this.irsDataMagneticVariationUnit}</span>
              </div>
            </div>
            <div class="fc" style="display: flex; align-items: flex-end; padding-right: 15px;">
              <div class="mfd-label-value-container">
                <span class="mfd-label mfd-spacing-right">GPIRS POSITION</span>
                <span class="mfd-value bigger" style="width: 325px;">
                  {this.irsDataGpirsPosition}
                </span>
              </div>
              <div class="mfd-label-value-container">
                <span class="mfd-label mfd-spacing-right">ACCURACY</span>
                <span class="mfd-value bigger" style="width: 300px; text-align: right;">
                  {this.gpirsDataAccuracy}
                </span>
                <span class="mfd-label-unit" style="width: 25px;">
                  {this.gpirsUnit}
                </span>
              </div>
            </div>
          </div>
          <div style="flex-grow: 1;" />
          {/* fill space vertically */}
          <div style="width: 150px;">
            <Button
              label="RETURN"
              onClick={() => this.props.mfd.uiService.navigateTo('back')}
              buttonStyle="margin-right: 5px;"
              visible={this.returnButtonVisible}
            />
          </div>
        </div>
        <Footer
          bus={this.props.bus}
          mfd={this.props.mfd}
          fmcService={this.props.fmcService}
          flightPlanInterface={this.props.fmcService.master.flightPlanInterface}
        />
      </>
    );
  }
}
