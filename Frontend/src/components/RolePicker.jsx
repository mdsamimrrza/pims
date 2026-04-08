import { ROLE_LABELS, ROLES } from '../constants/roles';

const roleOrder = [ROLES.DOCTOR, ROLES.PHARMACIST, ROLES.ADMIN];

export default function RolePicker({ value, onChange }) {
  return (
    <div className="role-picker">
      {roleOrder.map((role) => (
        <button key={role} type="button" className={value === role ? 'active' : ''} onClick={() => onChange(role)}>
          {ROLE_LABELS[role]}
        </button>
      ))}
    </div>
  );
}