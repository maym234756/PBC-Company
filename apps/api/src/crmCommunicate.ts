import { prisma } from "@marine-cloud/database";
import {
  TWILIO_STATUS_WEBHOOK_PATH,
  buildTwilioMessagePayload,
  getTwilioAuthorizationHeader,
  getTwilioMessagesEndpoint,
  getTwilioMessagingConfig,
  getTwilioMissingConfig,
  getTwilioWebhookUrl
} from "./twilioMessaging.js";

interface CreateCrmThreadInput {
  actorName: string;
  company?: string;
  email?: string;
  interestLane?: string;
  message?: string;
  name: string;
  phone: string;
  source?: "communicate" | "landing-page";
  timeline?: string;
}

interface SendCrmConversationSmsInput {
  actorName: string;
  body: string;
}

function parseTags(tagsJson: string) {
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function formatClockLabel(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatLiveTimeLabel(date: Date) {
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - date.getTime());

  if (diffMs < 90_000) {
    return "Just now";
  }

  if (isSameDay(now, date)) {
    return `Today ${formatClockLabel(date)}`;
  }

  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return `${date.toLocaleDateString("en-US", { weekday: "short" })} ${formatClockLabel(date)}`;
  }

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const year = `${date.getFullYear()}`.slice(-2);
  return `${month}/${day}/${year} ${formatClockLabel(date)}`;
}

function normalizeMessageStatus(status: string | null | undefined, direction: "inbound" | "outbound") {
  const normalized = (status ?? "").trim().toLowerCase();

  switch (normalized) {
    case "queued":
      return "Queued";
    case "sent":
      return "Sent";
    case "delivered":
      return "Delivered";
    case "undelivered":
      return "Undelivered";
    case "failed":
      return "Failed";
    case "receiving":
      return "Receiving";
    case "received":
      return "Received";
    default:
      return direction === "inbound" ? "Received" : "Delivered";
  }
}

function parseTwilioBody(bodyText: string) {
  if (!bodyText.trim()) {
    return null;
  }

  try {
    return JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    return { raw: bodyText };
  }
}

async function resolveStore(storeId: string) {
  return prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, code: true, name: true }
  });
}

export async function getCrmCommunicatePayload(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      crmContacts: {
        orderBy: [{ lastTouchAt: "desc" }, { name: "asc" }]
      },
      crmConversations: {
        orderBy: [{ lastTouchAt: "desc" }, { createdAt: "desc" }],
        include: {
          messages: {
            orderBy: { createdAt: "asc" }
          }
        }
      },
      crmReviews: {
        orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }]
      },
      crmPayments: {
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }]
      },
      crmActivities: {
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  if (!store) {
    return null;
  }

  return {
    contacts: store.crmContacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      owner: contact.owner,
      location: contact.location,
      phone: contact.phone,
      email: contact.email,
      company: contact.company,
      stage: contact.stage,
      tags: parseTags(contact.tagsJson),
      consentText: contact.consentText,
      consentEmail: contact.consentEmail,
      lastTouch: contact.lastTouchLabel,
      lastChannel: contact.lastChannel,
      nextAction: contact.nextAction,
      healthScore: contact.healthScore,
      openBalance: contact.openBalance,
      opportunityValue: contact.opportunityValue,
      reviewScore: contact.reviewScore,
      integrationId: contact.integrationId,
      dealReference: contact.dealReference
    })),
    conversations: store.crmConversations.map((conversation) => ({
      id: conversation.id,
      contactId: conversation.contactId,
      channel: conversation.channel,
      subject: conversation.subject,
      preview: conversation.preview,
      queueLabel: conversation.queueLabel,
      assignment: conversation.assignment,
      status: conversation.status,
      unreadCount: conversation.unreadCount,
      lastTouch: conversation.lastTouchLabel,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        author: message.author,
        body: message.body,
        timeLabel: message.timeLabel,
        direction: message.direction,
        status: message.status
      }))
    })),
    reviews: store.crmReviews.map((review) => ({
      id: review.id,
      contactId: review.contactId,
      author: review.author,
      platform: review.platform,
      rating: review.rating,
      postedAt: review.postedAtLabel,
      body: review.body,
      owner: review.owner,
      state: review.state
    })),
    payments: store.crmPayments.map((payment) => ({
      id: payment.id,
      contactId: payment.contactId,
      createdAt: payment.createdAtLabel,
      customer: payment.customer,
      confirmation: payment.confirmation,
      invoice: payment.invoice,
      amount: payment.amount,
      type: payment.type,
      status: payment.status,
      reconciled: payment.reconciled,
      owner: payment.owner,
      detail: payment.detail
    })),
    activities: store.crmActivities.map((activity) => ({
      id: activity.id,
      contactId: activity.contactId,
      kind: activity.kind,
      title: activity.title,
      detail: activity.detail,
      owner: activity.owner,
      source: activity.source,
      timeLabel: activity.timeLabel,
      priority: activity.priority,
      state: activity.state
    }))
  };
}

export async function updateCrmContactQuickInfo(
  storeId: string,
  contactId: string,
  updates: { email?: string; name?: string; phone?: string; stage?: string }
) {
  const contact = await prisma.crmContact.findFirst({
    where: { id: contactId, storeId },
    select: { id: true, name: true }
  });

  if (!contact) {
    return null;
  }

  await prisma.crmContact.update({
    where: { id: contactId },
    data: {
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.phone !== undefined ? { phone: updates.phone.trim() } : {}),
      ...(updates.email !== undefined ? { email: updates.email.trim() } : {}),
      ...(updates.stage !== undefined ? { stage: updates.stage.trim() } : {}),
      ...(updates.name !== undefined && updates.name.trim() ? { company: updates.name.trim() } : {})
    }
  });

  return { contactId };
}

export async function createCrmCommunicateThread(storeId: string, input: CreateCrmThreadInput) {
  const store = await resolveStore(storeId);

  if (!store) {
    return null;
  }

  const now = new Date();
  const timeLabel = formatLiveTimeLabel(now);
  const isLandingPageIntake = input.source === "landing-page";
  const normalizedCompany = input.company?.trim() || input.name.trim();
  const normalizedInterestLane = input.interestLane?.trim() ?? "";
  const normalizedTimeline = input.timeline?.trim() ?? "";
  const normalizedMessage = input.message?.trim() ?? "";
  const previewText = normalizedMessage
    ? normalizedMessage.length > 120
      ? `${normalizedMessage.slice(0, 117)}...`
      : normalizedMessage
    : isLandingPageIntake
      ? "Launch review request ready for follow-up."
      : "Ready for first outbound SMS.";
  const contactTags = ["New Message"];

  if (isLandingPageIntake) {
    contactTags.unshift("Launch Intake");
  }

  if (normalizedInterestLane) {
    contactTags.push(normalizedInterestLane);
  }

  if (normalizedTimeline) {
    contactTags.push(`${normalizedTimeline} Timeline`);
  }

  if (normalizedMessage) {
    contactTags.push("Needs Follow-Up");
  }

  const contact = await prisma.crmContact.create({
    data: {
      name: input.name.trim(),
      owner: input.actorName.trim(),
      location: store.name,
      phone: input.phone.trim(),
      email: input.email?.trim() ?? "",
      company: normalizedCompany,
      stage: "Lead",
      tagsJson: JSON.stringify(contactTags),
      consentText: "Allowed",
      consentEmail: "Pending",
      lastTouchLabel: timeLabel,
      lastTouchAt: now,
      lastChannel: "SMS",
      nextAction: isLandingPageIntake ? "Review launch intake request" : "Draft first outbound message",
      healthScore: 72,
      openBalance: 0,
      opportunityValue: 0,
      reviewScore: 0,
      integrationId: `PENDING-${now.getTime()}`,
      dealReference: isLandingPageIntake ? normalizedInterestLane || "Launch Review" : "New Conversation",
      storeId
    }
  });

  const conversation = await prisma.crmConversation.create({
    data: {
      storeId,
      contactId: contact.id,
      channel: "SMS",
      subject: isLandingPageIntake ? "Premier Marine launch review request" : "New text conversation",
      preview: previewText,
      queueLabel: isLandingPageIntake ? "Launch Requests" : "Open Conversations",
      assignment: input.actorName.trim(),
      status: "Open",
      unreadCount: 0,
      lastTouchAt: now,
      lastTouchLabel: timeLabel
    }
  });

  return {
    contactId: contact.id,
    conversationId: conversation.id
  };
}

export async function sendCrmConversationSms(storeId: string, conversationId: string, input: SendCrmConversationSmsInput) {
  const config = getTwilioMessagingConfig(process.env);
  const missing = getTwilioMissingConfig(config, "send");

  if (missing.length > 0) {
    return { missing };
  }

  const existingConversation = await prisma.crmConversation.findFirst({
    where: { id: conversationId, storeId },
    include: {
      contact: true
    }
  });

  if (!existingConversation) {
    return null;
  }

  const now = new Date();
  const timeLabel = formatLiveTimeLabel(now);
  let targetConversationId = existingConversation.id;

  if (existingConversation.channel !== "SMS") {
    const replacementConversation = await prisma.crmConversation.create({
      data: {
        storeId,
        contactId: existingConversation.contactId,
        channel: "SMS",
        subject: "New text conversation",
        preview: input.body.trim(),
        queueLabel: "Open Conversations",
        assignment: input.actorName.trim(),
        status: "Open",
        unreadCount: 0,
        lastTouchAt: now,
        lastTouchLabel: timeLabel
      }
    });

    targetConversationId = replacementConversation.id;
  }

  const twilioResponse = await fetch(getTwilioMessagesEndpoint(config), {
    method: "POST",
    headers: {
      Authorization: getTwilioAuthorizationHeader(config),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: buildTwilioMessagePayload(config, {
      to: existingConversation.contact.phone,
      body: input.body.trim(),
      statusCallbackUrl: getTwilioWebhookUrl(config, TWILIO_STATUS_WEBHOOK_PATH) ?? undefined
    }).toString()
  });
  const bodyText = await twilioResponse.text();
  const twilioBody = parseTwilioBody(bodyText);

  if (!twilioResponse.ok) {
    return {
      errorStatus: twilioResponse.status,
      errorBody: twilioBody
    };
  }

  const sid = typeof twilioBody?.sid === "string" ? twilioBody.sid : null;
  const status = normalizeMessageStatus(typeof twilioBody?.status === "string" ? twilioBody.status : null, "outbound");

  await prisma.$transaction(async (tx) => {
    if (sid) {
      await tx.crmMessage.upsert({
        where: { twilioSid: sid },
        update: {
          body: input.body.trim(),
          author: input.actorName.trim(),
          timeLabel,
          status,
          conversationId: targetConversationId,
          contactId: existingConversation.contactId,
          storeId
        },
        create: {
          twilioSid: sid,
          author: input.actorName.trim(),
          body: input.body.trim(),
          timeLabel,
          direction: "outbound",
          status,
          channel: "SMS",
          source: "Twilio send",
          conversationId: targetConversationId,
          contactId: existingConversation.contactId,
          storeId,
          createdAt: now
        }
      });
    } else {
      await tx.crmMessage.create({
        data: {
          author: input.actorName.trim(),
          body: input.body.trim(),
          timeLabel,
          direction: "outbound",
          status,
          channel: "SMS",
          source: "Twilio send",
          conversationId: targetConversationId,
          contactId: existingConversation.contactId,
          storeId,
          createdAt: now
        }
      });
    }

    await tx.crmConversation.update({
      where: { id: targetConversationId },
      data: {
        channel: "SMS",
        preview: input.body.trim(),
        assignment: input.actorName.trim(),
        status: "Open",
        unreadCount: 0,
        lastTouchAt: now,
        lastTouchLabel: timeLabel
      }
    });

    await tx.crmContact.update({
      where: { id: existingConversation.contactId },
      data: {
        owner: input.actorName.trim(),
        lastTouchAt: now,
        lastTouchLabel: timeLabel,
        lastChannel: "SMS",
        nextAction: "Await customer response"
      }
    });

    await tx.crmActivity.create({
      data: {
        kind: "SMS",
        title: "SMS text sent",
        detail: input.body.trim(),
        owner: input.actorName.trim(),
        source: "Twilio send",
        timeLabel,
        priority: "Normal",
        state: "Done",
        occurredAt: now,
        storeId,
        contactId: existingConversation.contactId
      }
    });
  });

  return {
    contactId: existingConversation.contactId,
    conversationId: targetConversationId,
    sid,
    status
  };
}

export async function recordInboundTwilioMessage(payload: Record<string, unknown>) {
  const config = getTwilioMessagingConfig(process.env);
  const storeCode = config.defaultStoreCode;

  if (!storeCode) {
    return { ok: false, message: "TWILIO_DEFAULT_STORE_CODE is not configured." };
  }

  const store = await prisma.store.findUnique({
    where: { code: storeCode },
    select: { id: true, name: true }
  });

  if (!store) {
    return { ok: false, message: `Configured Twilio store ${storeCode} was not found.` };
  }

  const from = typeof payload.From === "string" ? payload.From.trim() : "";
  const body = typeof payload.Body === "string" ? payload.Body.trim() : "";
  const sid = typeof payload.MessageSid === "string" ? payload.MessageSid.trim() : "";
  const now = new Date();
  const timeLabel = formatLiveTimeLabel(now);

  if (!from || !body) {
    return { ok: true, ignored: true };
  }

  await prisma.$transaction(async (tx) => {
    let contact = await tx.crmContact.findFirst({
      where: { storeId: store.id, phone: from },
      orderBy: { updatedAt: "desc" }
    });

    if (!contact) {
      contact = await tx.crmContact.create({
        data: {
          name: from,
          owner: "Twilio Inbox",
          location: store.name,
          phone: from,
          email: "",
          company: from,
          stage: "Lead",
          tagsJson: JSON.stringify(["Inbound SMS"]),
          consentText: "Allowed",
          consentEmail: "Pending",
          lastTouchLabel: timeLabel,
          lastTouchAt: now,
          lastChannel: "SMS",
          nextAction: "Reply to inbound text",
          healthScore: 72,
          openBalance: 0,
          opportunityValue: 0,
          reviewScore: 0,
          integrationId: `TWILIO-${from}`,
          dealReference: "Inbound Message",
          storeId: store.id
        }
      });
    }

    let conversation = await tx.crmConversation.findFirst({
      where: { storeId: store.id, contactId: contact.id, channel: "SMS" },
      orderBy: { lastTouchAt: "desc" }
    });

    if (!conversation) {
      conversation = await tx.crmConversation.create({
        data: {
          storeId: store.id,
          contactId: contact.id,
          channel: "SMS",
          subject: "Twilio inbound conversation",
          preview: body,
          queueLabel: "Open Conversations",
          assignment: contact.owner,
          status: "Open",
          unreadCount: 1,
          lastTouchAt: now,
          lastTouchLabel: timeLabel
        }
      });
    } else {
      conversation = await tx.crmConversation.update({
        where: { id: conversation.id },
        data: {
          preview: body,
          status: "Open",
          unreadCount: conversation.unreadCount + 1,
          lastTouchAt: now,
          lastTouchLabel: timeLabel
        }
      });
    }

    if (sid) {
      await tx.crmMessage.upsert({
        where: { twilioSid: sid },
        update: {
          body,
          author: contact.name,
          timeLabel,
          status: normalizeMessageStatus(typeof payload.SmsStatus === "string" ? payload.SmsStatus : undefined, "inbound"),
          conversationId: conversation.id,
          contactId: contact.id,
          storeId: store.id
        },
        create: {
          twilioSid: sid,
          author: contact.name,
          body,
          timeLabel,
          direction: "inbound",
          status: normalizeMessageStatus(typeof payload.SmsStatus === "string" ? payload.SmsStatus : undefined, "inbound"),
          channel: "SMS",
          source: "Twilio inbound",
          conversationId: conversation.id,
          contactId: contact.id,
          storeId: store.id,
          createdAt: now
        }
      });
    } else {
      await tx.crmMessage.create({
        data: {
          author: contact.name,
          body,
          timeLabel,
          direction: "inbound",
          status: "Received",
          channel: "SMS",
          source: "Twilio inbound",
          conversationId: conversation.id,
          contactId: contact.id,
          storeId: store.id,
          createdAt: now
        }
      });
    }

    await tx.crmContact.update({
      where: { id: contact.id },
      data: {
        lastTouchAt: now,
        lastTouchLabel: timeLabel,
        lastChannel: "SMS",
        nextAction: "Reply to inbound text"
      }
    });

    await tx.crmActivity.create({
      data: {
        kind: "SMS",
        title: "SMS text received",
        detail: body,
        owner: contact.name,
        source: "Twilio inbound",
        timeLabel,
        priority: "Normal",
        state: "Done",
        occurredAt: now,
        storeId: store.id,
        contactId: contact.id
      }
    });
  });

  return { ok: true };
}

export async function recordTwilioMessageStatus(payload: Record<string, unknown>) {
  const sid = typeof payload.MessageSid === "string" ? payload.MessageSid.trim() : "";

  if (!sid) {
    return { ok: true, ignored: true };
  }

  const message = await prisma.crmMessage.findUnique({
    where: { twilioSid: sid },
    select: { id: true }
  });

  if (!message) {
    return { ok: true, ignored: true };
  }

  await prisma.crmMessage.update({
    where: { id: message.id },
    data: {
      status: normalizeMessageStatus(typeof payload.MessageStatus === "string" ? payload.MessageStatus : undefined, "outbound")
    }
  });

  return { ok: true };
}