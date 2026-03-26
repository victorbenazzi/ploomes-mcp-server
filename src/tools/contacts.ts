import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PloomesClient } from "../client/ploomes-client.js";
import { buildODataParams } from "../client/odata-builder.js";
import {
  listResponse,
  getResponse,
  createResponse,
  updateResponse,
  deleteResponse,
  errorResponse,
  PloomesListResponse,
} from "../utils/formatter.js";
import { otherPropertySchema } from "../types/schemas.js";

const phoneSchema = z.object({
  PhoneNumber: z.string().describe("The phone number string"),
  TypeId: z.number().optional().describe("Phone type ID (e.g., 1=Work, 2=Home, 3=Mobile)"),
  CountryId: z.number().optional().describe("Country ID for the phone number"),
});

function transformContactBody(input: Record<string, unknown>): Record<string, unknown> {
  const body = { ...input };
  if (typeof body.ZipCode === "string") {
    const digits = body.ZipCode.replace(/\D/g, "");
    body.ZipCode = digits ? Number(digits) : undefined;
  }
  return body;
}

export function registerContactTools(server: McpServer, client: PloomesClient): void {
  // ── LIST ──
  server.registerTool(
    "ploomes_contacts_list",
    {
      title: "List Contacts",
      description:
        "Search and list contacts in Ploomes CRM. Supports OData filtering, sorting, field selection, and pagination.\n\n" +
        "Available $expand values: Type, Company, Tags, OtherProperties, InteractionRecords, Attachments, Documents, Products, Contacts.\n\n" +
        "$filter examples:\n" +
        "- Exact match: \"Name eq 'João Silva'\"\n" +
        "- Contains text: \"contains(Name, 'Silva')\"\n" +
        "- Starts with: \"startswith(Email, 'joao')\"\n" +
        "- By status: \"StatusId eq 1\"\n" +
        "- By type: \"TypeId eq 2\"\n" +
        "- Date filter: \"CreateDate ge 2025-01-01T00:00:00Z\"\n" +
        "- Custom field: \"OtherProperties/any(o: o/FieldId eq 12345 and o/StringValue eq 'valor')\"\n" +
        "- Combined: \"TypeId eq 1 and contains(Name, 'Silva') and StatusId eq 1\"\n\n" +
        "Use ploomes_contacts_types_list to discover valid TypeId values.\n" +
        "Use ploomes_contacts_status_list to discover valid StatusId values.\n" +
        "Use ploomes_contacts_origins_list to discover valid OriginId values.",
      inputSchema: {
        filter: z.string().optional().describe(
          "OData $filter expression. Examples: \"Name eq 'João'\", \"contains(Name, 'Silva')\", \"StatusId eq 1\", " +
          "\"TypeId eq 2 and contains(Email, '@empresa.com')\", \"CreateDate ge 2025-01-01T00:00:00Z\", " +
          "\"OtherProperties/any(o: o/FieldId eq 12345 and o/StringValue eq 'valor')\""
        ),
        select: z.string().optional().describe(
          "Comma-separated fields to return. E.g.: \"Id,Name,Email,TypeId,StatusId,OwnerId\". " +
          "NOTE: Phone is NOT selectable — omit it from $select and use $expand=Phones instead."
        ),
        expand: z.string().optional().describe(
          "Related entities to include. Available: Type, Company, Tags, OtherProperties, InteractionRecords, Attachments, Documents, Products, Contacts. E.g.: \"OtherProperties,Tags,Company\""
        ),
        orderby: z.string().optional().describe(
          "Sort expression. E.g.: \"Name asc\", \"CreateDate desc\", \"Revenue desc\""
        ),
        top: z.number().optional().default(50).describe("Max items to return (default 50, max 300)"),
        skip: z.number().optional().default(0).describe("Items to skip for pagination. Use with $top to paginate through results."),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const data = await client.get<PloomesListResponse>("/Contacts", buildODataParams(input));
        return listResponse("contact", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── GET ──
  server.registerTool(
    "ploomes_contacts_get",
    {
      title: "Get Contact",
      description:
        "Get a single contact by ID from Ploomes CRM.\n\n" +
        "Available $expand values: Type, Company, Tags, OtherProperties, InteractionRecords, Attachments, Documents, Products, Contacts.\n\n" +
        "Use $expand=OtherProperties to include custom field values. Use $expand=Tags to see associated tags. " +
        "Use $expand=InteractionRecords to see interaction history. Use $expand=Company to see the parent company details.",
      inputSchema: {
        id: z.number().describe("Contact ID. The unique numeric identifier of the contact in Ploomes."),
        expand: z.string().optional().describe(
          "Related entities to include. Available: Type, Company, Tags, OtherProperties, InteractionRecords, Attachments, Documents, Products, Contacts. E.g.: \"OtherProperties,Tags,InteractionRecords\""
        ),
        select: z.string().optional().describe(
          "Fields to return. E.g.: \"Id,Name,Email,TypeId,StatusId\". " +
          "NOTE: Phone is NOT selectable — omit it from $select and use $expand=Phones instead."
        ),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, expand, select }) => {
      try {
        const params = buildODataParams({
          filter: `Id eq ${id}`,
          expand,
          select,
          top: 1,
        });
        const data = await client.get<PloomesListResponse>("/Contacts", params);
        return getResponse("Contact", id, data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── CREATE ──
  server.registerTool(
    "ploomes_contacts_create",
    {
      title: "Create Contact",
      description:
        "Create a new contact in Ploomes CRM. Name is required. Use OtherProperties to set custom fields.\n\n" +
        "To find valid IDs for reference fields:\n" +
        "- TypeId: use ploomes_contacts_types_list (typically 1=Person, 2=Company, but may vary per account)\n" +
        "- StatusId: use ploomes_contacts_status_list to discover available contact statuses\n" +
        "- OriginId: use ploomes_contacts_origins_list to discover available contact origins\n" +
        "- OwnerId: use ploomes_users_list to discover valid user IDs\n" +
        "- CityId: numeric city ID from the Ploomes cities database\n" +
        "- CurrencyId: numeric currency ID from the Ploomes currencies list",
      inputSchema: {
        Name: z.string().describe("Contact name (required). Full name for a person or company name."),
        TypeId: z.number().optional().describe(
          "Contact type ID. Use ploomes_contacts_types_list to discover valid values. Typically 1=Person, 2=Company, but values may vary per account."
        ),
        LegalName: z.string().optional().describe("Legal / registered company name. Useful for companies that have a trade name different from the legal name."),
        Register: z.string().optional().describe("Tax identification number (CPF for individuals or CNPJ for companies in Brazil)."),
        IdentityDocument: z.string().optional().describe("Identity document number (e.g., RG in Brazil)."),
        Email: z.string().optional().describe("Primary email address for the contact."),
        Phone: z.string().optional().describe("Primary phone number as a string. For multiple phones, use the Phones array instead."),
        Phones: z.array(phoneSchema).optional().describe("Array of phone numbers with type. Each entry has PhoneNumber (required), TypeId (optional), and CountryId (optional)."),
        StatusId: z.number().optional().describe(
          "Contact status ID. Use ploomes_contacts_status_list to discover valid values for your account."
        ),
        CompanyId: z.number().optional().describe("Parent company contact ID. Links this person to a company contact already in Ploomes."),
        OwnerId: z.number().optional().describe(
          "Owner user ID. The user responsible for this contact. Use ploomes_users_list to discover valid user IDs."
        ),
        OriginId: z.number().optional().describe(
          "Origin ID. How this contact was acquired. Use ploomes_contacts_origins_list to discover valid values."
        ),
        StreetAddress: z.string().optional().describe("Street address (street name). E.g.: \"Rua Augusta\""),
        StreetAddressNumber: z.string().optional().describe("Street address number. E.g.: \"1234\""),
        StreetAddressLine2: z.string().optional().describe("Address complement / additional info. E.g.: \"Sala 56\", \"Apto 12\""),
        Neighborhood: z.string().optional().describe("Neighborhood / district name."),
        ZipCode: z.string().optional().describe("Zip / postal code (numeric only, formatting is stripped automatically). E.g.: \"01310100\" or \"01310-100\""),
        CityId: z.number().optional().describe("City ID from the Ploomes cities database. Numeric identifier for the city."),
        Note: z.string().optional().describe("Free-text note or general observations about the contact."),
        Website: z.string().optional().describe("Website URL. E.g.: \"https://www.example.com\""),
        Revenue: z.number().optional().describe("Annual revenue as a numeric value."),
        Skype: z.string().optional().describe("Skype username or ID."),
        Facebook: z.string().optional().describe("Facebook profile URL or username."),
        Latitude: z.number().optional().describe("Geographic latitude coordinate. E.g.: -23.5505"),
        Longitude: z.number().optional().describe("Geographic longitude coordinate. E.g.: -46.6333"),
        CurrencyId: z.number().optional().describe("Currency ID for monetary values associated with this contact."),
        EmailMarketing: z.boolean().optional().describe("Whether the contact has opted in to receive email marketing. true = opted in, false = opted out."),
        OtherProperties: z.array(otherPropertySchema).optional().describe(
          "Custom field values. Use ploomes_fields_list to discover available fields. Each entry needs a FieldKey and exactly one value field (StringValue, IntegerValue, DateTimeValue, BoolValue, BigStringValue, or ObjectValueName)."
        ),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const body = transformContactBody(input);
        const data = await client.post<PloomesListResponse>("/Contacts", body);
        return createResponse("Contact", data);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── UPDATE ──
  server.registerTool(
    "ploomes_contacts_update",
    {
      title: "Update Contact",
      description:
        "Update an existing contact in Ploomes CRM by ID. Only provided fields are changed; omitted fields remain untouched.\n\n" +
        "To find valid IDs for reference fields:\n" +
        "- TypeId: use ploomes_contacts_types_list (typically 1=Person, 2=Company, but may vary per account)\n" +
        "- StatusId: use ploomes_contacts_status_list to discover available contact statuses\n" +
        "- OriginId: use ploomes_contacts_origins_list to discover available contact origins\n" +
        "- OwnerId: use ploomes_users_list to discover valid user IDs\n" +
        "- CityId: numeric city ID from the Ploomes cities database\n" +
        "- CurrencyId: numeric currency ID from the Ploomes currencies list",
      inputSchema: {
        id: z.number().describe("Contact ID to update. The unique numeric identifier of the contact in Ploomes."),
        Name: z.string().optional().describe("Contact name. Full name for a person or company name."),
        TypeId: z.number().optional().describe(
          "Contact type ID. Use ploomes_contacts_types_list to discover valid values. Typically 1=Person, 2=Company, but values may vary per account."
        ),
        LegalName: z.string().optional().describe("Legal / registered company name. Useful for companies that have a trade name different from the legal name."),
        Register: z.string().optional().describe("Tax identification number (CPF for individuals or CNPJ for companies in Brazil)."),
        IdentityDocument: z.string().optional().describe("Identity document number (e.g., RG in Brazil)."),
        Email: z.string().optional().describe("Primary email address for the contact."),
        Phone: z.string().optional().describe("Primary phone number as a string. For multiple phones, use the Phones array instead."),
        Phones: z.array(phoneSchema).optional().describe("Array of phone numbers with type. Each entry has PhoneNumber (required), TypeId (optional), and CountryId (optional)."),
        StatusId: z.number().optional().describe(
          "Contact status ID. Use ploomes_contacts_status_list to discover valid values for your account."
        ),
        CompanyId: z.number().optional().describe("Parent company contact ID. Links this person to a company contact already in Ploomes."),
        OwnerId: z.number().optional().describe(
          "Owner user ID. The user responsible for this contact. Use ploomes_users_list to discover valid user IDs."
        ),
        OriginId: z.number().optional().describe(
          "Origin ID. How this contact was acquired. Use ploomes_contacts_origins_list to discover valid values."
        ),
        StreetAddress: z.string().optional().describe("Street address (street name). E.g.: \"Rua Augusta\""),
        StreetAddressNumber: z.string().optional().describe("Street address number. E.g.: \"1234\""),
        StreetAddressLine2: z.string().optional().describe("Address complement / additional info. E.g.: \"Sala 56\", \"Apto 12\""),
        Neighborhood: z.string().optional().describe("Neighborhood / district name."),
        ZipCode: z.string().optional().describe("Zip / postal code (numeric only, formatting is stripped automatically). E.g.: \"01310100\" or \"01310-100\""),
        CityId: z.number().optional().describe("City ID from the Ploomes cities database. Numeric identifier for the city."),
        Note: z.string().optional().describe("Free-text note or general observations about the contact."),
        Website: z.string().optional().describe("Website URL. E.g.: \"https://www.example.com\""),
        Revenue: z.number().optional().describe("Annual revenue as a numeric value."),
        Skype: z.string().optional().describe("Skype username or ID."),
        Facebook: z.string().optional().describe("Facebook profile URL or username."),
        Latitude: z.number().optional().describe("Geographic latitude coordinate. E.g.: -23.5505"),
        Longitude: z.number().optional().describe("Geographic longitude coordinate. E.g.: -46.6333"),
        CurrencyId: z.number().optional().describe("Currency ID for monetary values associated with this contact."),
        EmailMarketing: z.boolean().optional().describe("Whether the contact has opted in to receive email marketing. true = opted in, false = opted out."),
        OtherProperties: z.array(otherPropertySchema).optional().describe(
          "Custom field values. Use ploomes_fields_list to discover available fields. Each entry needs a FieldKey and exactly one value field (StringValue, IntegerValue, DateTimeValue, BoolValue, BigStringValue, or ObjectValueName)."
        ),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, ...fields }) => {
      try {
        const body = transformContactBody(fields);
        await client.patch(`/Contacts(${id})`, body);
        return updateResponse("Contact", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );

  // ── DELETE ──
  server.registerTool(
    "ploomes_contacts_delete",
    {
      title: "Delete Contact",
      description: "Delete a contact from Ploomes CRM by ID. This action is irreversible.",
      inputSchema: {
        id: z.number().describe("Contact ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        await client.delete(`/Contacts(${id})`);
        return deleteResponse("Contact", id);
      } catch (err) {
        return errorResponse(err);
      }
    }
  );
}
