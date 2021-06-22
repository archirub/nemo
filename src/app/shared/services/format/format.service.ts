import { Injectable } from "@angular/core";

import { Chat, Message, Profile, SearchCriteria } from "@classes/index";
import {
  allowOptionalProp,
  chatFromDatabase,
  messageFromDatabase,
  profileFromDatabase,
  searchCriteria,
  userSnippet,
} from "@interfaces/index";
import firebase from "firebase";

@Injectable({
  providedIn: "root",
})
export class FormatService {
  constructor() {}

  /** Sorts the chats so that lastly interacted chats are at the top of the array */
  public sortChats(chats: Chat[]): Chat[] {
    if (!chats) return;
    chats.sort(
      (chat1, chat2) => chat2.lastInteracted.getTime() - chat1.lastInteracted.getTime()
    );
    return chats;
  }

  public sortUIDs(uids: string[]): string[] {
    return uids.sort((a, b) => ("" + a).localeCompare(b));
  }

  public searchCriteriaDatabaseToClass(
    searchCriteria: allowOptionalProp<searchCriteria>
  ): SearchCriteria {
    if (!searchCriteria) return;
    const university = searchCriteria.university;
    const areaOfStudy = searchCriteria.areaOfStudy;
    const degree = searchCriteria.degree;
    const societyCategory = searchCriteria.societyCategory;
    const interests = searchCriteria.interests;
    const onCampus = searchCriteria.onCampus;

    return new SearchCriteria({
      university,
      areaOfStudy,
      degree,
      societyCategory,
      interests,
      onCampus,
    });
  }

  public searchCriteriaClassToDatabase(searchCriteria: SearchCriteria): searchCriteria {
    if (!searchCriteria) return;
    const university = searchCriteria.university;
    const areaOfStudy = searchCriteria.areaOfStudy;
    const degree = searchCriteria.degree;
    const societyCategory = searchCriteria.societyCategory;
    const interests = searchCriteria.interests;
    const onCampus = searchCriteria.onCampus;

    return {
      university,
      areaOfStudy,
      degree,
      societyCategory,
      interests,
      onCampus,
    };
  }

  public profileDatabaseToClass(uid: string, profileData: profileFromDatabase): Profile {
    if (!uid || !profileData) return;
    const firstName = profileData.firstName;
    const dateOfBirth = profileData.dateOfBirth.toDate();
    const pictureCount = profileData.pictureCount;
    const pictureUrls = Array(pictureCount).fill("") as string[];
    const biography = profileData.biography;
    const university = profileData.university;
    const course = profileData.course;
    const society = profileData.society;
    const interests = profileData.interests;
    const questions = profileData.questions;
    const onCampus = profileData.onCampus;
    const degree = profileData.degree;
    const socialMediaLinks = profileData.socialMediaLinks;

    return new Profile(
      uid,
      firstName,
      dateOfBirth,
      pictureCount,
      pictureUrls,
      biography,
      university,
      course,
      society,
      interests,
      questions,
      onCampus,
      degree,
      socialMediaLinks
    );
  }

  public chatDatabaseToClass(
    currentUserID: string,
    chatID: string,
    chatData: chatFromDatabase
  ): Chat {
    if (!currentUserID || !chatID || !chatData) return;

    const batchVolume: number = chatData.batchVolume;
    const lastInteracted: Date = chatData.lastInteracted.toDate();
    const userSnippets: userSnippet[] = chatData.userSnippets;
    const recipient: userSnippet = userSnippets.filter(
      (snippet) => snippet.uid !== currentUserID
    )[0];

    const messages: Message[] = this.messagesDatabaseToClass(chatData.messages);

    return new Chat(chatID, recipient, messages, batchVolume, lastInteracted, null);
  }

  public messagesDatabaseToClass(messages: messageFromDatabase[]): Message[] {
    if (!messages) return;

    return messages.map((msg) => {
      const content = msg.content;
      const reaction = msg.reaction;
      const senderID = msg.senderID;
      const time = msg.time.toDate();
      const seen = msg.seen;

      return new Message(senderID, time, content, reaction, "sent", seen);
    });
  }

  public messagesClassToDatabase(messages: Message[]): messageFromDatabase[] {
    if (!messages) return;

    return messages.map((msg) => {
      return this.messageClassToDatabase(msg);
    });
  }

  private messageClassToDatabase(msg: Message): messageFromDatabase {
    if (!msg) return;
    const content = msg.content;
    const reaction = msg.reaction;
    const senderID = msg.senderID;
    const time = firebase.firestore.Timestamp.fromDate(msg.time);
    const seen = msg.seen;

    return { senderID, seen, time, content, reaction };
  }
}
