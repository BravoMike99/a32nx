import { Coordinates } from '@fmgc/flightplanning/data/geo';

export enum IrsStatus {
  NAV = 'NAV',
  ALIGN = 'ALIGN',
  ATT = 'ATT',
  INVALID = 'INVALID',
}

export enum IrsStatusMessage {
  IR_FAULT = 'IR FAULT',
  ENTER_HDG = 'ENTER HDG',
  EXCESS_MOTION = 'EXCESS MOTION',
  SWITCH_ADR = 'SWITCH ADR',
}

export interface PositionPageGenericEvents {
  adirs_alignment_position: Coordinates | null;
  adirs_alignment_mode: 'REF | GPS' | null;
  ir1_status: IrsStatus;
  ir2_status: IrsStatus;
  ir3_status: IrsStatus;
  ir1_time_to_align: number | null;
  ir2_time_to_align: number | null;
  ir3_time_to_align: number | null;
  ir1_status_message: IrsStatusMessage | null;
  ir2_status_message: IrsStatusMessage | null;
  ir3_status_message: IrsStatusMessage | null;
}

export interface PositionPageIrEvents {
  coordinates: Coordinates | null;
  status: 'NAV' | 'ALIGN' | 'ATT' | 'INVALID';
  time_to_align: number | null;
  true_track: number | null;
  ground_speed: number | null;
  true_wind_direction: number | null;
  true_wind_speed: number | null;
  true_heading: number | null;
  magnetic_variation: number | null;

  gpirs_coordinates: Coordinates | null;
  gpirs_position_accuracy: number | null;
  gpirs_accuracy_meters: boolean | null;
}

type IndexedTopics = keyof PositionPageIrEvents;

type PositionIrsIndexedEventType<T extends string> = `${T}_${1 | 2 | 3}`;

type PositionIrsindexedEvents = {
  [P in keyof Pick<PositionPageIrEvents, IndexedTopics> as PositionIrsIndexedEventType<P>]: PositionPageIrEvents[P];
};

export interface PositionIrsEvents extends PositionPageIrEvents, PositionIrsindexedEvents, PositionPageGenericEvents {}
