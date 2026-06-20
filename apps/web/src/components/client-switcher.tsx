'use client';

import { useClient } from '@/providers/client-provider';

export function ClientSwitcher() {
  const { clients, activeClientId, setActiveClientId, setCreateModalOpen } = useClient();

  if (clients.length === 0) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'CREATE_NEW') {
      setCreateModalOpen(true);
    } else {
      setActiveClientId(e.target.value);
    }
  };

  return (
    <select
      value={activeClientId || ''}
      onChange={handleChange}
      className="flex h-9 w-[200px] items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="" disabled>Select a project</option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
      <option value="CREATE_NEW">➕ Create New Project</option>
    </select>
  );
}
