import React, { useState } from 'react';
import ROLES_LIST from '../../ROLES_LIST.json';
// console.log(Object.entries(ROLES_LIST));

type Role = {
  id: number;
  name: string;
};

type Props = {
  onSubmit: (data: { email: string; roleIds: number[] }) => void;
};

const UserForm = ({ onSubmit }: Props) => {
  const [email, setEmail] = useState('');
  const [roleIds, setRoleIds] = useState<number[]>([]);

  const availableRoles: Role[] = Object.entries(ROLES_LIST).map(([name, id]) => ({
    id: Number(id),
    name
  }));

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, opt => Number(opt.value));
    setRoleIds(selected);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, roleIds });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email:
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </label>
      <br />

      <label>
        Roles:
        <select
          multiple
          value={roleIds.map(String)}
          onChange={handleRoleChange}
          required
        >
          {availableRoles.map(role => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </label>
      <br />

      <button type="submit">Submit</button>
    </form>
  );
};

export default UserForm;
