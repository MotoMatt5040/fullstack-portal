import React, { useEffect, useState } from 'react';
import ROLES_LIST from '../../ROLES_LIST.json';
import MyToggle from '../../components/MyToggle';
import {
  useAddUserMutation,
  useGetClientsQuery,
  // useLazyGetPartnersQuery,
} from '../../features/usersApiSlice';
import './AddUser.css';
import Select from 'react-select';

type Role = {
  id: number;
  name: string;
};

type Props = {
  onSubmit: (data: {
    email: string;
    password: string;
    roles: number[];

    external?: boolean;
    // partner?: boolean;
    // partnerId?: number | null;
    // director?: boolean;
    clientId?: number | null;
  }) => void;
};

const UserForm = ({ onSubmit }: Props) => {
  const { data: clients, isFetching: fetchingClients } = useGetClientsQuery();
  // const [getPartners, { data: partners, isFetching: fetchingPartners }] =
  // 	useLazyGetPartnersQuery();
  const [addUser, { isLoading: addUserIsLoading, error: addUserError }] =
    useAddUserMutation();

  const [clientOptions, setClientOptions] = useState([]);
  // const [partnerOptions, setPartnerOptions] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  // const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [exclusiveRole, setExclusiveRole] = useState<string | null>(null); //used for partner/director
  const availableRoles: Role[] = Object.entries(ROLES_LIST).map(
    ([name, id]) => ({
      id: Number(id),
      name,
    })
  );
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(
    Object.fromEntries(availableRoles.map((role) => [role.name, false]))
  );

  const EXCLUSIVE_ROLES = ['Admin', 'External'];

  useEffect(() => {
    if (fetchingClients) return;
    const options = clients.map((client) => ({
      value: client.clientId,
      label: client.clientName,
    }));
    setClientOptions(options);
  }, [clients]);

  // useEffect(() => {
  // 	if (exclusiveRole !== 'Director') return;
  // 	fetchPartners(selectedClientId);
  // }, [exclusiveRole, selectedClientId]);

  // useEffect(() => {
  //   if (fetchingPartners) return;
  //   if (!partners) return;

  //   const mapped = partners.map((p) => ({
  //     label: p.email,
  //     value: p.partnerid,
  //   }));
  //   setPartnerOptions(mapped);
  // }, [partners])

  // const fetchPartners = async (clientId: number) => {
  // 	try {
  // 		const response = await getPartners(clientId).unwrap();
  // 	} catch (error) {
  // 		console.error('Error fetching partners:', error);
  // 	}
  // };

  const handleToggleClick = (roleName: string) => {
    setToggleStates((prev) => {
      const newState = { ...prev };
      const isExclusive = EXCLUSIVE_ROLES.includes(roleName);

      if (isExclusive) {
        Object.keys(newState).forEach((key) => {
          newState[key] = false;
        });
        newState[roleName] = !prev[roleName];
      } else {
        EXCLUSIVE_ROLES.forEach((role) => {
          newState[role] = false;
        });
        newState[roleName] = !prev[roleName];
      }

      return newState;
    });
  };

  // const handleExclusiveToggle = (role: string) => {
  // 	setExclusiveRole((prev) => (prev === role ? null : role));
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Collect roles from toggle states
    const roleIds = availableRoles
      .filter((role) => toggleStates[role.name])
      .map((role) => role.id);

    // Collect data to submit
    const data = {
      email,
      password,
      external: toggleStates['External'],
      roles: roleIds,
      // partner: exclusiveRole === 'Partner',
      // partnerId: exclusiveRole === 'Director' ? selectedPartnerId : null,
      // director: exclusiveRole === 'Director',
      clientId: selectedClientId,
    };

    // Pass data to onSubmit
    try {
      await addUser(data).unwrap(); // Send data using the mutation
      // Handle success (e.g., redirect, show success message)
    } catch (err) {
      console.error('Error adding user:', err); // Handle error
    }
  };
  return (
    <form className='add-user-form' onSubmit={handleSubmit}>
      <label className='add-user-label'>
        Email:
        <input
          className='add-user-input'
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <br />

      <label className='add-user-label'>
        Roles:
        <div className='role-toggle-group'>
          {availableRoles.map((role) => (
            <MyToggle
              key={role.id}
              label={role.name}
              active={toggleStates[role.name]}
              onClick={() => handleToggleClick(role.name)}
            />
          ))}
        </div>
      </label>

      {toggleStates['External'] && (
        <div>
          <br />
          Client:
          <Select
            className='client-select'
            options={clientOptions}
            value={
              clientOptions.find((opt) => opt.value === selectedClientId) ||
              null
            }
            onChange={(selected: any) => {
              setSelectedClientId(selected.value);
            }}
            isDisabled={false}
            placeholder='Select...'
            isClearable
            closeMenuOnSelect={true}
          />
        </div>
      )}

      {/* {selectedClientId && (
				<div>
					<br />
					<MyToggle
						label='Partner'
						active={exclusiveRole === 'Partner'}
						onClick={() => handleExclusiveToggle('Partner')}
					/>

					<MyToggle
						label='Director'
						active={exclusiveRole === 'Director'}
						onClick={() => handleExclusiveToggle('Director')}
					/>
				</div>
			)} */}

      {/* {exclusiveRole === 'Director' && (
				<div>
					<br />
           Partner
      <Select
        className='partner-select'
        options={partnerOptions}
        value={partnerOptions.find((opt) => opt.value === selectedPartnerId) || null}
        onChange={(selected: any) => {
          setSelectedPartnerId(selected?.value || null);
        }}
        isDisabled={false}
        placeholder='Select...'
        isClearable
        closeMenuOnSelect={true}
      />
				</div>
			)} */}
      <br />
      <label className='add-user-label'>
        Password:
        <input
          className='add-user-input'
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      <button className='add-user-submit' type='submit'>
        Submit
      </button>
    </form>
  );
};

export default UserForm;
