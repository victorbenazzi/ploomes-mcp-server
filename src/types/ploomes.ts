/**
 * TypeScript interfaces for Ploomes CRM entities.
 */

export interface OtherProperty {
  FieldKey: string;
  StringValue?: string;
  IntegerValue?: number;
  DateTimeValue?: string;
  BoolValue?: boolean;
  BigStringValue?: string;
  ObjectValueName?: string;
  FieldId?: number;
}

export interface Contact {
  Id: number;
  TypeId?: number;
  Name: string;
  LegalName?: string;
  Register?: string;
  Email?: string;
  StatusId?: number;
  CompanyId?: number;
  OwnerId?: number;
  OriginId?: number;
  Phone?: string;
  StreetAddress?: string;
  ZipCode?: string;
  CityId?: number;
  Note?: string;
  Website?: string;
  Revenue?: number;
  OtherProperties?: OtherProperty[];
}

export interface Deal {
  Id: number;
  Title: string;
  ContactId?: number;
  PersonId?: number;
  StageId?: number;
  OwnerId?: number;
  Amount?: number;
  CurrencyId?: number;
  DealNumber?: number;
  LossReasonId?: number;
  OriginId?: number;
  OtherProperties?: OtherProperty[];
}

export interface Task {
  Id: number;
  Description?: string;
  Date?: string;
  Hour?: string;
  DealId?: number;
  ContactId?: number;
  OwnerId?: number;
  TypeId?: number;
  Finished?: boolean;
  OtherProperties?: OtherProperty[];
}

export interface Pipeline {
  Id: number;
  Name: string;
  Ordination?: number;
  Archived?: boolean;
}

export interface Stage {
  Id: number;
  Name: string;
  PipelineId: number;
  Ordination?: number;
}

export interface InteractionRecord {
  Id: number;
  Content?: string;
  Date?: string;
  DealId?: number;
  ContactId?: number;
  OwnerId?: number;
}

export interface Quote {
  Id: number;
  Title?: string;
  DealId?: number;
  ContactId?: number;
  OtherProperties?: OtherProperty[];
}

export interface Order {
  Id: number;
  Title?: string;
  DealId?: number;
  ContactId?: number;
  OtherProperties?: OtherProperty[];
}

export interface Product {
  Id: number;
  Name?: string;
  Code?: string;
  Description?: string;
  Price?: number;
  OtherProperties?: OtherProperty[];
}

export interface Field {
  Key: string;
  Name?: string;
  EntityId?: number;
  TypeId?: number;
}

export interface User {
  Id: number;
  Name?: string;
  Email?: string;
  AvatarUrl?: string;
}

export interface Account {
  Id: number;
  Name?: string;
}
