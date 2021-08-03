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
    chatData: chatFromDatabase,
    recentMessage: Message
  ): Chat {
    const recipient: userSnippet = chatData.userSnippets.filter(
      (snippet) => snippet.uid !== currentUserID
    )[0];

    return new Chat(chatID, recipient, recentMessage, null);
  }

  public messagesDatabaseToClass(messages: messageFromDatabase[]): Message[] {
    return messages.map((msg) => this.messageDatabaseToClass(msg));
  }

  public messageDatabaseToClass(message: messageFromDatabase): Message {
    const content = message.content;
    const senderID = message.senderID;
    const time = message.time.toDate();

    // assuming the message has been sent and that it comes from the database
    return new Message(senderID, time, content, "sent");
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
    const senderID = msg.senderID;
    const time = firebase.firestore.Timestamp.fromDate(msg.time);

    return { senderID, time, content };
  }
}
