import { useMemo } from "react";
import { useCachedFetch } from "./useCachedFetch";

export interface ClientEntry {
  company: string;
  client: string;
}

export function useClientsMasterList(): ClientEntry[] {
  const { data: clientsResult } = useCachedFetch<{ success: boolean; data: any[] }>("/clients");
  const { data: contactsResult } = useCachedFetch<{ success: boolean; data: any[] }>("/contacts");

  return useMemo(() => {
    const clients: any[] = clientsResult?.success ? clientsResult.data : [];
    const contacts: any[] = contactsResult?.success ? contactsResult.data : [];

    const clientIdToName = new Map<string, string>();
    for (const c of clients) {
      const name = (c.company_name || c.name || "").trim();
      if (c.id && name) clientIdToName.set(c.id, name);
    }

    const seen = new Set<string>();
    const list: ClientEntry[] = [];

    for (const c of clients) {
      const company = (c.company_name || c.name || "").trim();
      if (!company) continue;
      const key = `${company}||`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ company, client: company });
      }
    }

    for (const contact of contacts) {
      const company = contact.customer_id
        ? (clientIdToName.get(contact.customer_id) || contact.company || "").trim()
        : (contact.company || "").trim();
      if (!company) continue;
      const contactName = (contact.name || [contact.first_name, contact.last_name].filter(Boolean).join(" ")).trim();
      if (!contactName || contactName === company) continue;
      const key = `${company}||${contactName}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ company, client: contactName });
      }
    }

    return list;
  }, [clientsResult, contactsResult]);
}
