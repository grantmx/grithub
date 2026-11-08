"use client";

import { useState } from "react";
import ui from "@/components/ui.module.css";
import {
  type CodeListName,
  type CodeLists,
  DISABILITY_NONE,
  type FieldErrors,
  type ProfileValues,
  learnerOptions,
  provinceHasAreas,
} from "@/lib/qctoProfile";
import { AreaPicker, RadioGroup, SelectField, TextField } from "./fields";
import styles from "./profile.module.css";

/** Labels for the error summary, keyed by field name. */
export const FIELD_LABELS: Record<string, string> = {
  titleCode: "Title",
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Surname",
  idKind: "Identity document",
  nationalId: "ID number",
  alternativeIdTypeCode: "Document type",
  alternateId: "Document number",
  birthDate: "Date of birth",
  genderCode: "Gender",
  "homeAddress.line1": "Home address: street",
  "homeAddress.line2": "Home address: suburb or area",
  "homeAddress.line3": "Home address: town or city",
  "homeAddress.postalCode": "Home address: postal code",
  "postalAddress.line1": "Postal address: line 1",
  "postalAddress.line2": "Postal address: line 2",
  "postalAddress.line3": "Postal address: line 3",
  "postalAddress.postalCode": "Postal address: postal code",
  cellPhone: "Cellphone",
  phone: "Other phone",
  provinceCode: "Province",
  statssaAreaCode: "Area",
  nationalityCode: "Nationality",
  citizenResidentStatusCode: "Citizenship",
  immigrantStatusCode: "Immigration status",
  homeLanguageCode: "Home language",
  equityCode: "Population group",
  socioeconomicStatusCode: "What you do now",
  disabilityStatusCode: "Disability",
  disabilityRatingCode: "Level of difficulty",
};

/** Plain labels for learners (the code tables keep QCTO's wording). */
const LABEL_OVERRIDES: Partial<Record<CodeListName, Record<string, string>>> = {
  equities: { U: "Unknown / prefer not to say" },
};

export function options(lists: CodeLists, name: CodeListName) {
  const over = LABEL_OVERRIDES[name] ?? {};
  return learnerOptions(lists, name).map((o) => ({
    code: o.code,
    label: over[o.code] ?? o.label,
  }));
}

type Props = {
  values: ProfileValues;
  lists: CodeLists;
  errors: FieldErrors;
};

export function AboutFields({ values, lists, errors }: Props) {
  const [idKind, setIdKind] = useState(values.idKind);
  return (
    <div className={styles.group}>
      <RadioGroup
        name="titleCode"
        legend="Title"
        options={options(lists, "titles")}
        defaultValue={values.titleCode}
        error={errors.titleCode}
      />
      <TextField
        name="firstName"
        label="First name"
        hint="Exactly as on your ID or passport."
        defaultValue={values.firstName}
        error={errors.firstName}
        autoComplete="given-name"
        maxLength={50}
      />
      <TextField
        name="middleName"
        label="Middle name(s)"
        optional
        defaultValue={values.middleName}
        error={errors.middleName}
        autoComplete="additional-name"
        maxLength={50}
      />
      <TextField
        name="lastName"
        label="Surname"
        defaultValue={values.lastName}
        error={errors.lastName}
        autoComplete="family-name"
        maxLength={50}
      />
      <RadioGroup
        name="idKind"
        legend="Which identity document do you have?"
        options={[
          { code: "national", label: "South African ID" },
          {
            code: "alternate",
            label: "Passport, refugee number, permit or birth certificate",
          },
        ]}
        value={idKind}
        onChange={(k) => setIdKind(k as ProfileValues["idKind"])}
        error={errors.idKind}
      />
      {idKind === "national" ? (
        <TextField
          name="nationalId"
          label="ID number"
          hint="13 digits."
          defaultValue={values.nationalId}
          error={errors.nationalId}
          inputMode="numeric"
          autoComplete="off"
          maxLength={16}
        />
      ) : null}
      {idKind === "alternate" ? (
        <>
          <RadioGroup
            name="alternativeIdTypeCode"
            legend="Type of document"
            options={options(lists, "alternativeIdTypes")}
            defaultValue={values.alternativeIdTypeCode}
            error={errors.alternativeIdTypeCode}
          />
          <TextField
            name="alternateId"
            label="Document number"
            defaultValue={values.alternateId}
            error={errors.alternateId}
            autoComplete="off"
            maxLength={24}
          />
        </>
      ) : null}
      <TextField
        name="birthDate"
        label="Date of birth"
        type="date"
        defaultValue={values.birthDate}
        error={errors.birthDate}
        autoComplete="bday"
      />
      <RadioGroup
        name="genderCode"
        legend="Gender"
        hint="As on your ID. The QCTO only records these two options."
        options={options(lists, "genders")}
        defaultValue={values.genderCode}
        error={errors.genderCode}
      />
    </div>
  );
}

export function ContactFields({
  values,
  lists,
  errors,
  initialArea,
  email,
}: Props & {
  initialArea: { code: string; label: string } | null;
  email: string;
}) {
  const [same, setSame] = useState(values.postalSameAsHome);
  const [province, setProvince] = useState(values.provinceCode);
  return (
    <div className={styles.group}>
      <h3 className={styles.groupTitle}>Home address</h3>
      <TextField
        name="homeAddress.line1"
        label="Street number and name"
        defaultValue={values.homeAddress.line1}
        error={errors["homeAddress.line1"]}
        autoComplete="address-line1"
        maxLength={50}
      />
      <TextField
        name="homeAddress.line2"
        label="Suburb or area"
        defaultValue={values.homeAddress.line2}
        error={errors["homeAddress.line2"]}
        autoComplete="address-line2"
        maxLength={50}
      />
      <TextField
        name="homeAddress.line3"
        label="Town or city"
        optional
        defaultValue={values.homeAddress.line3}
        error={errors["homeAddress.line3"]}
        autoComplete="address-level2"
        maxLength={50}
      />
      <TextField
        name="homeAddress.postalCode"
        label="Postal code"
        defaultValue={values.homeAddress.postalCode}
        error={errors["homeAddress.postalCode"]}
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={4}
        style={{ maxWidth: "8rem" }}
      />
      <label className={ui.checkbox}>
        <input
          type="checkbox"
          name="postalSameAsHome"
          value="yes"
          checked={same}
          onChange={(e) => setSame(e.target.checked)}
        />
        <span>My postal address is the same as my home address</span>
      </label>
      {same ? null : (
        <>
          <h3 className={styles.groupTitle}>Postal address</h3>
          <TextField
            name="postalAddress.line1"
            label="Line 1 (e.g. PO Box or street)"
            defaultValue={values.postalAddress.line1}
            error={errors["postalAddress.line1"]}
            maxLength={50}
          />
          <TextField
            name="postalAddress.line2"
            label="Line 2 (suburb or area)"
            defaultValue={values.postalAddress.line2}
            error={errors["postalAddress.line2"]}
            maxLength={50}
          />
          <TextField
            name="postalAddress.line3"
            label="Line 3 (town or city)"
            optional
            defaultValue={values.postalAddress.line3}
            error={errors["postalAddress.line3"]}
            maxLength={50}
          />
          <TextField
            name="postalAddress.postalCode"
            label="Postal code"
            defaultValue={values.postalAddress.postalCode}
            error={errors["postalAddress.postalCode"]}
            inputMode="numeric"
            maxLength={4}
            style={{ maxWidth: "8rem" }}
          />
        </>
      )}

      <h3 className={styles.groupTitle}>Where you live</h3>
      <SelectField
        name="provinceCode"
        label="Province"
        options={options(lists, "provinces")}
        value={province}
        onChange={setProvince}
        error={errors.provinceCode}
      />
      {provinceHasAreas(province) ? (
        <AreaPicker
          name="statssaAreaCode"
          province={province}
          initial={province === values.provinceCode ? initialArea : null}
          error={errors.statssaAreaCode}
        />
      ) : null}

      <h3 className={styles.groupTitle}>Phone and email</h3>
      <TextField
        name="cellPhone"
        label="Cellphone number"
        optional
        type="tel"
        defaultValue={values.cellPhone}
        error={errors.cellPhone}
        autoComplete="tel-national"
        maxLength={14}
      />
      <TextField
        name="phone"
        label="Other phone number"
        optional
        type="tel"
        defaultValue={values.phone}
        error={errors.phone}
        maxLength={14}
      />
      <label className={ui.checkbox}>
        <input
          type="checkbox"
          name="shareEmailWithQcto"
          value="yes"
          defaultChecked={values.shareEmailWithQcto}
        />
        <span>
          Include my email address ({email}) in my details for the QCTO
        </span>
      </label>
    </div>
  );
}

export function BackgroundFields({ values, lists, errors }: Props) {
  const [disability, setDisability] = useState(values.disabilityStatusCode);
  return (
    <div className={styles.group}>
      <SelectField
        name="nationalityCode"
        label="Nationality"
        options={options(lists, "nationalities")}
        defaultValue={values.nationalityCode}
        error={errors.nationalityCode}
      />
      <RadioGroup
        name="citizenResidentStatusCode"
        legend="Citizenship"
        options={options(lists, "citizenResidentStatuses")}
        defaultValue={values.citizenResidentStatusCode}
        error={errors.citizenResidentStatusCode}
      />
      <RadioGroup
        name="immigrantStatusCode"
        legend="Are you a South African citizen, an immigrant or a refugee?"
        options={options(lists, "immigrantStatuses")}
        defaultValue={values.immigrantStatusCode}
        error={errors.immigrantStatusCode}
      />
      <SelectField
        name="homeLanguageCode"
        label="Home language"
        options={options(lists, "homeLanguages")}
        defaultValue={values.homeLanguageCode}
        error={errors.homeLanguageCode}
      />
      <SelectField
        name="socioeconomicStatusCode"
        label="What do you do now?"
        options={options(lists, "socioeconomicStatuses")}
        defaultValue={values.socioeconomicStatusCode}
        error={errors.socioeconomicStatusCode}
      />
      <RadioGroup
        name="equityCode"
        legend="Population group"
        hint="The QCTO asks for this for national reporting. It doesn't affect your training or results."
        options={options(lists, "equities")}
        defaultValue={values.equityCode}
        error={errors.equityCode}
      />
      <SelectField
        name="disabilityStatusCode"
        label="Do you have a disability?"
        hint="The QCTO asks for this for national reporting. It doesn't affect your training or results. Tell your facilitator separately if you need support."
        options={options(lists, "disabilityStatuses")}
        value={disability}
        onChange={setDisability}
        error={errors.disabilityStatusCode}
      />
      {disability && disability !== DISABILITY_NONE ? (
        <SelectField
          name="disabilityRatingCode"
          label="How much difficulty does it cause you?"
          options={options(lists, "disabilityRatings")}
          defaultValue={values.disabilityRatingCode}
          error={errors.disabilityRatingCode}
        />
      ) : null}
    </div>
  );
}
