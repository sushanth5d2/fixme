export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OtpVerify: { phone: string };
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  RequestsTab: undefined;
  FindFixerTab: undefined;
  ChatTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  CreateRequest: { categoryId?: string; categoryName?: string };
  RequestDetail: { requestId: string };
  FixerProfile: { fixerId: string };
  ChatRoom: { conversationId: string; otherUserName: string };
  QuoteList: { requestId: string };
};

export type RequestsStackParamList = {
  RequestsList: undefined;
  RequestDetail: { requestId: string };
  FixerProfile: { fixerId: string };
  ChatRoom: { conversationId: string; otherUserName: string };
};

export type FindFixerStackParamList = {
  FixerSearch: undefined;
  FixerProfile: { fixerId: string };
  FixerReviews: { fixerId: string; fixerName: string };
  ChatRoom: { conversationId: string; otherUserName: string };
};

export type ChatStackParamList = {
  ConversationList: undefined;
  ChatRoom: { conversationId: string; otherUserName: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Addresses: undefined;
  AddAddress: undefined;
  EditAddress: { addressId: string };
  Notifications: undefined;
  MyJobs: undefined;
  JobDetail: { jobId: string };
  ChatRoom: { conversationId: string; otherUserName: string };
};
