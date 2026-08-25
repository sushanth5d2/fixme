export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OtpVerify: { phone: string };
  Registration: undefined; // Fixer business registration
};

export type MainTabParamList = {
  FeedTab: undefined;
  MapTab: undefined;
  MyJobsTab: undefined;
  MyQuotesTab: undefined;
  ChatTab: undefined;
  ProfileTab: undefined;
};

export type FeedStackParamList = {
  Feed: undefined;
  RequestDetail: { requestId: string };
  SubmitQuote: { requestId: string; categoryName?: string; existingQuote?: any };
  ChatRoom: { conversationId: string; otherUserName: string };
};

export type MapStackParamList = {
  MapExplorer: undefined;
  RequestDetail: { requestId: string };
  SubmitQuote: { requestId: string; categoryName?: string; existingQuote?: any };
  ChatRoom: { conversationId: string; otherUserName: string };
};

export type JobsStackParamList = {
  JobsList: undefined;
  JobDetail: { jobId: string };
  ChatRoom: { conversationId: string; otherUserName: string };
};

export type ChatStackParamList = {
  ConversationList: undefined;
  ChatRoom: { conversationId: string; otherUserName: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  ManageServices: undefined;
  ManageAreas: undefined;
  Registration: undefined;
};
