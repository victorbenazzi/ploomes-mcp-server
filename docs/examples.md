# Examples & Recipes

[&larr; Back to README](../README.md)

Real-world CRM workflows using the Ploomes MCP Server tools. These are the patterns AI agents will use most frequently.

---

## Table of Contents

- [Recipe 1: Qualify a New Lead](#recipe-1-qualify-a-new-lead)
- [Recipe 2: Move a Deal Through the Pipeline](#recipe-2-move-a-deal-through-the-pipeline)
- [Recipe 3: Daily Sales Report](#recipe-3-daily-sales-report)
- [Recipe 4: Find and Update Stale Deals](#recipe-4-find-and-update-stale-deals)
- [Recipe 5: Register a Meeting and Follow-Up](#recipe-5-register-a-meeting-and-follow-up)
- [Recipe 6: Full Pipeline Mapping](#recipe-6-full-pipeline-mapping)
- [Recipe 7: Batch Contact Search with Custom Fields](#recipe-7-batch-contact-search-with-custom-fields)
- [Recipe 8: Close a Deal (Win or Lose)](#recipe-8-close-a-deal-win-or-lose)
- [Natural Language Prompt Examples](#natural-language-prompt-examples)

---

## Recipe 1: Qualify a New Lead

**Scenario:** A new lead arrives and you need to create a contact and deal in the CRM.

### Step 1 — Find the pipeline and first stage

```
Tool: ploomes_pipelines_list
→ Returns pipelines. Note the pipeline ID (e.g., 1).

Tool: ploomes_stages_list
  filter: "PipelineId eq 1"
  orderby: "Ordination asc"
→ Returns stages in order. Note the first stage ID (e.g., 10).
```

### Step 2 — Find the owner (sales rep)

```
Tool: ploomes_users_list
  select: "Id,Name,Email"
→ Returns users. Note the rep's ID (e.g., 42).
```

### Step 3 — Create the contact

```
Tool: ploomes_contacts_create
  Name: "Nova Tech Ltda"
  Email: "contato@novatech.com.br"
  Phone: "+55 11 99999-1234"
  OwnerId: 42
  OtherProperties: [
    {"FieldKey": "industry", "ObjectValueName": "Technology"},
    {"FieldKey": "employee_count", "IntegerValue": 50}
  ]
→ Returns contact with Id (e.g., 5001).
```

### Step 4 — Create the deal

```
Tool: ploomes_deals_create
  Title: "Nova Tech - SaaS Annual Plan"
  ContactId: 5001
  StageId: 10
  OwnerId: 42
  Amount: 36000
→ Returns deal with Id (e.g., 8001).
```

### Step 5 — Add an interaction note

```
Tool: ploomes_interactions_create
  Content: "Lead originated from the website form. Company has 50 employees and is looking for a SaaS solution. Decision timeline: 30 days."
  DealId: 8001
  ContactId: 5001
```

---

## Recipe 2: Move a Deal Through the Pipeline

**Scenario:** After a successful demo, move a deal to the next stage.

### Step 1 — Get current deal with stage info

```
Tool: ploomes_deals_get
  id: 8001
  expand: "Stage"
→ Shows current stage (e.g., StageId: 10, Stage.Name: "Qualification").
```

### Step 2 — Find the next stage

```
Tool: ploomes_stages_list
  filter: "PipelineId eq 1"
  orderby: "Ordination asc"
→ Returns all stages. Find the one after "Qualification" (e.g., Id: 11, Name: "Demo Done").
```

### Step 3 — Update the deal

```
Tool: ploomes_deals_update
  id: 8001
  StageId: 11
→ "Deal 8001 updated successfully."
```

### Step 4 — Log the interaction

```
Tool: ploomes_interactions_create
  Content: "Demo completed successfully. Client impressed with the reporting features. Next step: send proposal."
  DealId: 8001
```

---

## Recipe 3: Daily Sales Report

**Scenario:** Generate a summary of today's open deals.

### Step 1 — Get open deals with high values

```
Tool: ploomes_deals_list
  filter: "StatusId eq 1"
  select: "Id,Title,Amount,ContactId"
  expand: "Contact,Stage"
  orderby: "Amount desc"
  top: 20
→ Returns top 20 open deals by value with contact and stage info.
```

### Step 2 — Get today's tasks

```
Tool: ploomes_tasks_list
  filter: "Finished eq false and Date le 2025-06-15T23:59:59Z"
  expand: "Deal,Contact,Owner"
  orderby: "Date asc"
→ Returns pending tasks due today or overdue.
```

### Step 3 — Get recent interactions

```
Tool: ploomes_interactions_list
  filter: "Date ge 2025-06-15T00:00:00Z"
  expand: "Deal,Contact"
  orderby: "Date desc"
  top: 10
→ Returns today's interaction records.
```

---

## Recipe 4: Find and Update Stale Deals

**Scenario:** Find deals that haven't moved in 30 days and flag them.

### Step 1 — Find stale deals

```
Tool: ploomes_deals_list
  filter: "StatusId eq 1 and LastStageUpdate lt 2025-05-15T00:00:00Z"
  select: "Id,Title,Amount,ContactId,StageId"
  expand: "Contact,Stage"
  orderby: "LastStageUpdate asc"
  top: 50
```

### Step 2 — Create follow-up tasks for each

```
Tool: ploomes_tasks_create
  Description: "Follow up on stale deal — no activity in 30+ days"
  DealId: <deal_id>
  OwnerId: <deal_owner_id>
  Date: "2025-06-16T10:00:00Z"
```

### Step 3 — Add a note

```
Tool: ploomes_interactions_create
  Content: "Automated flag: this deal has been in the same stage for 30+ days. Follow-up task created."
  DealId: <deal_id>
```

---

## Recipe 5: Register a Meeting and Follow-Up

**Scenario:** After a client meeting, log the interaction and schedule the next step.

### Step 1 — Log the meeting

```
Tool: ploomes_interactions_create
  Content: "Meeting with João (CTO). Discussed pricing for 100 seats. He needs board approval. Follow-up scheduled for next week."
  DealId: 8001
  ContactId: 5001
```

### Step 2 — Create follow-up task

```
Tool: ploomes_tasks_create
  Description: "Call João to check on board approval for the 100-seat deal"
  DealId: 8001
  ContactId: 5001
  Date: "2025-06-20T14:00:00Z"
  Hour: "14:00"
  OwnerId: 42
```

### Step 3 — Update deal amount if revised

```
Tool: ploomes_deals_update
  id: 8001
  Amount: 120000
  OtherProperties: [
    {"FieldKey": "seats_requested", "IntegerValue": 100}
  ]
```

---

## Recipe 6: Full Pipeline Mapping

**Scenario:** Get a complete picture of all pipelines and their stages.

### Step 1 — List all pipelines

```
Tool: ploomes_pipelines_list
  filter: "Archived eq false"
  orderby: "Ordination asc"
→ Returns:
  - Id: 1, Name: "Sales Pipeline"
  - Id: 2, Name: "Renewal Pipeline"
```

### Step 2 — Get stages for each pipeline

```
Tool: ploomes_stages_list
  filter: "PipelineId eq 1"
  orderby: "Ordination asc"
→ Returns:
  - Id: 10, Name: "Qualification", Ordination: 1
  - Id: 11, Name: "Demo", Ordination: 2
  - Id: 12, Name: "Proposal", Ordination: 3
  - Id: 13, Name: "Negotiation", Ordination: 4
  - Id: 14, Name: "Closing", Ordination: 5

Tool: ploomes_stages_list
  filter: "PipelineId eq 2"
  orderby: "Ordination asc"
→ Returns stages for the renewal pipeline.
```

### Step 3 — Count deals per stage

```
Tool: ploomes_deals_list
  filter: "StageId eq 10 and StatusId eq 1"
  select: "Id"
  top: 1
→ Check item count to see how many deals are in "Qualification".

(Repeat for each stage.)
```

---

## Recipe 7: Batch Contact Search with Custom Fields

**Scenario:** Find all enterprise clients in the technology sector.

### Step 1 — Discover available custom fields

```
Tool: ploomes_fields_list
  filter: "EntityId eq 1"
  select: "Key,Name,TypeId"
→ Returns fields like:
  - Key: "customer_segment", Name: "Customer Segment"
  - Key: "industry", Name: "Industry"
```

### Step 2 — Filter by custom field

```
Tool: ploomes_contacts_list
  filter: "OtherProperties/any(o: o/FieldKey eq 'customer_segment' and o/StringValue eq 'Enterprise')"
  expand: "OtherProperties"
  select: "Id,Name,Email,Phone"
  top: 100
```

### Step 3 — Further filter in a second call if needed

```
Tool: ploomes_contacts_list
  filter: "OtherProperties/any(o: o/FieldKey eq 'industry' and o/ObjectValueName eq 'Technology') and OtherProperties/any(o: o/FieldKey eq 'customer_segment' and o/StringValue eq 'Enterprise')"
  expand: "OtherProperties"
  top: 100
```

---

## Recipe 8: Close a Deal (Win or Lose)

### Winning a Deal

```
Tool: ploomes_deals_win
  id: 8001
→ "Deal 8001 marked as won successfully."

Tool: ploomes_interactions_create
  Content: "Deal closed! Contract signed for R$ 120,000/year, 100 seats."
  DealId: 8001
```

### Losing a Deal

First, you need a loss reason ID:

```
Tool: ploomes_deals_lose
  id: 8002
  LossReasonId: 3
→ "Deal 8002 marked as lost successfully."

Tool: ploomes_interactions_create
  Content: "Lost to competitor. Client chose a cheaper alternative."
  DealId: 8002
```

### Reopening a Closed Deal

```
Tool: ploomes_deals_reopen
  id: 8002
→ "Deal 8002 reopened successfully."
```

---

## Natural Language Prompt Examples

These are examples of what users can say to an AI agent connected to this MCP server:

### Contacts

> "Find all contacts with email addresses"
>
> "Create a contact for Acme Corp, email acme@example.com, phone +55 11 99999"
>
> "Show me contact 123 with all their custom fields"
>
> "Update contact 456's email to new@example.com"

### Deals

> "List all open deals worth more than R$ 50,000"
>
> "Create a deal 'Acme Enterprise' for contact 123 worth R$ 100,000 in the first stage of pipeline 1"
>
> "Move deal 789 to the Negotiation stage"
>
> "Mark deal 789 as won"
>
> "Show me all deals in the Proposal stage"

### Tasks

> "What tasks are overdue?"
>
> "Create a follow-up task for deal 789: call the client tomorrow at 2pm"
>
> "Mark task 456 as done"

### Pipeline Analysis

> "Show me all pipelines and their stages"
>
> "How many deals are in each stage of pipeline 1?"

### Interactions

> "Log a note on deal 789: client wants a revised proposal by Friday"
>
> "Show me the last 10 interactions for contact 123"

### Discovery

> "What custom fields are available for contacts?"
>
> "List all users in the account"
>
> "Show me account information"

---

[&larr; Back to README](../README.md)
