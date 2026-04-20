import { randomUUID } from "crypto";
import { Contact, PersonaId } from "../types";
import { db } from "../db/store";

// Mock HubSpot service. Mirrors the shape and naming of the real
// HubSpot v3 REST API so swapping in the real SDK later is straightforward.
//
// Real endpoints this maps to:
//   POST   /crm/v3/objects/contacts
//   PATCH  /crm/v3/objects/contacts/{id}
//   GET    /crm/v3/objects/contacts/search
//   POST   /crm/v3/lists/{listId}/memberships/add
//   POST   /marketing/v3/emails
//   POST   /marketing/v3/emails/{emailId}/send
//   GET    /marketing/v3/emails/{emailId}/statistics
//
// Each call below logs the simulated request so the README and demo can
// show realistic payload structures.

interface HubSpotContactProperties {
  email: string;
  firstname: string;
  lastname: string;
  company: string;
  jobtitle?: string;
  years_in_role?: number;
  persona: PersonaId;
  seniority_tier?: string;
  novamind_lifecycle_stage?: string;
  rfm_score?: string;
  acquisition_source?: string;
  lifecyclestage: string;
}

interface HubSpotContactResponse {
  id: string;
  properties: HubSpotContactProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

interface HubSpotMarketingEmail {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  htmlBody: string;
  segmentId: string;
  createdAt: string;
}

interface HubSpotSendReceipt {
  emailId: string;
  segmentId: string;
  recipientCount: number;
  sentAt: string;
  status: "sent";
}

// Internal log of "requests" the mock service has handled. Useful for the
// dashboard and the demo video to show the payloads that would hit HubSpot.
const requestLog: Array<{
  method: string;
  endpoint: string;
  payload: unknown;
  timestamp: string;
}> = [];

export function getRequestLog() {
  return [...requestLog].reverse().slice(0, 50);
}

function log(method: string, endpoint: string, payload: unknown) {
  requestLog.push({
    method,
    endpoint,
    payload,
    timestamp: new Date().toISOString(),
  });
}

export const hubspot = {
  // POST /crm/v3/objects/contacts
  async createOrUpdateContact(contact: Contact): Promise<HubSpotContactResponse> {
    const payload = {
      properties: {
        email: contact.email,
        firstname: contact.firstName,
        lastname: contact.lastName,
        company: contact.company,
        jobtitle: contact.jobTitle,
        years_in_role: contact.yearsInRole,
        persona: contact.personaId,
        seniority_tier: contact.seniorityTier,
        novamind_lifecycle_stage: contact.lifecycleStage,
        rfm_score: contact.rfmScore,
        acquisition_source: contact.acquisitionSource,
        // HubSpot native lifecyclestage (subscriber/lead/mql/customer)
        // is kept separate because it has different semantics.
        lifecyclestage: contact.hubspotLifecycleStage || "subscriber",
      },
    };
    log("POST", "/crm/v3/objects/contacts", payload);

    db.upsertContact(contact);

    return {
      id: contact.id,
      properties: payload.properties,
      createdAt: contact.subscribedAt,
      updatedAt: new Date().toISOString(),
      archived: false,
    };
  },

  // GET /crm/v3/objects/contacts/search  (filtered by persona property)
  async getContactsByPersona(personaId: PersonaId): Promise<HubSpotContactResponse[]> {
    const payload = {
      filterGroups: [
        {
          filters: [
            { propertyName: "persona", operator: "EQ", value: personaId },
          ],
        },
      ],
      properties: [
        "email", "firstname", "lastname", "company", "jobtitle",
        "persona", "seniority_tier", "novamind_lifecycle_stage",
        "rfm_score", "acquisition_source", "lifecyclestage",
      ],
      limit: 100,
    };
    log("POST", "/crm/v3/objects/contacts/search", payload);

    return db.contactsByPersona(personaId).map((c) => ({
      id: c.id,
      properties: {
        email: c.email,
        firstname: c.firstName,
        lastname: c.lastName,
        company: c.company,
        jobtitle: c.jobTitle,
        years_in_role: c.yearsInRole,
        persona: c.personaId,
        seniority_tier: c.seniorityTier,
        novamind_lifecycle_stage: c.lifecycleStage,
        rfm_score: c.rfmScore,
        acquisition_source: c.acquisitionSource,
        lifecyclestage: c.hubspotLifecycleStage || "subscriber",
      },
      createdAt: c.subscribedAt,
      updatedAt: c.subscribedAt,
      archived: false,
    }));
  },

  // POST /marketing/v3/emails
  async createMarketingEmail(input: {
    name: string;
    subject: string;
    preheader: string;
    htmlBody: string;
    personaSegmentId: PersonaId;
  }): Promise<HubSpotMarketingEmail> {
    const payload = {
      name: input.name,
      subject: input.subject,
      preheader: input.preheader,
      emailBody: input.htmlBody,
      subscription: { listIds: [`persona_${input.personaSegmentId}`] },
    };
    log("POST", "/marketing/v3/emails", payload);

    return {
      id: `email_${randomUUID().slice(0, 8)}`,
      name: input.name,
      subject: input.subject,
      preheader: input.preheader,
      htmlBody: input.htmlBody,
      segmentId: `persona_${input.personaSegmentId}`,
      createdAt: new Date().toISOString(),
    };
  },

  // POST /marketing/v3/emails/{emailId}/send
  async sendMarketingEmail(input: {
    emailId: string;
    personaSegmentId: PersonaId;
  }): Promise<HubSpotSendReceipt> {
    const recipients = db.contactsByPersona(input.personaSegmentId);
    const payload = {
      emailId: input.emailId,
      listId: `persona_${input.personaSegmentId}`,
      recipientCount: recipients.length,
    };
    log("POST", `/marketing/v3/emails/${input.emailId}/send`, payload);

    return {
      emailId: input.emailId,
      segmentId: `persona_${input.personaSegmentId}`,
      recipientCount: recipients.length,
      sentAt: new Date().toISOString(),
      status: "sent",
    };
  },

  // GET /marketing/v3/emails/{emailId}/statistics
  async fetchEmailStatistics(emailId: string) {
    log("GET", `/marketing/v3/emails/${emailId}/statistics`, {});
    // Real stats are produced by the performance simulator and attached
    // to the campaign in the pipeline layer. This endpoint is here to
    // mirror the real HubSpot API surface.
    return { emailId, status: "available" };
  },
};
