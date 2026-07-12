// Copyright (c) 2023-2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import React from 'react';

import { usePersistentNumberProperty } from '@flybywiresim/fbw-sdk-react';
import { pathify, SettingGroup, SettingItem, SettingsPage, t, Toggle } from '@flybywiresim/flypad';
import { A380X_DEFAULT_AUTO_CALL_OUTS, A380XAutoCallOutFlags } from '../../../../shared/src/AutoCallOuts';

export const AutomaticCallOutsPage: React.FC = () => {
  const [autoCallOuts, setAutoCallOuts] = usePersistentNumberProperty(
    'CONFIG_A380X_FWC_RADIO_AUTO_CALL_OUT_PINS',
    A380X_DEFAULT_AUTO_CALL_OUTS,
  );

  const toggleRadioAcoFlag = (flag: A380XAutoCallOutFlags): void => {
    let newFlags = autoCallOuts;
    if ((autoCallOuts & flag) > 0) {
      newFlags &= ~flag;
    } else {
      newFlags |= flag;
    }

    // two-thousand-five-hundred and twenty-five-hundred are exclusive
    const both2500s = A380XAutoCallOutFlags.TwoThousandFiveHundred | A380XAutoCallOutFlags.TwentyFiveHundred;
    if ((newFlags & both2500s) === both2500s) {
      if (flag === A380XAutoCallOutFlags.TwentyFiveHundred) {
        newFlags &= ~A380XAutoCallOutFlags.TwoThousandFiveHundred;
      } else {
        newFlags &= ~A380XAutoCallOutFlags.TwentyFiveHundred;
      }
    }

    // one of five-hundred or four-hundred is mandatory
    const fiveHundredFourHundred = A380XAutoCallOutFlags.FiveHundred | A380XAutoCallOutFlags.FourHundred;
    if ((newFlags & fiveHundredFourHundred) === 0) {
      // Airbus basic config is four hundred so prefer that if it wasn't just de-selected
      if (flag === A380XAutoCallOutFlags.FourHundred) {
        newFlags |= A380XAutoCallOutFlags.FiveHundred;
      } else {
        newFlags |= A380XAutoCallOutFlags.FourHundred;
      }
    }

    // can't have 500 glide without 500
    if ((newFlags & A380XAutoCallOutFlags.FiveHundred) === 0) {
      newFlags &= ~A380XAutoCallOutFlags.FiveHundredGlide;
    }

    // If eighty is enabled, seventy and sixty are mandatory.
    if ((newFlags & A380XAutoCallOutFlags.Eighty) > 0) {
      newFlags &= ~A380XAutoCallOutFlags.Seventy;
      newFlags &= ~A380XAutoCallOutFlags.Sixty;
    } else if ((newFlags & A380XAutoCallOutFlags.Seventy) > 0) {
      newFlags &= ~A380XAutoCallOutFlags.Sixty;
    }

    setAutoCallOuts(newFlags);
  };

  return (
    <SettingsPage
      name={t('Settings.AutomaticCallOuts.Title')}
      backRoute={`/settings/${pathify('Aircraft Options / Pin Programs')}`}
    >
      <div className="grid grid-cols-2 gap-x-6">
        <div className="mr-3 divide-y-2 divide-theme-accent">
          <SettingItem name="Two Thousand Five Hundred">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.TwoThousandFiveHundred) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.TwoThousandFiveHundred)}
            />
          </SettingItem>
          <SettingItem name="Twenty Five Hundred">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.TwentyFiveHundred) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.TwentyFiveHundred)}
            />
          </SettingItem>
          <SettingItem name="Two Thousand">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.TwoThousand) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.TwoThousand)}
            />
          </SettingItem>
          <SettingItem name="One Thousand">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.OneThousand) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.OneThousand)}
            />
          </SettingItem>
          <SettingGroup>
            <SettingItem name="Five Hundred" groupType="parent">
              <Toggle
                value={(autoCallOuts & A380XAutoCallOutFlags.FiveHundred) > 0}
                onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.FiveHundred)}
              />
            </SettingItem>
            <SettingItem name={t('Settings.AutomaticCallOuts.FiveHundredGlide')} groupType="sub">
              <Toggle
                value={(autoCallOuts & A380XAutoCallOutFlags.FiveHundredGlide) > 0}
                disabled={(autoCallOuts & A380XAutoCallOutFlags.FiveHundred) === 0}
                onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.FiveHundredGlide)}
              />
            </SettingItem>
          </SettingGroup>
          <SettingItem name="Four Hundred">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.FourHundred) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.FourHundred)}
            />
          </SettingItem>
          <SettingItem name="Three Hundred">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.ThreeHundred) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.ThreeHundred)}
            />
          </SettingItem>
          <SettingItem name="Two Hundred">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.TwoHundred) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.TwoHundred)}
            />
          </SettingItem>
          <SettingItem name="One Hundred">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.OneHundred) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.OneHundred)}
            />
          </SettingItem>
        </div>
        <div className="ml-3 divide-y-2 divide-theme-accent">
          <SettingItem name="Ninety">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.Ninety) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.Ninety)}
            />
          </SettingItem>

          <SettingItem name="Eighty">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.Eighty) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.Eighty)}
            />
          </SettingItem>

          <SettingItem name="Seventy">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.Seventy) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.Seventy)}
            />
          </SettingItem>

          <SettingItem name="Sixty">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.Sixty) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.Sixty)}
            />
          </SettingItem>

          <SettingItem name="Fifty">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.Fifty) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.Fifty)}
            />
          </SettingItem>

          <SettingItem name="Forty">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.Forty) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.Forty)}
            />
          </SettingItem>

          <SettingItem name="Thirty">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.Thirty) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.Thirty)}
            />
          </SettingItem>

          <SettingItem name="Twenty">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.Twenty) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.Twenty)}
            />
          </SettingItem>

          <SettingItem name="Ten">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.Ten) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.Ten)}
            />
          </SettingItem>

          <SettingItem name="Five">
            <Toggle
              value={(autoCallOuts & A380XAutoCallOutFlags.Five) > 0}
              onToggle={() => toggleRadioAcoFlag(A380XAutoCallOutFlags.Five)}
            />
          </SettingItem>
        </div>
      </div>
      <SettingItem name={t('Settings.AutomaticCallOuts.ResetStandardConfig')}>
        <button
          type="button"
          className="rounded-md border-2 border-theme-highlight bg-theme-highlight px-5
                                       py-2.5 text-theme-body transition duration-100 hover:bg-theme-body hover:text-theme-highlight"
          onClick={() => setAutoCallOuts(A380X_DEFAULT_AUTO_CALL_OUTS)}
        >
          {t('Settings.AutomaticCallOuts.Reset')}
        </button>
      </SettingItem>
    </SettingsPage>
  );
};
