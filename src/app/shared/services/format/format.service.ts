import { Injectable } from "@angular/core";

import { Chat, Message, Profile, SearchCriteria } from "@classes/index";
import {
  allowOptionalProp,
  chatFromDatabase,
  messageFromDatabase,
  messageMap,
  profileFromDatabase,
  searchCriteria,
  sortUIDs,
  userSnippet,
} from "@interfaces/index";
import { Timestamp } from "@interfaces/firebase.model";

@Injectable({
  providedIn: "root",
})
export class FormatService {
  constructor() {}

  public searchCriteriaDatabaseToClass(
    searchCriteria: allowOptionalProp<searchCriteria>
  ): SearchCriteria {
    if (!searchCriteria) return;
    const university = searchCriteria.university;
    const areaOfStudy = searchCriteria.areaOfStudy;
    const degree = searchCriteria.degree;
    const societyCategory = searchCriteria.societyCategory;
    const interests = searchCriteria.interests;
    // const onCampus = searchCriteria.onCampus;

    return new SearchCriteria({
      university,
      areaOfStudy,
      degree,
      societyCategory,
      interests,
      // onCampus,
    });
  }

  public searchCriteriaClassToDatabase(searchCriteria: SearchCriteria): searchCriteria {
    const university = searchCriteria.university;
    const areaOfStudy = searchCriteria.areaOfStudy;
    const degree = searchCriteria.degree;
    const societyCategory = searchCriteria.societyCategory;
    const interests = searchCriteria.interests;
    // const onCampus = searchCriteria.onCampus;

    return {
      university,
      areaOfStudy,
      degree,
      societyCategory,
      interests,
      // onCampus,
    };
  }

  public profileDatabaseToClass(uid: string, profile: profileFromDatabase): Profile {
    const firstName = profile.firstName;
    const dateOfBirth = profile.dateOfBirth.toDate();
    const pictureUrls = [];
    const pictureCount = null;
    const biography = profile.biography;
    const university = profile.university;
    const course = profile.course;
    const society = profile.society;
    const societyCategory = profile.societyCategory;
    const areaOfStudy = profile.areaOfStudy;
    const interests = profile.interests;
    const questions = profile.questions;
    // const onCampus = profile.onCampus;
    const degree = profile.degree;
    const socialMediaLinks = profile.socialMediaLinks;

    return new Profile(
      uid,
      firstName,
      dateOfBirth,
      pictureUrls,
      pictureCount,
      biography,
      university,
      course,
      society,
      societyCategory,
      areaOfStudy,
      interests,
      questions,
      // onCampus,
      degree,
      socialMediaLinks
    );
  }

  public profileClassToDatabase(profile: Profile): profileFromDatabase {
    const firstName = profile.firstName;
    const dateOfBirth = Timestamp.fromDate(profile.dateOfBirth);
    const biography = profile.biography;
    const university = profile.university;
    const course = profile.course;
    const society = profile.society;
    const societyCategory = profile.societyCategory;
    const areaOfStudy = profile.areaOfStudy;
    const interests = profile.interests;
    const questions = profile.questions;
    // const onCampus = profile.onCampus;
    const degree = profile.degree;
    const socialMediaLinks = profile.socialMediaLinks;

    return {
      firstName,
      dateOfBirth,
      biography,
      university,
      degree,
      course,
      society,
      societyCategory,
      areaOfStudy,
      interests,
      questions,
      // onCampus,
      socialMediaLinks,
    };
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

  public messagesDatabaseToClass(messages: messageMap[]): Message[] {
    return messages.map((msgMap) => this.messageDatabaseToClass(msgMap));
  }

  public messageDatabaseToClass(messageMap: messageMap): Message {
    const messageID = messageMap.id;
    const content = messageMap.message.content;
    const senderID = messageMap.message.senderID;
    const time = messageMap.message.time.toDate();

    // assuming the message has been sent and that it comes from the database
    return new Message(messageID, senderID, time, content, "sent");
  }

  public messagesClassToDatabase(
    messages: Message[],
    uids: string[]
  ): messageFromDatabase[] {
    if (!messages) return;

    return messages.map((msg) => {
      return this.messageClassToDatabase(msg, uids);
    });
  }

  public messageClassToDatabase(msg: Message, uids: string[]): messageFromDatabase {
    if (!msg) return;
    const content = msg.content;
    const senderID = msg.senderID;
    const time = Timestamp.fromDate(msg.time);
    uids = sortUIDs(uids);

    return { senderID, time, content, uids };
  }
}
