// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0
import { ConfigParser, EventBus } from '@microsoft/msfs-sdk';
import {
  A380XCustomChecklistHeadline,
  A380XCustomChecklistItemAction,
  A380xCustomChecklistItemType,
  A380XCustomChecklistSensedItemType,
  A380XCustomEcamDefinition,
  A380XCustomNormalChecklist,
  A380xCustomNormalChecklistItem,
  A380XCustomNormalChecklistType,
  MAX_NUMBER_CHECKLISTS,
} from './CustomEcamDefinition';
import { logTroubleshootingError } from '@flybywiresim/fbw-sdk';

export class CustomEcamDefinitionPraser {
  static readonly CONFIG_TAG_NAME: string = 'EcamDefinition';

  // General SPP
  static readonly SIGNS_ON_KEY = 'toldgMemoSignsOn';

  // Normal Checklist
  static readonly NORMAL_CHECKLISTS_KEY = 'NormalChecklists';
  static readonly CHECKLIST_KEY = 'Checklist';
  static readonly CHECKLIST_NAME_KEY = 'Name';
  static readonly CHECKIST_TYPE_KEY = 'Type';
  static readonly CHECKLIST_ITEMS_KEY = 'Items';

  // Checklist
  static readonly CHECKLIST_ITEM_TYPE_KEY = 'Type';
  static readonly CHECKLIST_ITEM_NAME_KEY = 'Name';
  static readonly CHECKLIST_ITEM_LABEL_NOT_COMPLETED_ITEM_KEY = 'LabelNotCompleted';
  static readonly CHECKLIST_ITEM_CONDITION_KEY = 'Condition';
  static readonly CHECKLIST_ITEM_LABEL_COMPLETED_KEY = 'LabelCompleted';
  static readonly CHECKLIST_ITEM_SUBLEVEL_KEY = 'SubLevel';
  static readonly CHECKLIST_ITEM_COLON_IF_COMPLETED_KEY = 'ColonIfCompleted';

  constructor(
    readonly xmlConfig: Document,
    readonly bus: EventBus,
  ) {}

  public parseConfig(): A380XCustomEcamDefinition | null | undefined {
    const configElement = ConfigParser.optional(
      () => ConfigParser.getChildElement(this.xmlConfig.documentElement, CustomEcamDefinitionPraser.CONFIG_TAG_NAME),
      null,
    );

    if (configElement === null) {
      return undefined;
    }

    try {
      const signsOn = ConfigParser.optional(
        () => ConfigParser.getBooleanAttrValue(configElement, CustomEcamDefinitionPraser.SIGNS_ON_KEY),
        false,
      );

      const checklistsElement = ConfigParser.optional(
        () => ConfigParser.getChildElement(configElement, CustomEcamDefinitionPraser.NORMAL_CHECKLISTS_KEY),
        null,
      );
      return {
        toldgMemoSignsOn: signsOn,
        normalChecklists: checklistsElement !== null ? this.parseNormalChecklists(checklistsElement) : undefined,
      };
    } catch (e) {
      logTroubleshootingError(this.bus, 'Error loading custom ecam database in the fws: ' + e);
      return null;
    }
  }

  private parseNormalChecklists(element: Element): A380XCustomNormalChecklist[] {
    const checklistsElements = ConfigParser.getChildElements(element, CustomEcamDefinitionPraser.CHECKLIST_KEY);
    if (checklistsElements.length >= MAX_NUMBER_CHECKLISTS) {
      throw new Error('Max number of checklist items exceeded ' + checklistsElements.length);
    }
    const checklists: A380XCustomNormalChecklist[] = [];
    for (const checkListElement of checklistsElements) {
      const name = ConfigParser.getStringAttrValue(
        checkListElement,
        CustomEcamDefinitionPraser.CHECKLIST_NAME_KEY,
        false,
      );
      const type = ConfigParser.getEnumAttrValue(
        checkListElement,
        CustomEcamDefinitionPraser.CHECKIST_TYPE_KEY,
        Object.values(A380XCustomNormalChecklistType),
      );
      if (checklists.findIndex((c) => c.title === name || c.type === type)) {
        throw new Error(`Non unique checklist in ecam definition. name:${name} type:${type}`);
      }
      const items = ConfigParser.getChildElements(checkListElement, CustomEcamDefinitionPraser.CHECKLIST_ITEMS_KEY);
      checklists.push({
        title: name,
        type: type,
        items: items.map((i) => this.parseNormalChecklistItem(i)),
      });
    }

    return checklists;
  }

  private parseNormalChecklistItem(element: Element): A380xCustomNormalChecklistItem {
    const itemType = ConfigParser.getEnumAttrValue(
      element,
      CustomEcamDefinitionPraser.CHECKLIST_ITEM_TYPE_KEY,
      Object.values(A380xCustomChecklistItemType),
    );

    switch (itemType) {
      case A380xCustomChecklistItemType.LINE_SEPARATOR:
        return {
          type: A380xCustomChecklistItemType.LINE_SEPARATOR,
        };
      case A380xCustomChecklistItemType.HEADLINE: {
        const item: A380XCustomChecklistHeadline = {
          type: A380xCustomChecklistItemType.HEADLINE,
          name: ConfigParser.getStringAttrValue(element, CustomEcamDefinitionPraser.CHECKLIST_ITEM_NAME_KEY, false),
        };
        return item;
      }
      case A380xCustomChecklistItemType.ACTION: {
        const name = ConfigParser.getStringAttrValue(
          element,
          CustomEcamDefinitionPraser.CHECKLIST_ITEM_NAME_KEY,
          false,
        );
        const labelNotCompleted = ConfigParser.getStringAttrValue(
          element,
          CustomEcamDefinitionPraser.CHECKLIST_ITEM_LABEL_NOT_COMPLETED_ITEM_KEY,
          false,
        );
        const labelCompleted = ConfigParser.optional(
          () =>
            ConfigParser.getStringAttrValue(
              element,
              CustomEcamDefinitionPraser.CHECKLIST_ITEM_LABEL_COMPLETED_KEY,
              false,
            ),
          undefined,
        );
        const subLevel = ConfigParser.optional(
          () => ConfigParser.getBooleanAttrValue(element, CustomEcamDefinitionPraser.CHECKLIST_ITEM_SUBLEVEL_KEY),
          false,
        );

        const colonIfCompleted = ConfigParser.optional(
          () =>
            ConfigParser.getBooleanAttrValue(element, CustomEcamDefinitionPraser.CHECKLIST_ITEM_COLON_IF_COMPLETED_KEY),
          true,
        );

        const isSensed = ConfigParser.optional(
          () =>
            ConfigParser.getStringAttrValue(element, CustomEcamDefinitionPraser.CHECKLIST_ITEM_CONDITION_KEY).length >
            0,
          false,
        );
        let sensedItem: A380XCustomChecklistSensedItemType | undefined = undefined;
        if (isSensed) {
          sensedItem = ConfigParser.getEnumAttrValue(
            element,
            CustomEcamDefinitionPraser.CHECKLIST_ITEM_CONDITION_KEY,
            Object.values(A380XCustomChecklistSensedItemType),
          );
        }

        const actionItem: A380XCustomChecklistItemAction = {
          name: name,
          labelNotCompleted: labelNotCompleted,
          labelCompleted: labelCompleted,
          subLevel: subLevel,
          colonIfCompleted: colonIfCompleted,
          sensed: sensedItem,
          type: A380xCustomChecklistItemType.ACTION,
        };
        return actionItem;
      }
    }
  }
}
