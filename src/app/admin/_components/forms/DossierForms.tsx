import type { VersionOption } from "../../_data/loadAdminData";
import styles from "../../page.module.css";
import { AbilityForm } from "./AbilityForm";
import { CapabilityForm } from "./CapabilityForm";
import { ConditionForm } from "./ConditionForm";
import { EquipmentForm } from "./EquipmentForm";
import { SubjectVersionForm } from "./SubjectVersionForm";
import { WeaknessForm } from "./WeaknessForm";

export function DossierForms({ versions }: { versions: VersionOption[] }) {
  return (
    <div className={styles.formColumns}>
      <SubjectVersionForm />
      <CapabilityForm versions={versions} />
      <AbilityForm versions={versions} />
      <WeaknessForm versions={versions} />
      <ConditionForm versions={versions} />
      <EquipmentForm versions={versions} />
    </div>
  );
}
