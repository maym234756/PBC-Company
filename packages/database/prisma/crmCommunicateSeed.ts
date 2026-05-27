import type { PrismaClient } from "../src/generated/client.js";

const baseContacts = [
  {
    id: "contact-james-green",
    name: "James Green",
    owner: "Christopher Koehl",
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
] as const;

const baseConversations = [
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
] as const;

const baseReviews = [
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
] as const;

const basePayments = [
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
] as const;

const baseActivities = [
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
] as const;

function createSeedId(storeCode: string, id: string) {
  return `${storeCode.toLowerCase()}-${id}`;
}

function parseClockParts(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return { hours: 9, minutes: 0 };
  }

  const rawHours = Number.parseInt(match[1], 10) % 12;
  const minutes = Number.parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  return {
    hours: rawHours + (meridiem === "PM" ? 12 : 0),
    minutes
  };
}

function setTime(date: Date, value: string) {
  const { hours, minutes } = parseClockParts(value);
  const nextDate = new Date(date);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
}

function createTimestampFromLabel(label: string) {
  const trimmed = label.trim();
  const now = new Date();

  if (/^just now$/i.test(trimmed)) {
    return now;
  }

  const todayMatch = trimmed.match(/^today\s+(.+)$/i);

  if (todayMatch) {
    return setTime(now, todayMatch[1]);
  }

  const weekdayMatch = trimmed.match(/^(mon|tue|wed|thu|fri|sat|sun)\s+(.+)$/i);

  if (weekdayMatch) {
    const weekdayMap = new Map([
      ["sun", 0],
      ["mon", 1],
      ["tue", 2],
      ["wed", 3],
      ["thu", 4],
      ["fri", 5],
      ["sat", 6]
    ]);
    const targetDay = weekdayMap.get(weekdayMatch[1].toLowerCase()) ?? now.getDay();
    const diff = (now.getDay() - targetDay + 7) % 7 || 7;
    const baseDate = new Date(now);
    baseDate.setDate(now.getDate() - diff);
    return setTime(baseDate, weekdayMatch[2]);
  }

  const numericMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(.+)$/);

  if (numericMatch) {
    const month = Number.parseInt(numericMatch[1], 10) - 1;
    const day = Number.parseInt(numericMatch[2], 10);
    const year = 2000 + Number.parseInt(numericMatch[3], 10);
    return setTime(new Date(year, month, day), numericMatch[4]);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? now : parsed;
}

export async function seedCrmCommunicateFixtures(
  prisma: PrismaClient,
  stores: Array<{ code: string; name: string }>,
  storeIds: Map<string, string>
) {
  await prisma.crmMessage.deleteMany();
  await prisma.crmActivity.deleteMany();
  await prisma.crmReview.deleteMany();
  await prisma.crmPayment.deleteMany();
  await prisma.crmConversation.deleteMany();
  await prisma.crmContact.deleteMany();

  for (const store of stores) {
    const storeId = storeIds.get(store.code);

    if (!storeId) {
      continue;
    }

    const contactIdMap = new Map<string, string>();

    for (const contact of baseContacts) {
      const contactId = createSeedId(store.code, contact.id);
      contactIdMap.set(contact.id, contactId);

      await prisma.crmContact.create({
        data: {
          id: contactId,
          name: contact.name,
          owner: contact.owner,
          location: store.name,
          phone: contact.phone,
          email: contact.email,
          company: contact.company,
          stage: contact.stage,
          tagsJson: JSON.stringify(contact.tags),
          consentText: contact.consentText,
          consentEmail: contact.consentEmail,
          lastTouchLabel: contact.lastTouch,
          lastTouchAt: createTimestampFromLabel(contact.lastTouch),
          lastChannel: contact.lastChannel,
          nextAction: contact.nextAction,
          healthScore: contact.healthScore,
          openBalance: contact.openBalance,
          opportunityValue: contact.opportunityValue,
          reviewScore: contact.reviewScore,
          integrationId: `${store.code}-${contact.integrationId}`,
          dealReference: contact.dealReference,
          storeId
        }
      });
    }

    for (const conversation of baseConversations) {
      const conversationId = createSeedId(store.code, conversation.id);
      const contactId = contactIdMap.get(conversation.contactId);

      if (!contactId) {
        continue;
      }

      await prisma.crmConversation.create({
        data: {
          id: conversationId,
          storeId,
          contactId,
          channel: conversation.channel,
          subject: conversation.subject,
          preview: conversation.preview,
          queueLabel: conversation.queueLabel,
          assignment: conversation.assignment,
          status: conversation.status,
          unreadCount: conversation.unreadCount,
          lastTouchLabel: conversation.lastTouch,
          lastTouchAt: createTimestampFromLabel(conversation.lastTouch),
          messages: {
            create: conversation.messages.map((message) => ({
              id: createSeedId(store.code, message.id),
              author: message.author,
              body: message.body,
              timeLabel: message.timeLabel,
              direction: message.direction,
              status: message.status,
              channel: conversation.channel,
              source: "Seeded communication",
              storeId,
              contactId,
              createdAt: createTimestampFromLabel(message.timeLabel)
            }))
          }
        }
      });
    }

    for (const review of baseReviews) {
      const contactId = contactIdMap.get(review.contactId);

      if (!contactId) {
        continue;
      }

      await prisma.crmReview.create({
        data: {
          id: createSeedId(store.code, review.id),
          storeId,
          contactId,
          author: review.author,
          platform: review.platform,
          rating: review.rating,
          postedAtLabel: review.postedAt,
          postedAt: createTimestampFromLabel(review.postedAt),
          body: review.body,
          owner: review.owner,
          state: review.state
        }
      });
    }

    for (const payment of basePayments) {
      const contactId = contactIdMap.get(payment.contactId);

      if (!contactId) {
        continue;
      }

      await prisma.crmPayment.create({
        data: {
          id: createSeedId(store.code, payment.id),
          storeId,
          contactId,
          createdAtLabel: payment.createdAt,
          recordedAt: createTimestampFromLabel(payment.createdAt),
          customer: payment.customer,
          confirmation: payment.confirmation,
          invoice: payment.invoice,
          amount: payment.amount,
          type: payment.type,
          status: payment.status,
          reconciled: payment.reconciled,
          owner: payment.owner,
          detail: payment.detail
        }
      });
    }

    for (const activity of baseActivities) {
      const contactId = contactIdMap.get(activity.contactId);

      if (!contactId) {
        continue;
      }

      await prisma.crmActivity.create({
        data: {
          id: createSeedId(store.code, activity.id),
          storeId,
          contactId,
          kind: activity.kind,
          title: activity.title,
          detail: activity.detail,
          owner: activity.owner,
          source: activity.source,
          timeLabel: activity.timeLabel,
          priority: activity.priority,
          state: activity.state,
          occurredAt: createTimestampFromLabel(activity.timeLabel)
        }
      });
    }
  }
}