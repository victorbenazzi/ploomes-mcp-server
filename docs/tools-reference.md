# Tools Reference

[&larr; Back to README](../README.md)

Complete reference for all 56 tools exposed by the Ploomes MCP Server.

---

## Table of Contents

- [Common Parameters (OData)](#common-parameters-odata)
- [Custom Fields (OtherProperties)](#custom-fields-otherproperties)
- [Contacts (5 tools)](#contacts)
- [Deals (8 tools)](#deals)
- [Tasks (6 tools)](#tasks)
- [Pipelines & Stages (2 tools)](#pipelines--stages)
- [Interactions (5 tools)](#interactions)
- [Quotes (5 tools)](#quotes)
- [Orders (5 tools)](#orders)
- [Products (5 tools)](#products)
- [Fields (1 tool)](#fields)
- [Users (1 tool)](#users)
- [Account (1 tool)](#account)
- [Lookup Tools (12 tools)](#lookup-tools)

---

## Common Parameters (OData)

All `_list` tools accept these OData v4 parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `filter` | string | — | OData `$filter` expression for searching/filtering |
| `select` | string | — | Comma-separated field names to return |
| `expand` | string | — | Related entities to include in the response |
| `orderby` | string | — | Sort expression (field + `asc` or `desc`) |
| `top` | number | 50 | Maximum items to return (capped at 300) |
| `skip` | number | 0 | Number of items to skip (for pagination) |

### Filter Examples

```
# Exact match
filter: "Name eq 'Acme Corp'"

# Not null
filter: "Email ne null"

# Numeric comparison
filter: "Amount gt 10000"

# Combined filters
filter: "StatusId eq 1 and OwnerId eq 42"

# Contains (substring)
filter: "contains(Name, 'Tech')"

# Starts with
filter: "startswith(Email, 'john')"

# Date comparison
filter: "CreateDate gt 2025-01-01T00:00:00Z"

# Custom field filter
filter: "OtherProperties/any(o: o/FieldId eq 12345 and o/StringValue eq 'VIP')"
```

### Pagination

To retrieve all results in pages of 100:

```
Call 1: top=100, skip=0    → returns 100 items
Call 2: top=100, skip=100  → returns 100 items
Call 3: top=100, skip=200  → returns 47 items (done — less than top)
```

---

## Custom Fields (OtherProperties)

Ploomes supports custom fields via `OtherProperties`. To **read** them, include `expand: "OtherProperties"` in list/get calls. To **write** them, pass an `OtherProperties` array in create/update calls.

### Writing Custom Fields

Each custom field value is an object with a `FieldKey` and the appropriate value property:

| Value Type | Property | Example |
|---|---|---|
| Text | `StringValue` | `{"FieldKey": "customer_segment", "StringValue": "Enterprise"}` |
| Number (integer) | `IntegerValue` | `{"FieldKey": "employee_count", "IntegerValue": 500}` |
| Date/Time | `DateTimeValue` | `{"FieldKey": "contract_start", "DateTimeValue": "2025-01-15T00:00:00Z"}` |
| Boolean | `BoolValue` | `{"FieldKey": "is_partner", "BoolValue": true}` |
| Decimal | `BigStringValue` | `{"FieldKey": "mrr_value", "BigStringValue": "4999.99"}` |
| Dropdown | `ObjectValueName` | `{"FieldKey": "industry", "ObjectValueName": "Technology"}` |

### Example: Create a Contact with Custom Fields

```json
{
  "Name": "Acme Corp",
  "Email": "contact@acme.com",
  "OtherProperties": [
    {"FieldKey": "customer_segment", "StringValue": "Enterprise"},
    {"FieldKey": "employee_count", "IntegerValue": 500},
    {"FieldKey": "is_partner", "BoolValue": true}
  ]
}
```

### Discovering Field Keys

Use `ploomes_fields_list` to find available custom fields and their keys:

```
ploomes_fields_list with filter: "EntityId eq 1"   → Contact fields
ploomes_fields_list with filter: "EntityId eq 2"   → Deal fields
```

Use `ploomes_fields_entities_list` to discover which EntityId maps to which entity.

---

## Contacts

### `ploomes_contacts_list`

Search and list contacts. Supports OData filtering, sorting, field selection, and pagination.

| Annotation | Value |
|---|---|
| Read-only | Yes |
| Destructive | No |
| Idempotent | Yes |

**Parameters:** [Common OData parameters](#common-parameters-odata)

**Available `expand` values:** `Type`, `Company`, `Tags`, `OtherProperties`, `InteractionRecords`, `Attachments`, `Documents`, `Products`, `Contacts`

**Examples:**

```
# List all contacts
ploomes_contacts_list

# Search by name
ploomes_contacts_list with filter: "contains(Name, 'Tech')"

# Get contacts with custom fields
ploomes_contacts_list with expand: "OtherProperties", top: 10

# Get contacts owned by a specific user
ploomes_contacts_list with filter: "OwnerId eq 42", orderby: "Name asc"
```

---

### `ploomes_contacts_get`

Get a single contact by ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **Yes** | Contact ID |
| `expand` | string | No | Related entities to include |
| `select` | string | No | Fields to return |

**Example:**

```
ploomes_contacts_get with id: 123, expand: "OtherProperties,Tags,InteractionRecords"
```

---

### `ploomes_contacts_create`

Create a new contact.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `Name` | string | **Yes** | Contact name |
| `TypeId` | number | No | Contact type ID (use `ploomes_contacts_types_list` to find) |
| `LegalName` | string | No | Legal / company name |
| `Register` | string | No | CPF or CNPJ |
| `Email` | string | No | Email address |
| `Phone` | string | No | Phone number |
| `StatusId` | number | No | Status ID (use `ploomes_contacts_status_list` to find) |
| `CompanyId` | number | No | Parent company contact ID |
| `OwnerId` | number | No | Owner user ID (use `ploomes_users_list` to find) |
| `OriginId` | number | No | Origin ID (use `ploomes_contacts_origins_list` to find) |
| `StreetAddress` | string | No | Street address |
| `ZipCode` | string | No | Zip / postal code |
| `CityId` | number | No | City ID |
| `Note` | string | No | Free-text note |
| `Website` | string | No | Website URL |
| `Revenue` | number | No | Annual revenue |
| `OtherProperties` | array | No | Custom field values |

**Example:**

```
ploomes_contacts_create with Name: "Acme Corp", Email: "contact@acme.com", Phone: "+55 11 99999-0000"
```

---

### `ploomes_contacts_update`

Update an existing contact. Only provided fields are changed.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **Yes** | Contact ID to update |
| *(same optional fields as create)* | | | |

**Example:**

```
ploomes_contacts_update with id: 123, Email: "new-email@acme.com", Note: "Updated contact info"
```

---

### `ploomes_contacts_delete`

Delete a contact. **Irreversible.**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **Yes** | Contact ID to delete |

| Annotation | Value |
|---|---|
| Destructive | **Yes** |

---

## Deals

### `ploomes_deals_list`

Search and list deals (opportunities).

**Parameters:** [Common OData parameters](#common-parameters-odata)

**Available `expand` values:** `Contact`, `Stage`, `Status`, `Tags`, `Tasks`, `Products`, `Quotes`, `Origin`, `InteractionRecords`, `Orders`, `OtherProperties`, `Documents`

**Examples:**

```
# Open deals for a contact
ploomes_deals_list with filter: "ContactId eq 123 and StatusId eq 1"

# High-value deals
ploomes_deals_list with filter: "Amount gt 50000", orderby: "Amount desc"

# Deals in a specific pipeline stage
ploomes_deals_list with filter: "StageId eq 456", expand: "Contact"
```

---

### `ploomes_deals_get`

Get a single deal by ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **Yes** | Deal ID |
| `expand` | string | No | E.g.: `"Contact,Stage,OtherProperties,Tasks"` |
| `select` | string | No | Fields to return |

---

### `ploomes_deals_create`

Create a new deal.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `Title` | string | **Yes** | Deal title |
| `ContactId` | number | No | Contact (company) ID |
| `PersonId` | number | No | Person contact ID |
| `StageId` | number | No | Pipeline stage ID (use `ploomes_stages_list` to find) |
| `OwnerId` | number | No | Owner user ID |
| `Amount` | number | No | Monetary value |
| `CurrencyId` | number | No | Currency ID (use `ploomes_currencies_list` to find) |
| `OriginId` | number | No | Origin ID |
| `OtherProperties` | array | No | Custom field values |

**Example:**

```
ploomes_deals_create with Title: "Acme Corp - Enterprise Plan", ContactId: 123, Amount: 50000, StageId: 1
```

---

### `ploomes_deals_update`

Update an existing deal. Use to change stage, amount, owner, or custom fields.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **Yes** | Deal ID |
| *(same optional fields as create)* | | | |

**Example (move deal to next stage):**

```
ploomes_deals_update with id: 789, StageId: 3
```

---

### `ploomes_deals_delete`

Delete a deal. **Irreversible.**

| Parameter | Type | Required |
|---|---|---|
| `id` | number | **Yes** |

---

### `ploomes_deals_win`

Mark a deal as won.

| Parameter | Type | Required |
|---|---|---|
| `id` | number | **Yes** |

---

### `ploomes_deals_lose`

Mark a deal as lost. Requires a loss reason.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **Yes** | Deal ID |
| `LossReasonId` | number | **Yes** | Loss reason ID (use `ploomes_deals_loss_reasons_list` to find) |

---

### `ploomes_deals_reopen`

Reopen a previously won or lost deal.

| Parameter | Type | Required |
|---|---|---|
| `id` | number | **Yes** |

---

## Tasks

### `ploomes_tasks_list`

Search and list tasks.

**Parameters:** [Common OData parameters](#common-parameters-odata)

**Available `expand` values:** `Type`, `Contact`, `Deal`, `Owner`, `Users`, `Tags`, `Comments`, `InteractionRecord`, `InteractionRecords`, `Creator`, `OtherProperties`, `Attachments`

**Examples:**

```
# Pending tasks for a deal
ploomes_tasks_list with filter: "DealId eq 789 and Finished eq false"

# My overdue tasks
ploomes_tasks_list with filter: "OwnerId eq 42 and Finished eq false and Date lt 2025-06-15T00:00:00Z"
```

---

### `ploomes_tasks_get`

Get a single task by ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **Yes** | Task ID |
| `expand` | string | No | E.g.: `"Type,Contact,Deal,Owner,OtherProperties"` |
| `select` | string | No | Fields to return |

---

### `ploomes_tasks_create`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `Description` | string | No | Task description |
| `Date` | string | No | Due date (ISO 8601). E.g.: `"2025-06-15T10:00:00Z"` |
| `Hour` | string | No | Time string. E.g.: `"14:30"` |
| `DealId` | number | No | Associated deal ID |
| `ContactId` | number | No | Associated contact ID |
| `OwnerId` | number | No | Owner user ID |
| `TypeId` | number | No | Task type ID (use `ploomes_tasks_types_list` to find) |
| `OtherProperties` | array | No | Custom field values |

---

### `ploomes_tasks_update`

Update a task by ID. Same optional parameters as create, plus required `id`.

---

### `ploomes_tasks_delete`

Delete a task by ID.

---

### `ploomes_tasks_finish`

Mark a task as finished (completed).

| Parameter | Type | Required |
|---|---|---|
| `id` | number | **Yes** |

---

## Pipelines & Stages

### `ploomes_pipelines_list`

List all sales pipelines (funnels).

**Parameters:** `filter`, `select`, `orderby`, `top`, `skip` (no `expand`)

**Example:**

```
# Active pipelines
ploomes_pipelines_list with filter: "Archived eq false"
```

---

### `ploomes_stages_list`

List pipeline stages. Filter by `PipelineId` to get stages for a specific pipeline.

**Parameters:** `filter`, `select`, `orderby`, `top`, `skip`

**Example:**

```
# Stages for pipeline 1, in order
ploomes_stages_list with filter: "PipelineId eq 1", orderby: "Ordination asc"
```

---

## Interactions

### `ploomes_interactions_list`

List interaction records (notes, activities).

**Parameters:** [Common OData parameters](#common-parameters-odata)

**Example:**

```
# Recent interactions for a deal
ploomes_interactions_list with filter: "DealId eq 789", orderby: "Date desc", top: 20
```

---

### `ploomes_interactions_get`

Get a single interaction record by ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **Yes** | Interaction record ID |
| `expand` | string | No | Related entities to include |
| `select` | string | No | Fields to return |

---

### `ploomes_interactions_create`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `Content` | string | **Yes** | Note/activity text |
| `Date` | string | No | Date (ISO 8601). Defaults to now. |
| `DealId` | number | No | Associated deal ID |
| `ContactId` | number | No | Associated contact ID |
| `OwnerId` | number | No | Owner user ID |

**Example:**

```
ploomes_interactions_create with Content: "Called client. They want a demo next week.", DealId: 789
```

---

### `ploomes_interactions_update`

Update an interaction record by ID.

---

### `ploomes_interactions_delete`

Delete an interaction record by ID.

---

## Quotes

### `ploomes_quotes_list`

List quotes (proposals).

**Parameters:** [Common OData parameters](#common-parameters-odata)

---

### `ploomes_quotes_get`

Get a single quote by ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **Yes** | Quote ID |
| `expand` | string | No | Related entities to include |
| `select` | string | No | Fields to return |

---

### `ploomes_quotes_create`

| Parameter | Type | Required |
|---|---|---|
| `Title` | string | No |
| `DealId` | number | No |
| `ContactId` | number | No |
| `OtherProperties` | array | No |

---

### `ploomes_quotes_update`

Update a quote by ID.

---

### `ploomes_quotes_delete`

Delete a quote by ID.

---

## Orders

### `ploomes_orders_list`

List orders.

**Parameters:** [Common OData parameters](#common-parameters-odata)

---

### `ploomes_orders_get`

Get a single order by ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **Yes** | Order ID |
| `expand` | string | No | Related entities to include |
| `select` | string | No | Fields to return |

---

### `ploomes_orders_create`

| Parameter | Type | Required |
|---|---|---|
| `Title` | string | No |
| `DealId` | number | No |
| `ContactId` | number | No |
| `OtherProperties` | array | No |

---

### `ploomes_orders_update`

Update an order by ID.

---

### `ploomes_orders_delete`

Delete an order by ID.

---

## Products

### `ploomes_products_list`

List products in the CRM catalog.

**Parameters:** [Common OData parameters](#common-parameters-odata)

---

### `ploomes_products_get`

Get a single product by ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **Yes** | Product ID |
| `expand` | string | No | Related entities to include |
| `select` | string | No | Fields to return |

---

### `ploomes_products_create`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `Name` | string | **Yes** | Product name |
| `Code` | string | No | Product code / SKU |
| `Description` | string | No | Product description |
| `Price` | number | No | Unit price |
| `OtherProperties` | array | No | Custom field values |

---

### `ploomes_products_update`

Update a product by ID. Same optional parameters as create, plus required `id`.

---

### `ploomes_products_delete`

Delete a product by ID.

---

## Fields

### `ploomes_fields_list`

List custom fields configured in Ploomes. Useful for discovering `FieldKey` values to use with `OtherProperties`.

**Parameters:** [Common OData parameters](#common-parameters-odata)

**Example:**

```
# Contact fields
ploomes_fields_list with filter: "EntityId eq 1"

# Deal fields
ploomes_fields_list with filter: "EntityId eq 2"
```

---

## Users

### `ploomes_users_list`

List users in the Ploomes account. Useful for finding `OwnerId` values.

**Parameters:** `filter`, `select`, `orderby`, `top`, `skip`

**Example:**

```
ploomes_users_list with select: "Id,Name,Email"
```

---

## Account

### `ploomes_account_info`

Get information about the current Ploomes account (company name, settings, plan details).

**Parameters:** None.

---

## Lookup Tools

Lookup tools provide reference data for discovering valid IDs and enum values. They are read-only and accept standard OData parameters (`filter`, `select`, `orderby`, `top`, `skip`).

Use these tools to find the correct IDs before creating or updating records.

### `ploomes_contacts_types_list`

List available contact types (e.g., Person, Company).

```
ploomes_contacts_types_list
→ Returns: Id, Name for each type
```

Use the returned `Id` as `TypeId` when creating/updating contacts.

---

### `ploomes_contacts_status_list`

List available contact statuses (e.g., Active, Inactive).

Use the returned `Id` as `StatusId` when creating/updating contacts.

---

### `ploomes_contacts_origins_list`

List available contact origins (e.g., Website, Referral, Cold Call).

Use the returned `Id` as `OriginId` when creating/updating contacts.

---

### `ploomes_deals_status_list`

List deal statuses (Open, Won, Lost).

---

### `ploomes_deals_loss_reasons_list`

List available loss reasons for marking deals as lost.

Use the returned `Id` as `LossReasonId` when calling `ploomes_deals_lose`.

---

### `ploomes_tasks_types_list`

List available task types (e.g., Call, Meeting, Email, Visit).

Use the returned `Id` as `TypeId` when creating/updating tasks.

---

### `ploomes_currencies_list`

List available currencies configured in the Ploomes account.

Use the returned `Id` as `CurrencyId` when creating/updating deals.

---

### `ploomes_fields_entities_list`

List entities that support custom fields. Returns the mapping of `EntityId` to entity name (e.g., 1 = Contact, 2 = Deal).

Use this to know which `EntityId` to filter by when calling `ploomes_fields_list`.

---

### `ploomes_fields_types_list`

List custom field data types (e.g., String, Integer, DateTime, Boolean, BigString, Options).

---

### `ploomes_fields_options_tables_list`

List dropdown option tables. Each table contains a set of options that can be used in dropdown-type custom fields.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filter` | string | No | OData filter |
| `top` | number | No | Max items (default 50) |
| `skip` | number | No | Items to skip |

---

### `ploomes_fields_options_list`

List options within a specific dropdown table.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tableId` | number | **Yes** | Options table ID (from `ploomes_fields_options_tables_list`) |
| `filter` | string | No | OData filter |
| `top` | number | No | Max items (default 50) |
| `skip` | number | No | Items to skip |

**Example:**

```
# First, find the options table
ploomes_fields_options_tables_list

# Then list its options
ploomes_fields_options_list with tableId: 123
```

---

### `ploomes_orders_stages_list`

List order workflow stages.

Use the returned `Id` as `StageId` when creating/updating orders.

---

[&larr; Back to README](../README.md) | [Testing &rarr;](testing.md)
