import { useEffect, useMemo, useState } from "react";

import {
  createCrmThread,
  getCrmCommunicate,
  sendCrmConversationSms,
  updateCrmContactQuickInfo
} from "../api";

type CommunicationSection = "inbox" | "reviews" | "contacts" | "payments" | "activity";
type ReviewState = "Needs Response" | "Responded";
type ConversationStatus = "Open" | "Pending" | "Escalated";
type PaymentStatus = "Pending" | "Link Sent" | "Paid" | "Refunded" | "Promise to Pay";
type ActivityKind = "SMS" | "Email" | "Call" | "Task" | "Review" | "Payment" | "Quote";
type ActivityState = "Open" | "Done";
type ActivityPriority = "Low" | "Normal" | "High";
type ComposerChannel = "SMS" | "Email" | "Call Note" | "Task";

interface SalesforceTrackerEntry {
  actor: string;
  detail: string;
  id: string;
  isActionable: boolean;
  kind: ActivityKind;
  source: string;
  stateLabel: string;
  timeLabel: string;
  title: string;
}

interface ContactProfile {
  id: string;
  name: string;
  owner: string;
  location: string;
  phone: string;
  email: string;
  company: string;
  stage: string;
  tags: string[];
  consentText: string;
  consentEmail: string;
  lastTouch: string;
  lastChannel: string;
  nextAction: string;
  healthScore: number;
  openBalance: number;
  opportunityValue: number;
  reviewScore: number;
  integrationId: string;
  dealReference: string;
}

interface ConversationMessage {
  id: string;
  author: string;
  body: string;
  timeLabel: string;
  direction: "inbound" | "outbound";
  status: string;
}

interface ConversationThread {
  id: string;
  contactId: string;
  channel: "SMS" | "Email";
  subject: string;
  preview: string;
  queueLabel: string;
  assignment: string;
  status: ConversationStatus;
  unreadCount: number;
  lastTouch: string;
  messages: ConversationMessage[];
}

interface ReviewItem {
  id: string;
  contactId: string;
  author: string;
  platform: string;
  rating: number;
  postedAt: string;
  body: string;
  owner: string;
  state: ReviewState;
}

interface PaymentRecord {
  id: string;
  contactId: string;
  createdAt: string;
  customer: string;
  confirmation: string;
  invoice: string;
  amount: number;
  type: string;
  status: PaymentStatus;
  reconciled: boolean;
  owner: string;
  detail: string;
}

interface ActivityEntry {
  id: string;
  contactId: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  owner: string;
  source: string;
  timeLabel: string;
  priority: ActivityPriority;
  state: ActivityState;
}

const communicationSections: Array<{ countLabel: string; id: CommunicationSection; label: string; shortLabel: string }> = [
  { id: "inbox", label: "Inbox", shortLabel: "IN", countLabel: "open" },
  { id: "reviews", label: "Reviews", shortLabel: "RV", countLabel: "needs response" },
  { id: "contacts", label: "Contacts", shortLabel: "CT", countLabel: "profiles" },
  { id: "payments", label: "Payments", shortLabel: "PY", countLabel: "in flight" },
  { id: "activity", label: "Activity", shortLabel: "AC", countLabel: "tracked" }
];

const initialContacts: ContactProfile[] = [
  {
    id: "contact-james-green",
    name: "James Green",
    owner: "Christopher Koehl",
    location: "Corpus Christi",
    phone: "+1 (210) 584-7854",
    email: "jagreen2014@yahoo.com",
    company: "James Green",
    stage: "Quoted",
    tags: ["VIP", "Review Ready", "Sea Trial"],
    consentText: "Allowed",
    consentEmail: "Allowed",
    lastTouch: "Tue 2:08 PM",
    lastChannel: "SMS",
    nextAction: "Confirm rigging package before 4 PM",
    healthScore: 92,
    openBalance: 0,
    opportunityValue: 214880,
    reviewScore: 5,
    integrationId: "003HS00005JJBVJIAL",
    dealReference: "Quote 602511"
  },
  {
    id: "contact-cody-davis",
    name: "Cody Davis",
    owner: "Christopher Koehl",
    location: "Corpus Christi",
    phone: "+1 (409) 555-0148",
    email: "cody.davis@prospectmail.com",
    company: "Davis Marine",
    stage: "Lead",
    tags: ["Inventory Watch", "Cold Lead"],
    consentText: "Allowed",
    consentEmail: "Allowed",
    lastTouch: "Tue 1:38 PM",
    lastChannel: "SMS",
    nextAction: "Send Beaumont inventory alternatives",
    healthScore: 64,
    openBalance: 0,
    opportunityValue: 94520,
    reviewScore: 0,
    integrationId: "003HS00005CRM0201",
    dealReference: "Lead COD-118"
  },
  {
    id: "contact-william-meacham",
    name: "William Meacham",
    owner: "Christopher Koehl",
    location: "Corpus Christi",
    phone: "+1 (361) 555-0174",
    email: "wmeacham@boatmail.com",
    company: "Meacham Family Holdings",
    stage: "Appointment",
    tags: ["High Intent", "Trade Appraisal"],
    consentText: "Allowed",
    consentEmail: "Allowed",
    lastTouch: "Tue 1:12 PM",
    lastChannel: "SMS",
    nextAction: "Hold appraisal lane for Wednesday walk-in",
    healthScore: 88,
    openBalance: 1500,
    opportunityValue: 188300,
    reviewScore: 4,
    integrationId: "003HS00005CRM0202",
    dealReference: "Deal SRQ-078"
  },
  {
    id: "contact-eric-broussard",
    name: "Eric John Broussard",
    owner: "Eric Bradshaw",
    location: "Corpus Christi",
    phone: "+1 (361) 555-0188",
    email: "ejbroussard@bayline.net",
    company: "Broussard Construction",
    stage: "Won",
    tags: ["Post Sale", "Review Pending"],
    consentText: "Allowed",
    consentEmail: "Allowed",
    lastTouch: "Tue 12:59 PM",
    lastChannel: "Email",
    nextAction: "Queue delivery checklist recap",
    healthScore: 79,
    openBalance: 3200,
    opportunityValue: 124900,
    reviewScore: 5,
    integrationId: "003HS00005CRM0203",
    dealReference: "Deal BRS-245"
  },
  {
    id: "contact-josh-bush",
    name: "Josh Bush",
    owner: "Christopher Koehl",
    location: "Corpus Christi",
    phone: "+1 (361) 555-0126",
    email: "jbush@inboxmail.com",
    company: "Bush Outfitters",
    stage: "Deposit",
    tags: ["Payment Link", "Accessories"],
    consentText: "Allowed",
    consentEmail: "Allowed",
    lastTouch: "Tue 12:56 PM",
    lastChannel: "SMS",
    nextAction: "Collect electronics package payment",
    healthScore: 84,
    openBalance: 6000,
    opportunityValue: 142750,
    reviewScore: 0,
    integrationId: "003HS00005CRM0204",
    dealReference: "Invoice 2002433"
  },
  {
    id: "contact-anthony-mares",
    name: "Anthony Mares",
    owner: "Christopher Koehl",
    location: "Corpus Christi",
    phone: "+1 (361) 555-0119",
    email: "amares@outlook.com",
    company: "Mares Family Trust",
    stage: "Lead",
    tags: ["Response Risk", "Needs Call"],
    consentText: "Allowed",
    consentEmail: "Allowed",
    lastTouch: "Tue 12:00 PM",
    lastChannel: "SMS",
    nextAction: "Call before lead cools off",
    healthScore: 58,
    openBalance: 0,
    opportunityValue: 71440,
    reviewScore: 0,
    integrationId: "003HS00005CRM0205",
    dealReference: "Lead AMR-044"
  }
];

const initialConversations: ConversationThread[] = [
  {
    id: "thread-james-green",
    contactId: "contact-james-green",
    channel: "SMS",
    subject: "Online inquiry follow-up",
    preview: "Thank you for your reply today!",
    queueLabel: "Open Conversations",
    assignment: "Christopher Koehl",
    status: "Open",
    unreadCount: 0,
    lastTouch: "Tue 2:08 PM",
    messages: [
      {
        id: "message-james-1",
        author: "Joe Philbrook",
        body: "Hello James. This is Joe with Premier Yamaha Boating Center - Corpus Christi. Did we get you the information you requested online?",
        timeLabel: "Tue 12:56 PM",
        direction: "outbound",
        status: "Delivered"
      },
      {
        id: "message-james-2",
        author: "James Green",
        body: "Yes",
        timeLabel: "Tue 1:36 PM",
        direction: "inbound",
        status: "Received"
      },
      {
        id: "message-james-3",
        author: "Joe Philbrook",
        body: "Thank you for your reply today!",
        timeLabel: "Tue 2:08 PM",
        direction: "outbound",
        status: "Delivered"
      }
    ]
  },
  {
    id: "thread-cody-davis",
    contactId: "contact-cody-davis",
    channel: "SMS",
    subject: "Inventory availability",
    preview: "No not yet, the boat is located in Beaumont though.",
    queueLabel: "Open Conversations",
    assignment: "Christopher Koehl",
    status: "Pending",
    unreadCount: 1,
    lastTouch: "Tue 1:38 PM",
    messages: [
      {
        id: "message-cody-1",
        author: "Store Desk",
        body: "We are checking current inventory near Corpus Christi for you.",
        timeLabel: "Tue 1:10 PM",
        direction: "outbound",
        status: "Delivered"
      },
      {
        id: "message-cody-2",
        author: "Cody Davis",
        body: "No not yet, the boat is located in Beaumont though.",
        timeLabel: "Tue 1:38 PM",
        direction: "inbound",
        status: "Received"
      }
    ]
  },
  {
    id: "thread-william-meacham",
    contactId: "contact-william-meacham",
    channel: "SMS",
    subject: "Trade appraisal intake",
    preview: "Yes sir",
    queueLabel: "Appointment Follow-Up",
    assignment: "Christopher Koehl",
    status: "Open",
    unreadCount: 0,
    lastTouch: "Tue 1:12 PM",
    messages: [
      {
        id: "message-william-1",
        author: "Store Desk",
        body: "Can you bring the current registration and engine hours when you stop by?",
        timeLabel: "Tue 1:00 PM",
        direction: "outbound",
        status: "Delivered"
      },
      {
        id: "message-william-2",
        author: "William Meacham",
        body: "Yes sir",
        timeLabel: "Tue 1:12 PM",
        direction: "inbound",
        status: "Received"
      }
    ]
  },
  {
    id: "thread-eric-broussard",
    contactId: "contact-eric-broussard",
    channel: "Email",
    subject: "Post sale thank-you and review request",
    preview: "Thank you for trusting Premier Yamaha Boating Centers.",
    queueLabel: "Delivered Customers",
    assignment: "Eric Bradshaw",
    status: "Open",
    unreadCount: 0,
    lastTouch: "Tue 12:59 PM",
    messages: [
      {
        id: "message-eric-1",
        author: "Eric Bradshaw",
        body: "Thank you for trusting Premier Yamaha Boating Centers - Corpus Christi. Here is the delivery packet recap.",
        timeLabel: "Tue 12:59 PM",
        direction: "outbound",
        status: "Opened"
      }
    ]
  }
];

const initialReviews: ReviewItem[] = [
  {
    id: "review-david-heffington",
    contactId: "contact-eric-broussard",
    author: "David Heffington",
    platform: "Google",
    rating: 5,
    postedAt: "May 26, 2026 4:48 PM",
    body: "Lucas is great to work with. He has all his ducks in a row and delivers as promised.",
    owner: "Reputation Desk",
    state: "Needs Response"
  },
  {
    id: "review-darrell-volz",
    contactId: "contact-james-green",
    author: "Darrell Volz",
    platform: "Google",
    rating: 5,
    postedAt: "Apr 27, 2026 10:02 PM",
    body: "Excellent experience working with Chris in Corpus. I highly recommend them.",
    owner: "Christopher Koehl",
    state: "Responded"
  },
  {
    id: "review-thomas-cathey",
    contactId: "contact-william-meacham",
    author: "Thomas Cathey",
    platform: "Google",
    rating: 4,
    postedAt: "Apr 17, 2026 12:00 PM",
    body: "Fairly evaluated my boat, offered a fair price, and followed through with his offer.",
    owner: "Store Desk",
    state: "Needs Response"
  },
  {
    id: "review-mike-murphree",
    contactId: "contact-josh-bush",
    author: "Mike Murphree",
    platform: "Google",
    rating: 5,
    postedAt: "Apr 13, 2026 9:03 AM",
    body: "Premier Boating Centers were very helpful, knowledgeable, friendly, and professional.",
    owner: "Sales Desk",
    state: "Needs Response"
  }
];

const initialPayments: PaymentRecord[] = [
  {
    id: "payment-josh-bush",
    contactId: "contact-josh-bush",
    createdAt: "03/30/26 04:26 PM",
    customer: "Josh Bush",
    confirmation: "878198",
    invoice: "2002433",
    amount: 6000,
    type: "Text-to-pay",
    status: "Link Sent",
    reconciled: false,
    owner: "Cashiering",
    detail: "Electronics package deposit"
  },
  {
    id: "payment-eric-broussard",
    contactId: "contact-eric-broussard",
    createdAt: "03/26/26 03:32 PM",
    customer: "Eric John Broussard",
    confirmation: "n/a",
    invoice: "2002433",
    amount: 5700,
    type: "Text-to-pay",
    status: "Pending",
    reconciled: false,
    owner: "Accounting",
    detail: "Delivery prep balance"
  },
  {
    id: "payment-william-meacham",
    contactId: "contact-william-meacham",
    createdAt: "03/24/26 04:14 PM",
    customer: "William Meacham",
    confirmation: "n/a",
    invoice: "n/a",
    amount: 2000,
    type: "Text-to-pay",
    status: "Promise to Pay",
    reconciled: false,
    owner: "Sales Desk",
    detail: "Trade appraisal hold deposit"
  },
  {
    id: "payment-james-green",
    contactId: "contact-james-green",
    createdAt: "03/17/26 12:09 PM",
    customer: "James Green",
    confirmation: "49836C",
    invoice: "2002425",
    amount: 5776,
    type: "Text-to-pay",
    status: "Paid",
    reconciled: true,
    owner: "Accounting",
    detail: "Quote acceptance deposit"
  }
];

const initialActivities: ActivityEntry[] = [
  {
    id: "activity-1",
    contactId: "contact-james-green",
    kind: "SMS",
    title: "SMS text received",
    detail: "James confirmed he has the online information packet and wants rigging options.",
    owner: "Joe Philbrook",
    source: "Communicate inbox",
    timeLabel: "Tue 1:36 PM",
    priority: "Normal",
    state: "Done"
  },
  {
    id: "activity-2",
    contactId: "contact-james-green",
    kind: "Task",
    title: "Confirm Yamaha package pricing",
    detail: "Need freight and rigging addendum before quote can be sent back.",
    owner: "Christopher Koehl",
    source: "Salesforce sync",
    timeLabel: "Today 3:00 PM",
    priority: "High",
    state: "Open"
  },
  {
    id: "activity-3",
    contactId: "contact-cody-davis",
    kind: "Quote",
    title: "Inventory alternative staged",
    detail: "Beaumont unit and Corpus inbound unit added to opportunity compare board.",
    owner: "Sales Desk",
    source: "Sales board",
    timeLabel: "Tue 1:42 PM",
    priority: "Normal",
    state: "Done"
  },
  {
    id: "activity-4",
    contactId: "contact-william-meacham",
    kind: "Call",
    title: "Call logged",
    detail: "Trade appraisal appointment confirmed for Wednesday 10:30 AM.",
    owner: "Christopher Koehl",
    source: "Salesforce activity",
    timeLabel: "Tue 12:58 PM",
    priority: "Normal",
    state: "Done"
  },
  {
    id: "activity-5",
    contactId: "contact-eric-broussard",
    kind: "Review",
    title: "Review request ready",
    detail: "Post-delivery review ask is queued behind final walkthrough email.",
    owner: "Reputation Desk",
    source: "Communicate workflow",
    timeLabel: "Tue 12:59 PM",
    priority: "Normal",
    state: "Open"
  },
  {
    id: "activity-6",
    contactId: "contact-josh-bush",
    kind: "Payment",
    title: "Payment link delivered",
    detail: "Text-to-pay link sent for electronics package deposit.",
    owner: "Cashiering",
    source: "Payments queue",
    timeLabel: "Mon 4:26 PM",
    priority: "High",
    state: "Open"
  },
  {
    id: "activity-7",
    contactId: "contact-anthony-mares",
    kind: "Task",
    title: "Lead response breach watch",
    detail: "Prospect has not received a follow-up call within the 30-minute SLA.",
    owner: "Sales Desk",
    source: "Salesforce sync",
    timeLabel: "Tue 12:05 PM",
    priority: "High",
    state: "Open"
  }
];

const reviewResponseTemplates = [
  "Thanks for the great feedback. We appreciate the chance to earn your business and will pass this along to the team.",
  "Thank you for the review. We are glad the process felt organized and easy to work through.",
  "We appreciate you choosing our store. If anything comes up after delivery, our team is ready to help."
];

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function buildContactInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("");
}

function getHealthTone(score: number) {
  if (score >= 85) {
    return "stable";
  }

  if (score >= 70) {
    return "attention";
  }

  return "critical";
}

function getActivityCountLabel(sectionId: CommunicationSection, data: {
  activities: ActivityEntry[];
  contacts: ContactProfile[];
  conversations: ConversationThread[];
  payments: PaymentRecord[];
  reviews: ReviewItem[];
}) {
  switch (sectionId) {
    case "inbox":
      return data.conversations.filter((conversation) => conversation.status !== "Pending").length;
    case "reviews":
      return data.reviews.filter((review) => review.state === "Needs Response").length;
    case "contacts":
      return data.contacts.length;
    case "payments":
      return data.payments.filter((payment) => payment.status !== "Paid" && payment.status !== "Refunded").length;
    case "activity":
      return data.activities.length;
    default:
      return 0;
  }
}

function getSalesforceTrackerTimeScore(label: string) {
  const trimmedLabel = label.trim();

  if (/^just now$/i.test(trimmedLabel)) {
    return Number.MAX_SAFE_INTEGER;
  }

  if (/^today\b/i.test(trimmedLabel)) {
    return Number.MAX_SAFE_INTEGER - 1;
  }

  if (/^(mon|tue|wed|thu|fri|sat|sun)\b/i.test(trimmedLabel)) {
    return Number.MAX_SAFE_INTEGER - 10;
  }

  const parsedTime = Date.parse(trimmedLabel);

  if (Number.isFinite(parsedTime)) {
    return parsedTime;
  }

  const numericDate = trimmedLabel.match(/^(\d{2})\/(\d{2})\/(\d{2})/);

  if (numericDate) {
    const [, month, day, year] = numericDate;
    return new Date(2000 + Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10)).getTime();
  }

  return 0;
}

function formatSalesforceTrackerMonthLabel(monthIndex: number, year: number) {
  const monthLabels = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${monthLabels[monthIndex] ?? "Activity"} · ${year}`;
}

function getSalesforceTrackerGroupLabel(label: string) {
  const trimmedLabel = label.trim();
  const now = new Date();

  if (/^just now$/i.test(trimmedLabel) || /^today\b/i.test(trimmedLabel)) {
    return formatSalesforceTrackerMonthLabel(now.getMonth(), now.getFullYear());
  }

  if (/^(mon|tue|wed|thu|fri|sat|sun)\b/i.test(trimmedLabel)) {
    return formatSalesforceTrackerMonthLabel(now.getMonth(), now.getFullYear());
  }

  const parsedTime = Date.parse(trimmedLabel);

  if (Number.isFinite(parsedTime)) {
    const parsedDate = new Date(parsedTime);
    return formatSalesforceTrackerMonthLabel(parsedDate.getMonth(), parsedDate.getFullYear());
  }

  const numericDate = trimmedLabel.match(/^(\d{2})\/\d{2}\/(\d{2})/);

  if (numericDate) {
    const monthIndex = Number.parseInt(numericDate[1], 10) - 1;
    const year = 2000 + Number.parseInt(numericDate[2], 10);
    return formatSalesforceTrackerMonthLabel(monthIndex, year);
  }

  return "Activity History";
}

function getSalesforceTrackerKindCode(kind: ActivityKind) {
  switch (kind) {
    case "SMS":
      return "SMS";
    case "Email":
      return "EML";
    case "Call":
      return "CAL";
    case "Task":
      return "TSK";
    case "Review":
      return "REV";
    case "Payment":
      return "PAY";
    case "Quote":
      return "QTE";
    default:
      return kind;
  }
}

function matchesSearch(values: Array<string | number>, normalizedSearch: string) {
  if (!normalizedSearch) {
    return true;
  }

  return values.some((value) => String(value).toLowerCase().includes(normalizedSearch));
}

interface CrmCommunicateWorkspaceProps {
  operatorName: string;
  storeName: string;
  storeId: string;
}

export function CrmCommunicateWorkspace({ operatorName, storeId, storeName }: CrmCommunicateWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<CommunicationSection>("inbox");
  const [contacts, setContacts] = useState(initialContacts);
  const [conversations, setConversations] = useState(initialConversations);
  const [reviews, setReviews] = useState(initialReviews);
  const [payments, setPayments] = useState(initialPayments);
  const [activities, setActivities] = useState(initialActivities);
  const [selectedConversationId, setSelectedConversationId] = useState(initialConversations[0]?.id ?? "");
  const [selectedReviewId, setSelectedReviewId] = useState(initialReviews[0]?.id ?? "");
  const [selectedContactId, setSelectedContactId] = useState(initialContacts[0]?.id ?? "");
  const [selectedPaymentId, setSelectedPaymentId] = useState(initialPayments[0]?.id ?? "");
  const [activityFilter, setActivityFilter] = useState<ActivityKind | "All">("All");
  const [isSalesforceTrackerExpanded, setIsSalesforceTrackerExpanded] = useState(false);
  const [isNewMessageFormOpen, setIsNewMessageFormOpen] = useState(false);
  const [newMessageContactName, setNewMessageContactName] = useState("");
  const [newMessagePhoneNumber, setNewMessagePhoneNumber] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [composerChannel, setComposerChannel] = useState<ComposerChannel>("SMS");
  const [composerBody, setComposerBody] = useState("");
  const [notice, setNotice] = useState("Communication center ready.");
  const [isCrmSyncing, setIsCrmSyncing] = useState(false);

  function applyCrmPayload(
    payload: {
      activities: ActivityEntry[];
      contacts: ContactProfile[];
      conversations: ConversationThread[];
      payments: PaymentRecord[];
      reviews: ReviewItem[];
    },
    overrides?: {
      selectedContactId?: string;
      selectedConversationId?: string;
      selectedPaymentId?: string;
      selectedReviewId?: string;
    }
  ) {
    setContacts(payload.contacts);
    setConversations(payload.conversations);
    setReviews(payload.reviews);
    setPayments(payload.payments);
    setActivities(payload.activities);

    const nextConversationId =
      (overrides?.selectedConversationId && payload.conversations.some((conversation) => conversation.id === overrides.selectedConversationId)
        ? overrides.selectedConversationId
        : payload.conversations.some((conversation) => conversation.id === selectedConversationId)
          ? selectedConversationId
          : payload.conversations[0]?.id) ?? "";
    const nextReviewId =
      (overrides?.selectedReviewId && payload.reviews.some((review) => review.id === overrides.selectedReviewId)
        ? overrides.selectedReviewId
        : payload.reviews.some((review) => review.id === selectedReviewId)
          ? selectedReviewId
          : payload.reviews[0]?.id) ?? "";
    const nextPaymentId =
      (overrides?.selectedPaymentId && payload.payments.some((payment) => payment.id === overrides.selectedPaymentId)
        ? overrides.selectedPaymentId
        : payload.payments.some((payment) => payment.id === selectedPaymentId)
          ? selectedPaymentId
          : payload.payments[0]?.id) ?? "";
    const nextContactId =
      (overrides?.selectedContactId && payload.contacts.some((contact) => contact.id === overrides.selectedContactId)
        ? overrides.selectedContactId
        : payload.contacts.some((contact) => contact.id === selectedContactId)
          ? selectedContactId
          : payload.conversations.find((conversation) => conversation.id === nextConversationId)?.contactId ?? payload.contacts[0]?.id) ?? "";

    setSelectedConversationId(nextConversationId);
    setSelectedReviewId(nextReviewId);
    setSelectedPaymentId(nextPaymentId);
    setSelectedContactId(nextContactId);
  }

  async function refreshCrmData(
    overrides?: {
      notice?: string;
      selectedContactId?: string;
      selectedConversationId?: string;
      selectedPaymentId?: string;
      selectedReviewId?: string;
      silent?: boolean;
    }
  ) {
    setIsCrmSyncing(true);

    try {
      const payload = await getCrmCommunicate(storeId);
      applyCrmPayload(payload, overrides);

      if (overrides?.notice) {
        setNotice(overrides.notice);
      }
    } catch (error) {
      if (!overrides?.silent) {
        setNotice(error instanceof Error ? error.message : "Unable to sync the communication center.");
      }
    } finally {
      setIsCrmSyncing(false);
    }
  }

  useEffect(() => {
    void refreshCrmData({ silent: true });
  }, [storeId]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const visibleConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        const contact = contacts.find((candidate) => candidate.id === conversation.contactId);

        return matchesSearch(
          [conversation.subject, conversation.preview, conversation.queueLabel, conversation.assignment, contact?.name ?? ""],
          normalizedSearch
        );
      }),
    [contacts, conversations, normalizedSearch]
  );

  const visibleReviews = useMemo(
    () => reviews.filter((review) => matchesSearch([review.author, review.platform, review.body, review.owner, review.state], normalizedSearch)),
    [normalizedSearch, reviews]
  );

  const visibleContacts = useMemo(
    () => contacts.filter((contact) => matchesSearch([contact.name, contact.owner, contact.email, contact.phone, contact.stage, ...contact.tags], normalizedSearch)),
    [contacts, normalizedSearch]
  );

  const visiblePayments = useMemo(
    () =>
      payments.filter((payment) =>
        matchesSearch([payment.customer, payment.invoice, payment.confirmation, payment.status, payment.owner, payment.detail], normalizedSearch)
      ),
    [normalizedSearch, payments]
  );

  const selectedConversation = visibleConversations.find((item) => item.id === selectedConversationId) ?? visibleConversations[0] ?? null;
  const selectedReview = visibleReviews.find((item) => item.id === selectedReviewId) ?? visibleReviews[0] ?? null;
  const selectedPayment = visiblePayments.find((item) => item.id === selectedPaymentId) ?? visiblePayments[0] ?? null;
  const selectedContact =
    contacts.find(
      (candidate) =>
        candidate.id ===
        (activeSection === "inbox"
          ? selectedConversation?.contactId
          : activeSection === "reviews"
            ? selectedReview?.contactId
            : activeSection === "payments"
              ? selectedPayment?.contactId
              : selectedContactId)
    ) ?? contacts[0];

  const selectedContactAllActivities = activities.filter((activity) => activity.contactId === selectedContact.id);
  const selectedContactActivities = selectedContactAllActivities
    .filter((activity) => activity.contactId === selectedContact.id)
    .filter((activity) => activityFilter === "All" || activity.kind === activityFilter);
  const selectedContactConversations = conversations.filter((conversation) => conversation.contactId === selectedContact.id);
  const selectedContactReviews = reviews.filter((review) => review.contactId === selectedContact.id);
  const selectedContactPayments = payments.filter((payment) => payment.contactId === selectedContact.id);

  const openTasksForSelectedContact = selectedContactAllActivities.filter(
    (activity) => activity.kind === "Task" && activity.state === "Open"
  );

  const salesforceTrackerEntries = useMemo(() => {
    const entries: SalesforceTrackerEntry[] = [];
    const hasQuoteActivity = selectedContactAllActivities.some((activity) => activity.kind === "Quote");
    const hasPaymentActivity = selectedContactAllActivities.some((activity) => activity.kind === "Payment");
    const hasReviewActivity = selectedContactAllActivities.some((activity) => activity.kind === "Review");

    if (!hasQuoteActivity) {
      entries.push({
        actor: selectedContact.owner,
        detail: `${selectedContact.stage} opportunity worth ${formatCurrency(selectedContact.opportunityValue)}. Next action: ${selectedContact.nextAction}.`,
        id: `tracker-opportunity-${selectedContact.id}`,
        isActionable: selectedContact.stage !== "Won",
        kind: "Quote",
        source: "Salesforce opportunity",
        stateLabel: selectedContact.stage,
        timeLabel: selectedContact.lastTouch,
        title: selectedContact.dealReference
      });
    }

    selectedContactConversations.forEach((conversation) => {
      [...conversation.messages].reverse().forEach((message) => {
        entries.push({
          actor: message.author,
          detail: message.body,
          id: `tracker-message-${message.id}`,
          isActionable: false,
          kind: conversation.channel === "SMS" ? "SMS" : "Email",
          source: conversation.subject,
          stateLabel: message.status,
          timeLabel: message.timeLabel,
          title: `${conversation.channel === "SMS" ? "SMS Text" : "Email"} ${message.direction === "inbound" ? "Received" : "Sent"}`
        });
      });
    });

    selectedContactAllActivities
      .filter((activity) => activity.kind !== "SMS" && activity.kind !== "Email")
      .forEach((activity) => {
        entries.push({
          actor: activity.owner,
          detail: activity.detail,
          id: `tracker-activity-${activity.id}`,
          isActionable: activity.state === "Open",
          kind: activity.kind,
          source: activity.source,
          stateLabel: activity.state,
          timeLabel: activity.timeLabel,
          title: activity.title
        });
      });

    if (!hasReviewActivity) {
      selectedContactReviews.forEach((review) => {
        entries.push({
          actor: review.author,
          detail: review.body,
          id: `tracker-review-${review.id}`,
          isActionable: review.state === "Needs Response",
          kind: "Review",
          source: `${review.platform} / Owner ${review.owner}`,
          stateLabel: review.state,
          timeLabel: review.postedAt,
          title: `${review.platform} review ${review.state === "Needs Response" ? "needs response" : "captured"}`
        });
      });
    }

    if (!hasPaymentActivity) {
      selectedContactPayments.forEach((payment) => {
        entries.push({
          actor: payment.owner,
          detail: `${payment.detail} for ${formatCurrency(payment.amount)} on invoice ${payment.invoice}.`,
          id: `tracker-payment-${payment.id}`,
          isActionable: payment.status !== "Paid" && payment.status !== "Refunded",
          kind: "Payment",
          source: `${payment.type} / ${payment.confirmation}`,
          stateLabel: payment.status,
          timeLabel: payment.createdAt,
          title: `${payment.status} payment update`
        });
      });
    }

    return entries.sort((left, right) => getSalesforceTrackerTimeScore(right.timeLabel) - getSalesforceTrackerTimeScore(left.timeLabel));
  }, [selectedContact, selectedContactAllActivities, selectedContactConversations, selectedContactPayments, selectedContactReviews]);

  const salesforceUpcomingEntries = salesforceTrackerEntries.filter((entry) => entry.isActionable);
  const salesforceHistoryGroups = useMemo(() => {
    const groups = new Map<string, SalesforceTrackerEntry[]>();

    salesforceTrackerEntries
      .filter((entry) => !entry.isActionable)
      .forEach((entry) => {
        const groupLabel = getSalesforceTrackerGroupLabel(entry.timeLabel);
        const currentGroup = groups.get(groupLabel);

        if (currentGroup) {
          currentGroup.push(entry);
          return;
        }

        groups.set(groupLabel, [entry]);
      });

    return [...groups.entries()].map(([label, entries]) => ({ label, entries }));
  }, [salesforceTrackerEntries]);

  function appendActivity(entry: Omit<ActivityEntry, "id">) {
    setActivities((current) => [{ id: `activity-${Date.now()}-${current.length}`, ...entry }, ...current]);
  }

  function updateContact(contactId: string, updates: Partial<ContactProfile>) {
    setContacts((current) => current.map((contact) => (contact.id === contactId ? { ...contact, ...updates } : contact)));
  }

  async function handlePersistQuickInfo() {
    try {
      await updateCrmContactQuickInfo(storeId, selectedContact.id, {
        name: selectedContact.name,
        phone: selectedContact.phone,
        email: selectedContact.email,
        stage: selectedContact.stage
      });
      await refreshCrmData({
        notice: `Quick info saved for ${selectedContact.name}.`,
        selectedContactId: selectedContact.id,
        selectedConversationId,
        selectedPaymentId,
        selectedReviewId
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save customer quick info.");
    }
  }

  function closeNewMessageForm() {
    setIsNewMessageFormOpen(false);
    setNewMessageContactName("");
    setNewMessagePhoneNumber("");
  }

  function handleOpenNewMessageForm() {
    setActiveSection("inbox");
    setComposerChannel("SMS");
    setIsSalesforceTrackerExpanded(false);
    setIsNewMessageFormOpen(true);
    setNotice("Add a name and phone number to stage a new inbox thread.");
  }

  async function handleCreateNewMessageThread() {
    const name = newMessageContactName.trim();
    const phone = newMessagePhoneNumber.trim();

    if (!name || !phone) {
      setNotice("Add both a name and phone number before creating the thread.");
      return;
    }

    try {
      const result = await createCrmThread(storeId, {
        actorName: operatorName,
        name,
        phone
      });

      setActiveSection("inbox");
      setSearchTerm("");
      setComposerChannel("SMS");
      setComposerBody("");
      setIsSalesforceTrackerExpanded(false);
      closeNewMessageForm();
      await refreshCrmData({
        notice: result.message,
        selectedContactId: result.contactId,
        selectedConversationId: result.conversationId
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create the new message thread.");
    }
  }

  async function handleQueueComposerAction() {
    const trimmedBody = composerBody.trim();

    if (!trimmedBody) {
      setNotice("Add a note or message before queuing the action.");
      return;
    }

    if (composerChannel === "SMS") {
      try {
        let targetConversationId = selectedConversation?.contactId === selectedContact.id ? selectedConversation.id : null;

        if (!targetConversationId) {
          const createdThread = await createCrmThread(storeId, {
            actorName: operatorName,
            name: selectedContact.name,
            phone: selectedContact.phone,
            email: selectedContact.email
          });
          targetConversationId = createdThread.conversationId;
        }

        const result = await sendCrmConversationSms(storeId, targetConversationId, {
          actorName: operatorName,
          body: trimmedBody
        });

        setComposerBody("");
        setActiveSection("inbox");
        await refreshCrmData({
          notice: `SMS sent to ${selectedContact.name}.`,
          selectedContactId: result.contactId,
          selectedConversationId: result.conversationId
        });
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Unable to send the SMS from Communicate.");
      }

      return;
    }

    const timeLabel = "Just now";
    const titlePrefix = composerChannel === "Task" ? "Task queued" : composerChannel === "Call Note" ? "Call logged" : `${composerChannel} queued`;

    if (composerChannel === "Email") {
      const nextMessage: ConversationMessage = {
        id: `message-${Date.now()}`,
        author: operatorName,
        body: trimmedBody,
        timeLabel,
        direction: "outbound",
        status: "Queued"
      };

      setConversations((current) => {
        const existingConversation = current.find((conversation) => conversation.contactId === selectedContact.id);

        if (!existingConversation) {
          const nextConversation: ConversationThread = {
            id: `thread-${Date.now()}`,
            contactId: selectedContact.id,
            channel: composerChannel,
            subject: "New email follow-up",
            preview: trimmedBody,
            queueLabel: "Open Conversations",
            assignment: selectedContact.owner,
            status: "Open",
            unreadCount: 0,
            lastTouch: timeLabel,
            messages: [nextMessage]
          };

          setSelectedConversationId(nextConversation.id);
          return [nextConversation, ...current];
        }

        const nextConversation = {
          ...existingConversation,
          channel: composerChannel,
          preview: trimmedBody,
          lastTouch: timeLabel,
          status: "Open" as ConversationStatus,
          messages: [...existingConversation.messages, nextMessage]
        };

        setSelectedConversationId(nextConversation.id);
        return [nextConversation, ...current.filter((conversation) => conversation.id !== existingConversation.id)];
      });
    }

    updateContact(selectedContact.id, {
      lastTouch: timeLabel,
      lastChannel: composerChannel,
      nextAction: composerChannel === "Task" ? trimmedBody : "Await customer response"
    });

    appendActivity({
      contactId: selectedContact.id,
      kind: composerChannel === "Call Note" ? "Call" : composerChannel === "Task" ? "Task" : composerChannel,
      title: titlePrefix,
      detail: trimmedBody,
      owner: operatorName,
      source: activeSection === "activity" ? "Salesforce activity" : "Communicate workflow",
      timeLabel,
      priority: composerChannel === "Task" ? "High" : "Normal",
      state: composerChannel === "Task" ? "Open" : "Done"
    });

    setComposerBody("");
    setActiveSection(composerChannel === "Task" ? "activity" : "inbox");
    setNotice(`${composerChannel} queued for ${selectedContact.name}.`);
  }

  function handleUseReviewTemplate(template: string) {
    setComposerBody(template);
    setComposerChannel("Email");
    setNotice("Review response draft loaded into the composer.");
  }

  function handleRespondToReview(review: ReviewItem) {
    setReviews((current) => current.map((item) => (item.id === review.id ? { ...item, state: "Responded" } : item)));
    appendActivity({
      contactId: review.contactId,
      kind: "Review",
      title: "Review response queued",
      detail: composerBody.trim() || `Response prepared for ${review.author}.`,
      owner: operatorName,
      source: "Reputation workflow",
      timeLabel: "Just now",
      priority: "Normal",
      state: "Done"
    });
    setNotice(`Review response queued for ${review.author}.`);
    setComposerBody("");
  }

  function handleSendPaymentLink(payment: PaymentRecord) {
    setPayments((current) =>
      current.map((item) => (item.id === payment.id ? { ...item, status: "Link Sent", reconciled: false } : item))
    );
    updateContact(payment.contactId, { openBalance: payment.amount, lastChannel: "SMS", lastTouch: "Just now" });
    appendActivity({
      contactId: payment.contactId,
      kind: "Payment",
      title: "Payment link queued",
      detail: `${payment.type} request sent for ${formatCurrency(payment.amount)} on invoice ${payment.invoice}.`,
      owner: operatorName,
      source: "Payments queue",
      timeLabel: "Just now",
      priority: "High",
      state: "Open"
    });
    setNotice(`Payment link queued for ${payment.customer}.`);
  }

  function handlePromiseToPay(payment: PaymentRecord) {
    setPayments((current) => current.map((item) => (item.id === payment.id ? { ...item, status: "Promise to Pay" } : item)));
    appendActivity({
      contactId: payment.contactId,
      kind: "Payment",
      title: "Promise to pay captured",
      detail: `${payment.customer} committed to the ${formatCurrency(payment.amount)} balance.`,
      owner: operatorName,
      source: "Collections follow-up",
      timeLabel: "Just now",
      priority: "High",
      state: "Open"
    });
    setNotice(`Promise to pay recorded for ${payment.customer}.`);
  }

  function renderListPane() {
    switch (activeSection) {
      case "inbox":
        return (
          <div className="crm-center-list-scroll">
            {visibleConversations.map((conversation) => {
              const contact = contacts.find((item) => item.id === conversation.contactId);

              return (
                <button
                  className={`crm-center-list-item${selectedConversation?.id === conversation.id ? " is-selected" : ""}`}
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversationId(conversation.id);
                    setSelectedContactId(conversation.contactId);
                  }}
                  type="button"
                >
                  <div className="crm-center-list-item-head">
                    <strong>{contact?.name ?? conversation.subject}</strong>
                    <span>{conversation.lastTouch}</span>
                  </div>
                  <span>{conversation.queueLabel} / {conversation.assignment}</span>
                  <p>{conversation.preview}</p>
                  <div className="crm-center-list-item-foot">
                    <span className={`crm-center-status-pill tone-${conversation.status.toLowerCase().replace(/\s+/g, "-")}`}>{conversation.status}</span>
                    {conversation.unreadCount > 0 ? <em>{conversation.unreadCount} unread</em> : <em>{conversation.channel}</em>}
                  </div>
                </button>
              );
            })}
          </div>
        );
      case "reviews":
        return (
          <div className="crm-center-list-scroll">
            {visibleReviews.map((review) => (
              <button
                className={`crm-center-list-item${selectedReview?.id === review.id ? " is-selected" : ""}`}
                key={review.id}
                onClick={() => {
                  setSelectedReviewId(review.id);
                  setSelectedContactId(review.contactId);
                }}
                type="button"
              >
                <div className="crm-center-list-item-head">
                  <strong>{review.author}</strong>
                  <span>{review.postedAt}</span>
                </div>
                <span>{review.platform} / {review.owner}</span>
                <p>{review.body}</p>
                <div className="crm-center-list-item-foot">
                  <span className="crm-center-stars">{"*".repeat(review.rating)}</span>
                  <em>{review.state}</em>
                </div>
              </button>
            ))}
          </div>
        );
      case "contacts":
      case "activity":
        return (
          <div className="crm-center-list-scroll">
            {visibleContacts.map((contact) => {
              const contactOpenTasks = activities.filter(
                (activity) => activity.contactId === contact.id && activity.kind === "Task" && activity.state === "Open"
              ).length;

              return (
                <button
                  className={`crm-center-list-item${selectedContact.id === contact.id ? " is-selected" : ""}`}
                  key={contact.id}
                  onClick={() => setSelectedContactId(contact.id)}
                  type="button"
                >
                  <div className="crm-center-list-item-head">
                    <strong>{contact.name}</strong>
                    <span>{contact.lastTouch}</span>
                  </div>
                  <span>{contact.stage} / {contact.owner}</span>
                  <p>{contact.nextAction}</p>
                  <div className="crm-center-list-item-foot">
                    <span className={`crm-center-status-pill tone-${getHealthTone(contact.healthScore)}`}>Health {contact.healthScore}</span>
                    <em>{contactOpenTasks} open task{contactOpenTasks === 1 ? "" : "s"}</em>
                  </div>
                </button>
              );
            })}
          </div>
        );
      case "payments":
        return (
          <div className="crm-center-list-scroll">
            {visiblePayments.map((payment) => (
              <button
                className={`crm-center-list-item${selectedPayment?.id === payment.id ? " is-selected" : ""}`}
                key={payment.id}
                onClick={() => {
                  setSelectedPaymentId(payment.id);
                  setSelectedContactId(payment.contactId);
                }}
                type="button"
              >
                <div className="crm-center-list-item-head">
                  <strong>{payment.customer}</strong>
                  <span>{payment.createdAt}</span>
                </div>
                <span>Invoice {payment.invoice} / {payment.owner}</span>
                <p>{payment.detail}</p>
                <div className="crm-center-list-item-foot">
                  <span className={`crm-center-status-pill tone-${payment.status.toLowerCase().replace(/\s+/g, "-")}`}>{payment.status}</span>
                  <em>{formatCurrency(payment.amount)}</em>
                </div>
              </button>
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  function renderInboxDetail() {
    if (!selectedConversation) {
      return <div className="crm-center-empty">No matching conversation.</div>;
    }

    return (
      <div className="crm-center-thread-stage">
        <div className="crm-center-detail-header">
          <div>
            <strong>{selectedContact.name}</strong>
            <span>{storeName} / {selectedConversation.assignment} / {selectedConversation.subject}</span>
          </div>
          <div className="crm-center-header-actions">
            <button onClick={() => setComposerChannel("SMS")} type="button">Text</button>
            <button onClick={() => setComposerChannel("Email")} type="button">Email</button>
            <button onClick={() => setComposerChannel("Task")} type="button">Task</button>
          </div>
        </div>

        <div className="crm-center-message-stack">
          {selectedConversation.messages.length === 0 ? (
            <div className="crm-center-empty">Thread ready. Draft the first SMS below.</div>
          ) : (
            selectedConversation.messages.map((message) => (
              <article className={`crm-center-message-bubble is-${message.direction}`} key={message.id}>
                <strong>{message.author}</strong>
                <p>{message.body}</p>
                <span>{message.timeLabel} / {message.status}</span>
              </article>
            ))
          )}
        </div>

        <div className="crm-center-composer-card">
          <div className="crm-center-composer-toolbar">
            {(["SMS", "Email", "Call Note", "Task"] as ComposerChannel[]).map((channel) => (
              <button
                className={composerChannel === channel ? "is-active" : ""}
                key={channel}
                onClick={() => setComposerChannel(channel)}
                type="button"
              >
                {channel}
              </button>
            ))}
          </div>
          <textarea
            onChange={(event) => setComposerBody(event.target.value)}
            placeholder={`Draft the next ${composerChannel.toLowerCase()} for ${selectedContact.name}...`}
            value={composerBody}
          />
          <div className="crm-center-composer-actions">
            <button className="is-primary" onClick={handleQueueComposerAction} type="button">
              {composerChannel === "Task" ? "Create Task" : composerChannel === "Call Note" ? "Log Call" : "Queue Send"}
            </button>
            <button onClick={() => setComposerBody("")} type="button">Clear</button>
            <button onClick={() => setNotice(`Follow-up scheduled for ${selectedContact.name}.`)} type="button">Schedule</button>
          </div>
        </div>
      </div>
    );
  }

  function renderReviewsDetail() {
    if (!selectedReview) {
      return <div className="crm-center-empty">No matching review.</div>;
    }

    return (
      <div className="crm-center-review-stage">
        <div className="crm-center-detail-header">
          <div>
            <strong>{selectedReview.author}</strong>
            <span>{selectedReview.platform} / {selectedReview.postedAt} / Owner: {selectedReview.owner}</span>
          </div>
          <div className="crm-center-header-actions">
            <button onClick={() => setComposerChannel("Email")} type="button">Email Reply</button>
            <button onClick={() => setNotice(`Escalation note added for ${selectedReview.author}.`)} type="button">Escalate</button>
          </div>
        </div>
        <article className="crm-center-review-card">
          <div className="crm-center-stars">{"*".repeat(selectedReview.rating)}</div>
          <p>{selectedReview.body}</p>
          <span>{selectedReview.state}</span>
        </article>
        <div className="crm-center-template-grid">
          {reviewResponseTemplates.map((template) => (
            <button key={template} onClick={() => handleUseReviewTemplate(template)} type="button">
              {template}
            </button>
          ))}
        </div>
        <div className="crm-center-composer-card">
          <textarea
            onChange={(event) => setComposerBody(event.target.value)}
            placeholder="Draft the response that should be queued from Communicate..."
            value={composerBody}
          />
          <div className="crm-center-composer-actions">
            <button className="is-primary" onClick={() => handleRespondToReview(selectedReview)} type="button">Queue Response</button>
            <button onClick={() => setNotice(`Review request follow-up staged for ${selectedContact.name}.`)} type="button">Request Another Review</button>
          </div>
        </div>
      </div>
    );
  }

  function renderContactsDetail() {
    return (
      <div className="crm-center-contact-stage">
        <div className="crm-center-detail-header">
          <div>
            <strong>{selectedContact.name}</strong>
            <span>{storeName} / {selectedContact.stage} / {selectedContact.owner}</span>
          </div>
          <div className="crm-center-header-actions">
            <button onClick={() => setComposerChannel("SMS")} type="button">Message</button>
            <button onClick={() => setComposerChannel("Task")} type="button">Task</button>
            <button onClick={() => setNotice(`Appointment board opened for ${selectedContact.name}.`)} type="button">Appointment</button>
          </div>
        </div>
        <div className="crm-center-contact-grid">
          <article className="crm-center-card-panel">
            <h3>Contact Information</h3>
            <dl>
              <div><dt>Phone</dt><dd>{selectedContact.phone}</dd></div>
              <div><dt>Email</dt><dd>{selectedContact.email}</dd></div>
              <div><dt>Company</dt><dd>{selectedContact.company}</dd></div>
              <div><dt>Deal</dt><dd>{selectedContact.dealReference}</dd></div>
            </dl>
          </article>
          <article className="crm-center-card-panel">
            <h3>Permissions</h3>
            <div className="crm-center-chip-row">
              <span className="crm-center-status-pill tone-stable">Text {selectedContact.consentText}</span>
              <span className="crm-center-status-pill tone-stable">Email {selectedContact.consentEmail}</span>
            </div>
            <p>Last touch: {selectedContact.lastTouch} via {selectedContact.lastChannel}.</p>
            <p>Next action: {selectedContact.nextAction}.</p>
          </article>
          <article className="crm-center-card-panel">
            <h3>Opportunity Snapshot</h3>
            <strong>{formatCurrency(selectedContact.opportunityValue)}</strong>
            <p>{selectedContact.stage} / {selectedContact.location} / {selectedContact.owner}</p>
            <div className="crm-center-chip-row">
              {selectedContact.tags.map((tag) => <span className="crm-center-status-pill tone-neutral" key={tag}>{tag}</span>)}
            </div>
          </article>
          <article className="crm-center-card-panel">
            <h3>Salesforce Sync</h3>
            <dl>
              <div><dt>Contact ID</dt><dd>{selectedContact.integrationId}</dd></div>
              <div><dt>Last Sync</dt><dd>2 minutes ago</dd></div>
              <div><dt>Open Tasks</dt><dd>{openTasksForSelectedContact.length}</dd></div>
              <div><dt>Review Score</dt><dd>{selectedContact.reviewScore > 0 ? `${selectedContact.reviewScore.toFixed(1)} / 5` : "No review yet"}</dd></div>
            </dl>
          </article>
        </div>
        <div className="crm-center-composer-card">
          <textarea
            onChange={(event) => setComposerBody(event.target.value)}
            placeholder={`Capture a note, task, or next best action for ${selectedContact.name}...`}
            value={composerBody}
          />
          <div className="crm-center-composer-actions">
            <button className="is-primary" onClick={handleQueueComposerAction} type="button">Queue Action</button>
            <button onClick={() => setNotice(`Account plan pinned for ${selectedContact.name}.`)} type="button">Pin Account Plan</button>
          </div>
        </div>
      </div>
    );
  }

  function renderPaymentsDetail() {
    if (!selectedPayment) {
      return <div className="crm-center-empty">No matching payment item.</div>;
    }

    return (
      <div className="crm-center-payment-stage">
        <div className="crm-center-detail-header">
          <div>
            <strong>{selectedPayment.customer}</strong>
            <span>Invoice {selectedPayment.invoice} / {selectedPayment.type} / {selectedPayment.owner}</span>
          </div>
          <div className="crm-center-header-actions">
            <button className="is-primary" onClick={() => handleSendPaymentLink(selectedPayment)} type="button">Send Pay Link</button>
            <button onClick={() => handlePromiseToPay(selectedPayment)} type="button">Promise to Pay</button>
          </div>
        </div>
        <div className="crm-center-payment-grid">
          <article className="crm-center-card-panel">
            <h3>Transaction</h3>
            <strong>{formatCurrency(selectedPayment.amount)}</strong>
            <p>{selectedPayment.detail}</p>
            <dl>
              <div><dt>Status</dt><dd>{selectedPayment.status}</dd></div>
              <div><dt>Confirmation</dt><dd>{selectedPayment.confirmation}</dd></div>
              <div><dt>Reconciled</dt><dd>{selectedPayment.reconciled ? "Yes" : "No"}</dd></div>
            </dl>
          </article>
          <article className="crm-center-card-panel">
            <h3>Collections Plan</h3>
            <p>{selectedContact.nextAction}</p>
            <div className="crm-center-chip-row">
              <span className="crm-center-status-pill tone-attention">Open balance {formatCurrency(selectedContact.openBalance || selectedPayment.amount)}</span>
              <span className="crm-center-status-pill tone-neutral">Owner {selectedPayment.owner}</span>
            </div>
          </article>
        </div>
        <table className="crm-center-compact-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Invoice</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {payments.filter((payment) => payment.contactId === selectedContact.id).map((payment) => (
              <tr key={payment.id}>
                <td>{payment.createdAt}</td>
                <td>{payment.invoice}</td>
                <td>{formatCurrency(payment.amount)}</td>
                <td>{payment.status}</td>
                <td>{payment.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderActivityDetail() {
    return (
      <div className="crm-center-activity-stage">
        <div className="crm-center-detail-header">
          <div>
            <strong>{selectedContact.name}</strong>
            <span>Salesforce activity timeline fused with Communicate tasks and responses</span>
          </div>
          <div className="crm-center-header-actions crm-center-filter-row">
            {(["All", "SMS", "Email", "Call", "Task", "Review", "Payment", "Quote"] as Array<ActivityKind | "All">).map((kind) => (
              <button className={activityFilter === kind ? "is-active" : ""} key={kind} onClick={() => setActivityFilter(kind)} type="button">
                {kind}
              </button>
            ))}
          </div>
        </div>
        <div className="crm-center-activity-feed">
          {selectedContactActivities.map((activity) => (
            <article className="crm-center-activity-row" key={activity.id}>
              <div className={`crm-center-activity-kind tone-${activity.kind.toLowerCase()}`}>{activity.kind}</div>
              <div>
                <strong>{activity.title}</strong>
                <p>{activity.detail}</p>
                <span>{activity.source} / {activity.owner} / {activity.timeLabel}</span>
              </div>
              <div className="crm-center-activity-meta">
                <span className={`crm-center-status-pill tone-${activity.priority.toLowerCase()}`}>{activity.priority}</span>
                <em>{activity.state}</em>
              </div>
            </article>
          ))}
        </div>
        <div className="crm-center-composer-card">
          <textarea
            onChange={(event) => setComposerBody(event.target.value)}
            placeholder={`Log the next activity for ${selectedContact.name}...`}
            value={composerBody}
          />
          <div className="crm-center-composer-actions">
            <button className="is-primary" onClick={handleQueueComposerAction} type="button">Log Activity</button>
            <button onClick={() => setComposerChannel("Task")} type="button">Switch to Task</button>
          </div>
        </div>
      </div>
    );
  }

  function renderDetailPane() {
    switch (activeSection) {
      case "inbox":
        return renderInboxDetail();
      case "reviews":
        return renderReviewsDetail();
      case "contacts":
        return renderContactsDetail();
      case "payments":
        return renderPaymentsDetail();
      case "activity":
        return renderActivityDetail();
      default:
        return null;
    }
  }

  return (
    <div className="crm-center-shell">
      <div className="crm-center-stage">
        <aside className="crm-center-nav-rail">
          <div className="crm-center-nav-title">
            <strong>Communicate</strong>
            <span>{storeName}</span>
          </div>
          {communicationSections.map((section) => (
            <button
              className={`crm-center-nav-button${activeSection === section.id ? " is-active" : ""}`}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              <span className="crm-center-nav-short">{section.shortLabel}</span>
              <span>
                <strong>{section.label}</strong>
                <small>{getActivityCountLabel(section.id, { activities, contacts, conversations, payments, reviews })} {section.countLabel}</small>
              </span>
            </button>
          ))}
          <div className="crm-center-nav-footer">
            <strong>All Insights</strong>
            <p>Response, reputation, collections, and Salesforce activity stay visible in one page.</p>
          </div>
        </aside>

        <div className="crm-center-main-stage">
          <div className="crm-center-workspace-header">
            <div>
              <strong>CRM Communication Center</strong>
              <span>{storeName} / Operator: {operatorName} / Lightspeed-styled command view</span>
            </div>
            <div className="crm-center-header-actions">
              <button onClick={handleOpenNewMessageForm} type="button">New Message</button>
              <button onClick={() => setActiveSection("reviews")} type="button">Request Review</button>
              <button onClick={() => setActiveSection("payments")} type="button">Collect Payment</button>
            </div>
          </div>

          {isNewMessageFormOpen ? (
            <div className="crm-center-quick-create-panel">
              <div className="crm-center-quick-create-copy">
                <strong>New message thread</strong>
                <span>Add a customer name and phone number, then stage the conversation directly into Inbox.</span>
              </div>
              <div className="crm-center-quick-create-form">
                <label>
                  <span>Name</span>
                  <input
                    onChange={(event) => setNewMessageContactName(event.target.value)}
                    placeholder="Customer name"
                    type="text"
                    value={newMessageContactName}
                  />
                </label>
                <label>
                  <span>Phone Number</span>
                  <input
                    onChange={(event) => setNewMessagePhoneNumber(event.target.value)}
                    placeholder="(555) 555-0100"
                    type="tel"
                    value={newMessagePhoneNumber}
                  />
                </label>
                <div className="crm-center-quick-create-actions">
                  <button className="is-primary" onClick={handleCreateNewMessageThread} type="button">Create Thread</button>
                  <button onClick={closeNewMessageForm} type="button">Cancel</button>
                </div>
              </div>
            </div>
          ) : null}

          {notice ? <div className="crm-center-notice">{notice}</div> : null}

          <div className="crm-center-content-grid">
            <section className="crm-center-panel crm-center-list-panel">
              <div className="crm-center-panel-header">
                <div>
                  <strong>{communicationSections.find((section) => section.id === activeSection)?.label}</strong>
                  <span>Search and work the live queue without leaving the shell.</span>
                </div>
                <input
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search queue, contact, owner, or status"
                  type="search"
                  value={searchTerm}
                />
              </div>
              {renderListPane()}
            </section>

            <section className="crm-center-panel crm-center-detail-panel">{renderDetailPane()}</section>

            <aside className={`crm-center-panel crm-center-side-panel${isSalesforceTrackerExpanded ? " is-salesforce-expanded" : ""}`}>
              {isSalesforceTrackerExpanded ? null : (
                <section className="crm-center-side-card">
                  <div className="crm-center-side-header">
                    <div className="crm-center-avatar">{buildContactInitials(selectedContact.name)}</div>
                    <div>
                      <strong>{selectedContact.name}</strong>
                      <span>{selectedContact.location} / {selectedContact.owner}</span>
                    </div>
                    <button
                      className="crm-center-side-edit-button"
                      disabled={isCrmSyncing}
                      onClick={() => {
                        void handlePersistQuickInfo();
                      }}
                      type="button"
                    >
                      Quick Info
                    </button>
                  </div>
                  <div className="crm-center-side-edit-grid">
                    <label>
                      <span>Customer Name</span>
                      <input
                        onChange={(event) => updateContact(selectedContact.id, { name: event.target.value })}
                        type="text"
                        value={selectedContact.name}
                      />
                    </label>
                    <label>
                      <span>Phone</span>
                      <input
                        onChange={(event) => updateContact(selectedContact.id, { phone: event.target.value })}
                        type="tel"
                        value={selectedContact.phone}
                      />
                    </label>
                    <label>
                      <span>Email</span>
                      <input
                        onChange={(event) => updateContact(selectedContact.id, { email: event.target.value })}
                        type="email"
                        value={selectedContact.email}
                      />
                    </label>
                    <label>
                      <span>Stage</span>
                      <select
                        onChange={(event) => updateContact(selectedContact.id, { stage: event.target.value })}
                        value={selectedContact.stage}
                      >
                        {["Lead", "Qualified", "Quoted", "Negotiation", "Won", "Lost"].map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="crm-center-side-metrics">
                    <div>
                      <span>Health</span>
                      <strong>{selectedContact.healthScore}</strong>
                    </div>
                    <div>
                      <span>Stage</span>
                      <strong>{selectedContact.stage}</strong>
                    </div>
                    <div>
                      <span>Open balance</span>
                      <strong>{formatCurrency(selectedContact.openBalance)}</strong>
                    </div>
                  </div>
                  <div className="crm-center-chip-row">
                    <span className={`crm-center-status-pill tone-${getHealthTone(selectedContact.healthScore)}`}>Health {selectedContact.healthScore}</span>
                    <span className="crm-center-status-pill tone-neutral">{selectedContact.lastChannel}</span>
                  </div>
                </section>
              )}

              <section className={`crm-center-side-card crm-center-salesforce-card${isSalesforceTrackerExpanded ? " is-expanded" : ""}`}>
                <div className="crm-center-salesforce-header">
                  <strong>Tracker Log</strong>
                </div>

                <div className="crm-center-salesforce-filters">
                  <span className="crm-center-salesforce-filter-summary">Filters: Within 2 months • All activities • All types</span>
                  <div className="crm-center-salesforce-filter-actions">
                    <button onClick={() => {
                      void refreshCrmData({
                        notice: "Activity log refreshed.",
                        selectedContactId: selectedContact.id,
                        selectedConversationId,
                        selectedPaymentId,
                        selectedReviewId
                      });
                    }} type="button">Refresh</button>
                    <button onClick={() => setNotice("Expanded all visible activity groups.")} type="button">Expand All</button>
                    <button onClick={() => {
                      setActiveSection("activity");
                      setNotice(`Full activity view opened for ${selectedContact.name}.`);
                    }} type="button">View All</button>
                  </div>
                </div>

                <div className="crm-center-salesforce-feed">
                  <section className="crm-center-salesforce-group">
                    <div className="crm-center-salesforce-group-header">
                      <strong>Upcoming &amp; Overdue</strong>
                      <span>{salesforceUpcomingEntries.length === 0 ? "No activities" : `${salesforceUpcomingEntries.length} open`}</span>
                    </div>
                    <div className="crm-center-salesforce-group-body">
                      {salesforceUpcomingEntries.length === 0 ? (
                        <div className="crm-center-salesforce-empty">
                          <strong>No activities to show.</strong>
                          <p>Get started by sending an email, scheduling a task, and more.</p>
                        </div>
                      ) : (
                        <div className="crm-center-salesforce-list">
                          {salesforceUpcomingEntries.map((entry) => (
                            <article className="crm-center-salesforce-entry" key={entry.id}>
                              <div className="crm-center-salesforce-entry-marker">
                                <div className={`crm-center-salesforce-entry-icon tone-${entry.kind.toLowerCase()}`}>{getSalesforceTrackerKindCode(entry.kind)}</div>
                              </div>
                              <div className="crm-center-salesforce-entry-copy">
                                <strong>{entry.title}</strong>
                                <p>{entry.detail}</p>
                                <span>{entry.actor} / {entry.source}</span>
                              </div>
                              <div className="crm-center-salesforce-entry-meta">
                                <span>{entry.timeLabel}</span>
                                <em>{entry.stateLabel}</em>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  {salesforceHistoryGroups.map((group) => (
                    <section className="crm-center-salesforce-group" key={group.label}>
                      <div className="crm-center-salesforce-group-header">
                        <strong>{group.label}</strong>
                        <span>{group.entries.length === 1 ? "1 activity" : `${group.entries.length} activities`}</span>
                      </div>
                      <div className="crm-center-salesforce-group-body">
                        <div className="crm-center-salesforce-list">
                          {group.entries.map((entry) => (
                            <article className="crm-center-salesforce-entry" key={entry.id}>
                              <div className="crm-center-salesforce-entry-marker">
                                <div className={`crm-center-salesforce-entry-icon tone-${entry.kind.toLowerCase()}`}>{getSalesforceTrackerKindCode(entry.kind)}</div>
                              </div>
                              <div className="crm-center-salesforce-entry-copy">
                                <strong>{entry.title}</strong>
                                <p>{entry.detail}</p>
                                <span>{entry.actor} / {entry.source}</span>
                              </div>
                              <div className="crm-center-salesforce-entry-meta">
                                <span>{entry.timeLabel}</span>
                                <em>{entry.stateLabel}</em>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    </section>
                  ))}
                </div>

                <button className="crm-center-salesforce-show-all" onClick={() => {
                  const nextExpanded = !isSalesforceTrackerExpanded;
                  setIsSalesforceTrackerExpanded(nextExpanded);
                  setNotice(nextExpanded ? `Full Salesforce-style activity log opened for ${selectedContact.name}.` : `Salesforce-style activity log collapsed for ${selectedContact.name}.`);
                }} type="button">{isSalesforceTrackerExpanded ? "Collapse Activities" : "Show All Activities"}</button>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}