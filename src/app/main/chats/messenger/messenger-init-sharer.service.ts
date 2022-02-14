import { Injectable } from "@angular/core";
import { cloneDeep } from "lodash";
import { Chat, Message } from "@classes/index";

interface variableMap {
  chat: Chat;
  messages: Message[];
}

@Injectable({
  providedIn: "root",
})
export class MessengerInitSharer {
  private variables = this.emptyVariables;

  private get emptyVariables(): variableMap {
    return {
      chat: null,
      messages: null,
    };
  }

  constructor() {}

  storeVariables(map: variableMap): void {
    this.variables = map;
  }

  extractVariables() {
    const variablesToReturn = cloneDeep(this.variables);
    this.variables = this.emptyVariables;
    return variablesToReturn;
  }
}
